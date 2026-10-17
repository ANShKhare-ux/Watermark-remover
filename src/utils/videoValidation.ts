export const MAX_VIDEO_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_VIDEO_DURATION_SECONDS = 5.0; // Phase 3 MVP 5-second limit
export const MAX_VIDEO_WIDTH = 1280; // 720p width
export const MAX_VIDEO_HEIGHT = 720; // 720p height
export const MAX_TOTAL_PIXELS = 1280 * 720; // 921,600 pixels

export const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
] as const;

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;

export interface VideoValidationSuccess {
  valid: true;
  width: number;
  height: number;
  duration: number;
  hasAudio: boolean;
  frameRate: number;
}

export interface VideoValidationFailure {
  valid: false;
  error: string;
}

export type VideoValidationResult = VideoValidationSuccess | VideoValidationFailure;

/**
 * Checks if a file is a supported video format based on MIME or extension
 */
export function isVideoFormatSupported(file: File): boolean {
  if (file.type && SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as any)) {
    return true;
  }

  const name = file.name.toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Validates video file size, duration, container, codec support, and dimensions.
 */
export async function validateAndDecodeVideo(file: File): Promise<VideoValidationResult> {
  // 1. Check file existence
  if (!file) {
    return {
      valid: false,
      error: 'No video file was provided.',
    };
  }

  // 2. Validate container format
  if (!isVideoFormatSupported(file)) {
    const ext = file.name.split('.').pop() || 'unknown';
    return {
      valid: false,
      error: `Unsupported video format (${ext}). ClearFrame Phase 3 MVP supports MP4 (H.264/AAC) and WebM (VP8/VP9/Vorbis) video files only.`,
    };
  }

  // 3. File size check
  if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video file size exceeds the 50 MB safety ceiling (${sizeInMb} MB). Please select a smaller clip.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected video file is empty (0 bytes).',
    };
  }

  // 4. Codec support check via canPlayType
  const video = document.createElement('video');
  const mimeCheck = video.canPlayType(file.type || 'video/mp4');
  if (file.type && mimeCheck === '') {
    return {
      valid: false,
      error: `Your browser does not have native decoder support for codec ${file.type}. Please use standard H.264 MP4 or WebM.`,
    };
  }

  // 5. Decode duration, resolution, and audio presence via temporary video element
  let tempUrl: string | null = null;
  try {
    tempUrl = URL.createObjectURL(file);
    video.src = tempUrl;
    video.muted = true;
    video.preload = 'metadata';

    const metadata = await new Promise<{
      width: number;
      height: number;
      duration: number;
      hasAudio: boolean;
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video metadata loading timed out. The file may have an unsupported codec or broken header.'));
      }, 8000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;

        // Check audio track heuristics
        const hasAudio = Boolean(
          (video as any).mozHasAudio ||
            Boolean((video as any).webkitAudioDecodedByteCount) ||
            Boolean((video as any).audioTracks?.length)
        );

        resolve({ width, height, duration, hasAudio });
      };

      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to decode video container. The stream may be corrupted or use an unsupported codec profile.'));
      };
    });

    const { width, height, duration, hasAudio } = metadata;

    // Validate dimensions
    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
      return {
        valid: false,
        error: 'Video has invalid resolution dimensions (0×0).',
      };
    }

    // Enforce 720p limit
    if (width * height > MAX_TOTAL_PIXELS) {
      return {
        valid: false,
        error: `Video resolution (${width} × ${height} px) exceeds the Phase 3 MVP limit of 720p (1280 × 720 max). Please downscale your clip to 720p or lower for responsive client-side inpainting.`,
      };
    }

    // Validate duration
    if (!isFinite(duration) || duration <= 0) {
      return {
        valid: false,
        error: 'Unable to determine video duration. Live streams or truncated files are not supported.',
      };
    }

    // Enforce 5.0 seconds limit
    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      return {
        valid: false,
        error: `Video duration (${duration.toFixed(1)}s) exceeds the Phase 3 MVP limit of 5.0 seconds. Please trim your video to under 5.0 seconds.`,
      };
    }

    return {
      valid: true,
      width,
      height,
      duration,
      hasAudio,
      frameRate: 30, // Standard video target rate
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Failed to decode video. Unsupported container or codec.',
    };
  } finally {
    if (tempUrl) {
      URL.revokeObjectURL(tempUrl);
    }
  }
}
