/**
 * Human-readable byte formatting
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0 || isNaN(bytes)) return '—';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculates simplified aspect ratio (e.g. 16:9, 4:3, 1:1) or decimal
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) return '—';

  // Find greatest common divisor
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  const divisor = gcd(Math.round(width), Math.round(height));
  const wRatio = Math.round(width) / divisor;
  const hRatio = Math.round(height) / divisor;

  // Check common photographic/display ratios
  const ratio = width / height;
  const commonRatios: { [key: string]: number } = {
    '1:1': 1,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
    '3:2': 3 / 2,
    '2:3': 2 / 3,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '16:10': 16 / 10,
    '5:4': 5 / 4,
    '4:5': 4 / 5,
    '21:9': 21 / 9,
  };

  for (const [label, val] of Object.entries(commonRatios)) {
    if (Math.abs(ratio - val) < 0.015) {
      return label;
    }
  }

  // If simplified ratio has reasonable integers
  if (wRatio < 50 && hRatio < 50) {
    return `${wRatio}:${hRatio}`;
  }

  return `${ratio.toFixed(2)}:1`;
}

/**
 * Calculates megapixels (e.g. 24.1 MP)
 */
export function calculateMegapixels(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) return '—';
  const mp = (width * height) / 1_000_000;
  return `${mp.toFixed(1)} MP`;
}

/**
 * Formats shutter speed / exposure time (e.g. 1/250s or 2s)
 */
export function formatShutterSpeed(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num <= 0) return String(val);

  if (num < 1) {
    const reciprocal = Math.round(1 / num);
    return `1/${reciprocal}s`;
  }
  return `${num.toFixed(1).replace(/\.0$/, '')}s`;
}

/**
 * Formats aperture / F-Number (e.g. ƒ/2.8)
 */
export function formatAperture(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num <= 0) return String(val);

  return `ƒ/${num.toFixed(1).replace(/\.0$/, '')}`;
}

/**
 * Formats focal length (e.g. 50 mm)
 */
export function formatFocalLength(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num <= 0) return String(val);

  return `${Math.round(num)} mm`;
}

/**
 * Formats EXIF date or ISO string safely
 */
export function formatDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(val);
  }

  if (typeof val === 'string') {
    // Standard EXIF format is "YYYY:MM:DD HH:MM:SS"
    const exifMatch = val.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (exifMatch) {
      const [, y, m, d, hh, mm, ss] = exifMatch;
      const parsed = new Date(
        parseInt(y, 10),
        parseInt(m, 10) - 1,
        parseInt(d, 10),
        parseInt(hh, 10),
        parseInt(mm, 10),
        parseInt(ss, 10)
      );
      if (!isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(parsed);
      }
    }

    const standardDate = new Date(val);
    if (!isNaN(standardDate.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(standardDate);
    }

    return val;
  }

  return null;
}

/**
 * Cleanly formats MIME type into a display label (e.g. 'image/png' -> 'PNG')
 */
export function formatMimeType(mime: string, filename: string): string {
  const normalized = mime.toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'JPEG';
  if (normalized.includes('png')) return 'PNG';
  if (normalized.includes('webp')) return 'WebP';

  const ext = filename.split('.').pop()?.toUpperCase();
  return ext || mime;
}
