import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFormatSupported,
  validateAndDecodeImage,
  MAX_FILE_SIZE_BYTES,
} from '../src/utils/fileValidation.ts';

test('Validation: isFormatSupported validates accepted formats', () => {
  assert.equal(isFormatSupported({ name: 'photo.jpg', type: 'image/jpeg' }), true);
  assert.equal(isFormatSupported({ name: 'image.PNG', type: 'image/png' }), true);
  assert.equal(isFormatSupported({ name: 'asset.webp', type: 'image/webp' }), true);
  assert.equal(isFormatSupported({ name: 'photo.jpeg', type: '' }), true);

  // Unsupported formats
  assert.equal(isFormatSupported({ name: 'doc.pdf', type: 'application/pdf' }), false);
  assert.equal(isFormatSupported({ name: 'vector.svg', type: 'image/svg+xml' }), false);
  assert.equal(isFormatSupported({ name: 'anim.gif', type: 'image/gif' }), false);
  assert.equal(isFormatSupported({ name: 'video.mp4', type: 'video/mp4' }), false);
});

test('Validation: MAX_FILE_SIZE_BYTES is 50MB', () => {
  assert.equal(MAX_FILE_SIZE_BYTES, 50 * 1024 * 1024);
});

test('Validation: validateAndDecodeImage rejects null, empty, oversized, and unsupported files', async () => {
  const nullResult = await validateAndDecodeImage(null);
  assert.equal(nullResult.valid, false);
  assert.match(nullResult.error, /No file was provided/i);

  const emptyResult = await validateAndDecodeImage({
    name: 'empty.png',
    type: 'image/png',
    size: 0,
  });
  assert.equal(emptyResult.valid, false);
  assert.match(emptyResult.error, /empty/i);

  const oversizedResult = await validateAndDecodeImage({
    name: 'oversized.jpg',
    type: 'image/jpeg',
    size: 55 * 1024 * 1024,
  });
  assert.equal(oversizedResult.valid, false);
  assert.match(oversizedResult.error, /safety limit/i);

  const unsupportedResult = await validateAndDecodeImage({
    name: 'vector.svg',
    type: 'image/svg+xml',
    size: 2048,
  });
  assert.equal(unsupportedResult.valid, false);
  assert.match(unsupportedResult.error, /Unsupported format/i);
});

