export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export interface ValidationSuccess {
  valid: true;
  width: number;
  height: number;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Checks if a file has an accepted MIME type or file extension
 */
export function isFormatSupported(file: File): boolean {
  if (file.type && SUPPORTED_MIME_TYPES.includes(file.type as any)) {
    return true;
  }

  const name = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Validates file MIME type, size, and decodability.
 * Obtains real pixel dimensions using native browser image decoding.
 */
export async function validateAndDecodeImage(file: File): Promise<ValidationResult> {
  // 1. Check file presence
  if (!file) {
    return {
      valid: false,
      error: 'No file was provided for inspection.',
    };
  }

  // 2. Check format
  if (!isFormatSupported(file)) {
    const detectedType = file.type || file.name.split('.').pop() || 'unknown';
    return {
      valid: false,
      error: `Unsupported format (${detectedType}). ClearFrame Phase 1 supports JPEG, PNG, and WebP images only.`,
    };
  }

  // 3. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the 50 MB safety limit (${sizeInMb} MB). Please select an image under 50 MB to prevent browser memory exhaustion.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please select a valid image.',
    };
  }

  // 4. Validate image decodability and extract real dimensions
  let tempObjectUrl: string | null = null;
  try {
    // Prefer createImageBitmap if available for off-thread decode
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close();

        if (width <= 0 || height <= 0) {
          return {
            valid: false,
            error: 'Image has invalid pixel dimensions (0×0).',
          };
        }

        return { valid: true, width, height };
      } catch {
        // Fallback to HTMLImageElement if createImageBitmap fails on certain formats
      }
    }

    tempObjectUrl = URL.createObjectURL(file);
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          } else {
            reject(new Error('Invalid image dimensions'));
          }
        };
        img.onerror = () => {
          reject(new Error('Image decode failure'));
        };
        img.src = tempObjectUrl!;
      }
    );

    return {
      valid: true,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch {
    return {
      valid: false,
      error:
        'Unable to decode image. The file may be corrupted, truncated, or contain an unsupported compression profile.',
    };
  } finally {
    if (tempObjectUrl) {
      URL.revokeObjectURL(tempObjectUrl);
    }
  }
}
