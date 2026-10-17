import { fetchFile } from '@ffmpeg/util';
import type { VideoFileState, VideoProcessingProgress, ProcessedVideoState } from '../types/index.ts';
import { getFFmpeg, terminateFFmpeg } from './ffmpegService.ts';
import { getOpenCv, executeInpainting } from './opencvService.ts';

export interface VideoProcessingOptions {
  radius?: number;
  fps?: number;
  onProgress?: (progress: VideoProcessingProgress) => void;
  signal?: AbortSignal;
}

/**
 * Seeks a video element to a specific timestamp and resolves on the seeked event
 */
function seekVideoToTime(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      resolve();
    };

    const handleError = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      reject(new Error(`Failed to seek video to time: ${time.toFixed(2)}s`));
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    video.currentTime = Math.max(0, time);
  });
}

/**
 * Executes frame-by-frame visible watermark cleanup on a video using OpenCV Telea and FFmpeg
 */
export async function processVideoWatermark(
  videoState: VideoFileState,
  maskImageData: ImageData,
  options: VideoProcessingOptions = {}
): Promise<ProcessedVideoState> {
  const startTime = performance.now();
  const { radius = 5, onProgress, signal } = options;

  // 1. Check for early abort
  if (signal?.aborted) {
    throw new Error('Video processing was canceled before execution started.');
  }

  // 2. Validate prerequisites
  onProgress?.({
    phase: 'extracting',
    percent: 5,
    currentFrame: 0,
    totalFrames: 0,
    fps: 24,
    message: 'Initializing OpenCV and FFmpeg WebAssembly engines…',
  });

  await Promise.all([getOpenCv(), getFFmpeg()]);

  if (signal?.aborted) {
    throw new Error('Video processing was canceled by user.');
  }

  const ffmpeg = await getFFmpeg();

  // 3. Setup processing parameters
  const fps = options.fps || videoState.frameRate || 24;
  const duration = Math.min(videoState.duration, 5.0);
  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const width = videoState.width;
  const height = videoState.height;

  // 4. Create offscreen video element for sequential frame capture
  const video = document.createElement('video');
  video.src = videoState.objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video element for frame capture.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create offscreen 2D canvas context for frame capture.');
  }

  // 5. Extract audio track if source has audio
  let hasExtractedAudio = false;
  if (videoState.hasAudio) {
    try {
      onProgress?.({
        phase: 'extracting',
        percent: 8,
        currentFrame: 0,
        totalFrames,
        fps,
        message: 'Preserving audio track from source video…',
      });

      const videoData = await fetchFile(videoState.file);
      await ffmpeg.writeFile('source_input.mp4', videoData);

      // Attempt extracting audio stream with non-interactive overwrite
      const audioExec = await ffmpeg.exec([
        '-y',
        '-i',
        'source_input.mp4',
        '-vn',
        '-acodec',
        'aac',
        '-b:a',
        '128k',
        'source_audio.aac',
      ]);

      if (audioExec === 0) {
        hasExtractedAudio = true;
      }
    } catch {
      hasExtractedAudio = false;
    }
  }

  // 6. Sequential Frame Extraction & Inpainting Loop
  const createdFrameFiles: string[] = [];
  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        throw new Error('Video processing was canceled by user.');
      }

      // Compute frame timestamp
      const frameTime = Math.min(i / fps, Math.max(0, duration - 0.03));
      await seekVideoToTime(video, frameTime);

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      const frameImageData = ctx.getImageData(0, 0, width, height);

      // Execute genuine OpenCV Telea inpainting on this frame
      const inpaintResult = await executeInpainting(frameImageData, maskImageData, {
        radius,
        algorithm: 'telea',
      });

      // Put inpainted pixels back to canvas
      ctx.putImageData(inpaintResult.outputImageData, 0, 0);

      // Convert frame to JPEG bytes for FFmpeg virtual file system
      const frameBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode frame blob.'))),
          'image/jpeg',
          0.92
        );
      });

      const frameArrayBuffer = await frameBlob.arrayBuffer();
      const frameFileName = `frame_${String(i).padStart(5, '0')}.jpg`;
      await ffmpeg.writeFile(frameFileName, new Uint8Array(frameArrayBuffer));
      createdFrameFiles.push(frameFileName);

      // Report progress (Frame extraction & inpainting covers 10% to 75%)
      const progressPercent = 10 + Math.round(((i + 1) / totalFrames) * 65);
      onProgress?.({
        phase: 'inpainting',
        percent: progressPercent,
        currentFrame: i + 1,
        totalFrames,
        fps,
        message: `Inpainting video frame ${i + 1} of ${totalFrames} (Telea FMM)…`,
      });
    }

    if (signal?.aborted) {
      throw new Error('Video processing was canceled by user.');
    }

    // 7. FFmpeg Encoding Phase
    onProgress?.({
      phase: 'encoding',
      percent: 80,
      currentFrame: totalFrames,
      totalFrames,
      fps,
      message: 'Encoding cleaned video frames into MP4 (H.264)…',
    });

    const ffmpegArgs: string[] = [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      'frame_%05d.jpg',
    ];

    if (hasExtractedAudio) {
      ffmpegArgs.push(
        '-i',
        'source_audio.aac',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        '-movflags',
        '+faststart',
        'output.mp4'
      );
    } else {
      ffmpegArgs.push(
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        'output.mp4'
      );
    }

    const encodeStatus = await ffmpeg.exec(ffmpegArgs);
    if (encodeStatus !== 0) {
      throw new Error(`FFmpeg encoding failed with exit code: ${encodeStatus}`);
    }

    onProgress?.({
      phase: 'encoding',
      percent: 95,
      currentFrame: totalFrames,
      totalFrames,
      fps,
      message: 'Finalizing MP4 video output container…',
    });

    // 8. Read assembled output file
    const outputData = await ffmpeg.readFile('output.mp4');
    const u8 = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData as any);
    const outputBlob = new Blob([u8.buffer as ArrayBuffer], { type: 'video/mp4' });
    const outputUrl = URL.createObjectURL(outputBlob);

    const computeTimeMs = Math.round(performance.now() - startTime);

    onProgress?.({
      phase: 'complete',
      percent: 100,
      currentFrame: totalFrames,
      totalFrames,
      fps,
      message: `Successfully processed ${totalFrames} frames in ${computeTimeMs} ms.`,
    });

    return {
      objectUrl: outputUrl,
      width,
      height,
      duration,
      computeTimeMs,
      algorithm: 'telea',
      radius,
      outputFormat: 'mp4',
      hasAudio: hasExtractedAudio,
      createdAt: Date.now(),
      totalFramesProcessed: totalFrames,
      fileSizeBytes: u8.byteLength,
    };
  } finally {
    // 9. Thorough cleanup of virtual filesystem files and media resources
    try {
      video.src = '';
      video.load();
      canvas.width = 0;
      canvas.height = 0;

      for (const file of createdFrameFiles) {
        await ffmpeg.deleteFile(file).catch(() => {});
      }
      if (hasExtractedAudio) {
        await ffmpeg.deleteFile('source_input.mp4').catch(() => {});
        await ffmpeg.deleteFile('source_audio.aac').catch(() => {});
      }
      await ffmpeg.deleteFile('output.mp4').catch(() => {});
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Cancels any active FFmpeg processing
 */
export function cancelVideoProcessing(): void {
  terminateFFmpeg();
}

export interface ProcessVideoParams {
  videoState: VideoFileState;
  maskImageData: ImageData;
  inpaintRadius?: number;
  onProgress?: (progress: VideoProcessingProgress) => void;
  signal?: AbortSignal;
}

/**
 * Convenience orchestrator for video inpainting with parameter object
 */
export async function processVideoWithInpainting({
  videoState,
  maskImageData,
  inpaintRadius = 5,
  onProgress,
  signal,
}: ProcessVideoParams): Promise<ProcessedVideoState> {
  return processVideoWatermark(videoState, maskImageData, {
    radius: inpaintRadius,
    onProgress,
    signal,
  });
}
