import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  calculateAspectRatio,
  calculateMegapixels,
  formatShutterSpeed,
  formatAperture,
  formatFocalLength,
  formatDate,
  formatMimeType,
  sanitizeFilename,
} from '../src/utils/formatters.ts';

test('Formatters: formatBytes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1572864), '1.5 MB');
  assert.equal(formatBytes(-10), '—');
});

test('Formatters: calculateAspectRatio', () => {
  assert.equal(calculateAspectRatio(1920, 1080), '16:9');
  assert.equal(calculateAspectRatio(1080, 1920), '9:16');
  assert.equal(calculateAspectRatio(1000, 1000), '1:1');
  assert.equal(calculateAspectRatio(1200, 800), '3:2');
  assert.equal(calculateAspectRatio(800, 600), '4:3');
});

test('Formatters: calculateMegapixels', () => {
  assert.equal(calculateMegapixels(1920, 1080), '2.1 MP');
  assert.equal(calculateMegapixels(4000, 3000), '12.0 MP');
  assert.equal(calculateMegapixels(6000, 4000), '24.0 MP');
});

test('Formatters: formatShutterSpeed', () => {
  assert.equal(formatShutterSpeed(0.004), '1/250s');
  assert.equal(formatShutterSpeed(0.001), '1/1000s');
  assert.equal(formatShutterSpeed(0.5), '1/2s');
  assert.equal(formatShutterSpeed(2), '2s');
  assert.equal(formatShutterSpeed(null), null);
});

test('Formatters: formatAperture', () => {
  assert.equal(formatAperture(2.8), 'ƒ/2.8');
  assert.equal(formatAperture(1.4), 'ƒ/1.4');
  assert.equal(formatAperture(8), 'ƒ/8');
  assert.equal(formatAperture(null), null);
});

test('Formatters: formatFocalLength', () => {
  assert.equal(formatFocalLength(50), '50 mm');
  assert.equal(formatFocalLength(85.4), '85 mm');
  assert.equal(formatFocalLength(null), null);
});

test('Formatters: formatDate', () => {
  const formatted = formatDate('2024:06:15 14:30:00');
  assert.match(formatted, /2024/);
  assert.match(formatted, /14:30:00/);
});

test('Formatters: formatMimeType', () => {
  assert.equal(formatMimeType('image/jpeg', 'photo.jpg'), 'JPEG');
  assert.equal(formatMimeType('image/png', 'icon.png'), 'PNG');
  assert.equal(formatMimeType('image/webp', 'banner.webp'), 'WebP');
  assert.equal(formatMimeType('video/mp4', 'clip.mp4'), 'MP4');
  assert.equal(formatMimeType('video/webm', 'screencast.webm'), 'WebM');
  assert.equal(formatMimeType('', 'data.DAT'), 'DAT');
});

test('Formatters: sanitizeFilename strips directory traversal, control chars, and malicious patterns', () => {
  assert.equal(sanitizeFilename('../../etc/passwd.jpg'), 'passwd');
  assert.equal(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe'), 'cmd');
  assert.equal(sanitizeFilename('<script>alert(1)</script>.png'), 'script');
  assert.equal(sanitizeFilename('<img_src=x_onerror=alert(1)>.png'), 'img_src_x_onerror_alert_1');
  assert.equal(sanitizeFilename('normal-photo_2024.jpeg'), 'normal-photo_2024');
  assert.equal(sanitizeFilename('file with spaces & symbols!#@.webp'), 'file_with_spaces_symbols');
  assert.equal(sanitizeFilename('', 'fallback'), 'fallback');
  assert.equal(sanitizeFilename('...', 'safe_media'), 'safe_media');
});

