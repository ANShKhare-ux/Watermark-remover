import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExportSafety } from '../src/utils/exportSafety.ts';

test('Export Safety: Blocks export when C2PA credentials are detected', () => {
  const mockExif = { hasExif: false, rawTagsCount: 0 };
  const mockProvenance = {
    c2pa: { status: 'detected' },
    aiLabels: { status: 'not_detected' },
    exif: { status: 'absent' },
    synthid: { status: 'not_integrated' },
  };

  const safety = evaluateExportSafety(mockExif, mockProvenance);
  assert.equal(safety.canExport, false);
  assert.equal(safety.hasC2pa, true);
  assert.match(safety.reason, /provenance stripping/i);
  assert.ok(safety.blockers.some((b) => b.includes('C2PA Content Credentials')));
});

test('Export Safety: Blocks export when AI disclosure markers are detected', () => {
  const mockExif = { hasExif: false, rawTagsCount: 0 };
  const mockProvenance = {
    c2pa: { status: 'not_detected' },
    aiLabels: { status: 'detected' },
    exif: { status: 'absent' },
    synthid: { status: 'not_integrated' },
  };

  const safety = evaluateExportSafety(mockExif, mockProvenance);
  assert.equal(safety.canExport, false);
  assert.equal(safety.hasAiLabels, true);
  assert.ok(safety.blockers.some((b) => b.includes('AI disclosure marker')));
});

test('Export Safety: Blocks export when EXIF metadata headers are present', () => {
  const mockExif = { hasExif: true, rawTagsCount: 15 };
  const mockProvenance = {
    c2pa: { status: 'not_detected' },
    aiLabels: { status: 'not_detected' },
    exif: { status: 'present' },
    synthid: { status: 'not_integrated' },
  };

  const safety = evaluateExportSafety(mockExif, mockProvenance);
  assert.equal(safety.canExport, false);
  assert.equal(safety.hasExif, true);
  assert.ok(safety.blockers.some((b) => b.includes('EXIF metadata headers present')));
});

test('Export Safety: Allows export when source image has no metadata or provenance', () => {
  const mockExif = { hasExif: false, rawTagsCount: 0 };
  const mockProvenance = {
    c2pa: { status: 'not_detected' },
    aiLabels: { status: 'not_detected' },
    exif: { status: 'absent' },
    synthid: { status: 'not_integrated' },
  };

  const safety = evaluateExportSafety(mockExif, mockProvenance);
  assert.equal(safety.canExport, true);
  assert.equal(safety.blockers.length, 0);
  assert.match(safety.statusLabel, /Export Permitted/i);
});
