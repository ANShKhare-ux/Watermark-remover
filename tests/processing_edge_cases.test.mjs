import test from 'node:test';
import assert from 'node:assert/strict';
import { executeInpainting } from '../src/services/opencvService.ts';
import { processVideoWithInpainting } from '../src/services/videoProcessingService.ts';

test('OpenCV Processing: executeInpainting throws when mask has 0 non-zero pixels', async () => {
  // Construct minimal mock 10x10 ImageData
  const width = 10;
  const height = 10;
  const sourceImageData = {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
  const emptyMaskData = {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4), // All 0
  };

  await assert.rejects(
    async () => {
      await executeInpainting(sourceImageData, emptyMaskData, { radius: 5 });
    },
    {
      name: 'Error',
      message: /No cleanup region was selected/i,
    }
  );
});

test('OpenCV Processing: executeInpainting enforces 36 Megapixel safety guard', async () => {
  const width = 8000;
  const height = 6000; // 48 MP > 36 MP
  const mockSource = {
    width,
    height,
    data: new Uint8ClampedArray(4),
  };
  const mockMask = {
    width,
    height,
    data: new Uint8ClampedArray(4),
  };

  await assert.rejects(
    async () => {
      await executeInpainting(mockSource, mockMask, { radius: 5 });
    },
    {
      name: 'Error',
      message: /safety threshold of 36 Megapixels/i,
    }
  );
});

test('Video Processing: processVideoWithInpainting respects pre-aborted signal', async () => {
  const abortController = new AbortController();
  abortController.abort();

  const mockVideoState = {
    file: new File([''], 'clip.mp4', { type: 'video/mp4' }),
    objectUrl: 'blob:fake',
    name: 'clip.mp4',
    size: 1024,
    type: 'video/mp4',
    width: 640,
    height: 360,
    duration: 2.0,
    frameRate: 30,
    hasAudio: false,
    aspectRatio: '16:9',
    loadedAt: Date.now(),
  };

  const mockMask = {
    width: 640,
    height: 360,
    data: new Uint8ClampedArray(640 * 360 * 4),
  };

  await assert.rejects(
    async () => {
      await processVideoWithInpainting({
        videoState: mockVideoState,
        maskImageData: mockMask,
        signal: abortController.signal,
      });
    },
    {
      name: 'Error',
      message: /canceled before execution started/i,
    }
  );
});
