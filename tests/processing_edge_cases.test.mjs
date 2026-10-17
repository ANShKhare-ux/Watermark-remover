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

test('OpenCV Processing: executeInpainting genuinely mutates masked pixels and preserves unmasked pixels', async () => {
  const width = 20;
  const height = 20;
  const sourceData = new Uint8ClampedArray(width * height * 4);
  const maskData = new Uint8ClampedArray(width * height * 4);

  // Fill source with dark background (30, 30, 30, 255)
  for (let i = 0; i < width * height; i++) {
    sourceData[i * 4] = 30;
    sourceData[i * 4 + 1] = 30;
    sourceData[i * 4 + 2] = 30;
    sourceData[i * 4 + 3] = 255;
  }

  // Draw a bright white watermark in the center (from x=8..11, y=8..11)
  let expectedMaskedPixels = 0;
  for (let y = 8; y <= 11; y++) {
    for (let x = 8; x <= 11; x++) {
      const idx = (y * width + x) * 4;
      sourceData[idx] = 255;     // R
      sourceData[idx + 1] = 255; // G
      sourceData[idx + 2] = 255; // B
      sourceData[idx + 3] = 255;

      // Mask active for this watermark
      maskData[idx] = 255;
      maskData[idx + 3] = 255;
      expectedMaskedPixels++;
    }
  }

  const sourceImg = { width, height, data: sourceData };
  const maskImg = { width, height, data: maskData };

  const result = await executeInpainting(sourceImg, maskImg, { radius: 3 });

  // 1. Verify resolution is preserved exactly
  assert.equal(result.width, width);
  assert.equal(result.height, height);
  assert.equal(result.modifiedPixelCount, expectedMaskedPixels);
  assert.ok(result.computeTimeMs >= 0);

  const out = result.outputImageData.data;

  // 2. Verify pixels outside the mask are completely preserved (0 delta)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < 8 || x > 11 || y < 8 || y > 11) {
        const idx = (y * width + x) * 4;
        assert.equal(out[idx], 30, `Unmasked pixel at (${x}, ${y}) R channel must remain 30`);
        assert.equal(out[idx + 1], 30, `Unmasked pixel at (${x}, ${y}) G channel must remain 30`);
        assert.equal(out[idx + 2], 30, `Unmasked pixel at (${x}, ${y}) B channel must remain 30`);
      }
    }
  }

  // 3. Verify pixels inside the watermark box genuinely changed from 255 down towards background ~30
  const centerIdx = (9 * width + 9) * 4;
  const centerR = out[centerIdx];
  const centerG = out[centerIdx + 1];
  const centerB = out[centerIdx + 2];

  // The center pixel was originally pure white 255. Inpainted pixel should be close to 30, significantly below 200.
  assert.ok(centerR < 100, `Inpainted center pixel R (${centerR}) should be reconstructed towards background 30`);
  assert.ok(centerG < 100, `Inpainted center pixel G (${centerG}) should be reconstructed towards background 30`);
  assert.ok(centerB < 100, `Inpainted center pixel B (${centerB}) should be reconstructed towards background 30`);
});
