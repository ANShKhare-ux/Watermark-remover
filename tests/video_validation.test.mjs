import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isVideoFormatSupported,
  MAX_VIDEO_FILE_SIZE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_WIDTH,
  MAX_VIDEO_HEIGHT,
  MAX_TOTAL_PIXELS,
  SUPPORTED_VIDEO_MIME_TYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  validateAndDecodeVideo,
} from '../src/utils/videoValidation.ts';

test('Video Validation: isVideoFormatSupported validates accepted MP4 and WebM formats', () => {
  assert.equal(isVideoFormatSupported({ name: 'clip.mp4', type: 'video/mp4' }), true);
  assert.equal(isVideoFormatSupported({ name: 'anim.webm', type: 'video/webm' }), true);
  assert.equal(isVideoFormatSupported({ name: 'RECORDING.MP4', type: '' }), true);
  assert.equal(isVideoFormatSupported({ name: 'screencast.WEBM', type: '' }), true);

  // Unsupported formats
  assert.equal(isVideoFormatSupported({ name: 'movie.mov', type: 'video/quicktime' }), false);
  assert.equal(isVideoFormatSupported({ name: 'clip.avi', type: 'video/x-msvideo' }), false);
  assert.equal(isVideoFormatSupported({ name: 'stream.mkv', type: 'video/x-matroska' }), false);
  assert.equal(isVideoFormatSupported({ name: 'photo.jpg', type: 'image/jpeg' }), false);
  assert.equal(isVideoFormatSupported({ name: 'banner.png', type: 'image/png' }), false);
  assert.equal(isVideoFormatSupported({ name: 'audio.mp3', type: 'audio/mpeg' }), false);
});

test('Video Validation: Constants enforce Phase 3 MVP constraints', () => {
  assert.equal(MAX_VIDEO_FILE_SIZE_BYTES, 50 * 1024 * 1024); // 50 MB
  assert.equal(MAX_VIDEO_DURATION_SECONDS, 5.0); // 5.0 seconds maximum
  assert.equal(MAX_VIDEO_WIDTH, 1280); // 720p width
  assert.equal(MAX_VIDEO_HEIGHT, 720); // 720p height
  assert.equal(MAX_TOTAL_PIXELS, 1280 * 720); // 921,600 pixels
  assert.deepEqual([...SUPPORTED_VIDEO_MIME_TYPES], ['video/mp4', 'video/webm']);
  assert.deepEqual([...SUPPORTED_VIDEO_EXTENSIONS], ['.mp4', '.webm']);
});

test('Video Validation: validateAndDecodeVideo rejects null, empty, oversized, and unsupported containers', async () => {
  const nullResult = await validateAndDecodeVideo(null);
  assert.equal(nullResult.valid, false);
  assert.match(nullResult.error, /No video file was provided/i);

  const emptyResult = await validateAndDecodeVideo({
    name: 'empty.mp4',
    type: 'video/mp4',
    size: 0,
  });
  assert.equal(emptyResult.valid, false);
  assert.match(emptyResult.error, /empty/i);

  const oversizedResult = await validateAndDecodeVideo({
    name: 'oversized.mp4',
    type: 'video/mp4',
    size: 55 * 1024 * 1024,
  });
  assert.equal(oversizedResult.valid, false);
  assert.match(oversizedResult.error, /safety ceiling/i);

  const unsupportedResult = await validateAndDecodeVideo({
    name: 'movie.mov',
    type: 'video/quicktime',
    size: 2048,
  });
  assert.equal(unsupportedResult.valid, false);
  assert.match(unsupportedResult.error, /Unsupported video format/i);
});

