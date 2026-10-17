import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export interface FFmpegProgress {
  progress: number; // 0 to 1
  time: number; // microseconds
}

/**
 * Initializes and returns the local FFmpeg WebAssembly instance
 */
export async function getFFmpeg(
  onProgress?: (p: FFmpegProgress) => void,
  onLog?: (msg: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const ffmpeg = new FFmpeg();

      if (onLog) {
        ffmpeg.on('log', ({ message }) => onLog(message));
      }

      if (onProgress) {
        ffmpeg.on('progress', (p) => onProgress(p));
      }

      // Load local core assets from /public/ffmpeg/
      const baseURL = '/ffmpeg';
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return loadPromise;
}

/**
 * Checks if FFmpeg is loaded and ready
 */
export function isFFmpegLoaded(): boolean {
  return ffmpegInstance !== null && ffmpegInstance.loaded;
}

/**
 * Terminate FFmpeg worker if running (used on job cancellation)
 */
export function terminateFFmpeg(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {
      // Ignore termination error
    }
    ffmpegInstance = null;
    loadPromise = null;
  }
}
