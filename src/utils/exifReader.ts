import exifr from 'exifr';
import type { ExifMetadata, ProvenanceData, ProvenanceItem } from '../types';
import {
  formatDate,
  formatShutterSpeed,
  formatAperture,
  formatFocalLength,
} from './formatters';
import { inspectC2paManifest } from '../services/c2paService';

export interface ExtractedImageMetadata {
  exif: ExifMetadata;
  provenance: ProvenanceData;
  rawTags: Record<string, any>;
}

/**
 * Checks for known AI generator signatures in IPTC/XMP/EXIF
 */
function detectAiLabels(raw: Record<string, any>): {
  detected: boolean;
  label?: string;
  sourceField?: string;
} {
  // 1. Standard IPTC DigitalSourceType
  const digitalSourceType =
    raw.DigitalSourceType ||
    raw.digitalSourceType ||
    raw['Iptc4xmpExt:DigitalSourceType'];

  if (digitalSourceType) {
    const val = String(digitalSourceType);
    if (val.includes('trainedAlgorithmicMedia')) {
      return {
        detected: true,
        label: 'Trained Algorithmic Media (Generative AI)',
        sourceField: 'IPTC:DigitalSourceType',
      };
    }
    if (val.includes('compositeWithTrainedAlgorithmicMedia')) {
      return {
        detected: true,
        label: 'Composite with Algorithmic Media (Inpainting / AI Composite)',
        sourceField: 'IPTC:DigitalSourceType',
      };
    }
    if (val.includes('algorithmicMedia')) {
      return {
        detected: true,
        label: 'Algorithmic Media',
        sourceField: 'IPTC:DigitalSourceType',
      };
    }
  }

  // 2. Known AI generator software or prompt tags in Software / UserComment / ImageDescription
  const fieldsToCheck = [
    { name: 'Software', val: raw.Software },
    { name: 'UserComment', val: raw.UserComment },
    { name: 'ImageDescription', val: raw.ImageDescription },
    { name: 'Artist', val: raw.Artist },
    { name: 'Copyright', val: raw.Copyright },
  ];

  const aiSignatures = [
    { pattern: /midjourney/i, label: 'Midjourney' },
    { pattern: /dall[-·]?e/i, label: 'DALL-E' },
    { pattern: /stable\s*diffusion/i, label: 'Stable Diffusion' },
    { pattern: /firefly/i, label: 'Adobe Firefly' },
    { pattern: /flux\.1/i, label: 'Flux.1' },
    { pattern: /novelai/i, label: 'NovelAI' },
    { pattern: /imagen/i, label: 'Google Imagen' },
    { pattern: /bing\s*image\s*creator/i, label: 'Microsoft Image Creator' },
  ];

  for (const field of fieldsToCheck) {
    if (field.val && typeof field.val === 'string') {
      for (const sig of aiSignatures) {
        if (sig.pattern.test(field.val)) {
          return {
            detected: true,
            label: `${sig.label} signature in metadata`,
            sourceField: field.name,
          };
        }
      }
    }
  }

  return { detected: false };
}

/**
 * Reads EXIF metadata and provenance indicators from an image file
 */
export async function readImageMetadata(file: File): Promise<ExtractedImageMetadata> {
  let raw: Record<string, any> = {};

  // 1. Read EXIF / XMP / IPTC / TIFF tags via exifr
  try {
    const parsed = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: true,
      ihdr: true,
      mergeOutput: true,
      silentErrors: true,
    });
    if (parsed && typeof parsed === 'object') {
      raw = parsed;
    }
  } catch {
    raw = {};
  }

  // 2. Full C2PA Manifest inspection via @contentauth/c2pa-web
  const c2paResult = await inspectC2paManifest(file);

  // 3. Format EXIF fields
  const rawKeys = Object.keys(raw);
  const tagCount = rawKeys.length;
  const hasExif = tagCount > 0 && !('ImageWidth' in raw && tagCount <= 4);

  // GPS check: detect presence without exposing coordinates by default
  const hasGps = Boolean(
    raw.latitude !== undefined ||
      raw.longitude !== undefined ||
      raw.GPSLatitude !== undefined ||
      raw.GPSLongitude !== undefined ||
      raw.GPSPosition !== undefined
  );

  const exifMetadata: ExifMetadata = {
    hasExif,
    make: raw.Make ? String(raw.Make).trim() : null,
    model: raw.Model ? String(raw.Model).trim() : null,
    lensModel: raw.LensModel
      ? String(raw.LensModel).trim()
      : raw.LensInfo
        ? String(raw.LensInfo).trim()
        : null,
    software: raw.Software ? String(raw.Software).trim() : null,
    dateTimeOriginal: formatDate(raw.DateTimeOriginal || raw.CreateDate),
    modifyDate: formatDate(raw.ModifyDate),
    exposureTime: formatShutterSpeed(raw.ExposureTime),
    fNumber: formatAperture(raw.FNumber),
    iso: raw.ISO || raw.ISOSpeedRatings || null,
    focalLength: formatFocalLength(raw.FocalLength),
    focalLengthIn35mmFormat: raw.FocalLengthIn35mmFormat
      ? `${raw.FocalLengthIn35mmFormat} mm`
      : null,
    colorSpace: raw.ColorSpace
      ? raw.ColorSpace === 1 || raw.ColorSpace === 'sRGB'
        ? 'sRGB'
        : String(raw.ColorSpace)
      : raw.ProfileDescription || null,
    orientation: raw.Orientation ? String(raw.Orientation) : null,
    exposureProgram: raw.ExposureProgram ? String(raw.ExposureProgram) : null,
    meteringMode: raw.MeteringMode ? String(raw.MeteringMode) : null,
    flash: raw.Flash ? String(raw.Flash) : null,
    whiteBalance: raw.WhiteBalance ? String(raw.WhiteBalance) : null,
    hasGps,
    gpsProtectedMessage: hasGps
      ? 'Protected • Hidden by default for personal privacy'
      : null,
    rawTagsCount: tagCount,
  };

  // 4. Construct Provenance Status Rows
  let c2paItem: ProvenanceItem;
  if (c2paResult.status === 'detected') {
    c2paItem = {
      id: 'c2pa',
      title: 'C2PA Content Credentials',
      category: 'Provenance Standard',
      status: 'detected',
      statusLabel: 'Credentials Present',
      statusTone: 'info',
      summary: c2paResult.summary,
      technicalDetails: c2paResult.technicalDetails,
      specificationUrl: 'https://c2pa.org/specifications/',
      manifestInfo: c2paResult.manifestInfo,
    };
  } else if (c2paResult.status === 'validation_failure') {
    c2paItem = {
      id: 'c2pa',
      title: 'C2PA Content Credentials',
      category: 'Provenance Standard',
      status: 'validation_failure',
      statusLabel: 'Validation Failed',
      statusTone: 'error',
      summary: c2paResult.summary,
      technicalDetails: c2paResult.technicalDetails,
      specificationUrl: 'https://c2pa.org/specifications/',
    };
  } else if (c2paResult.status === 'inspection_error') {
    c2paItem = {
      id: 'c2pa',
      title: 'C2PA Content Credentials',
      category: 'Provenance Standard',
      status: 'inspection_error',
      statusLabel: 'Inspection Issue',
      statusTone: 'warning',
      summary: c2paResult.summary,
      technicalDetails: c2paResult.technicalDetails,
      specificationUrl: 'https://c2pa.org/specifications/',
    };
  } else {
    c2paItem = {
      id: 'c2pa',
      title: 'C2PA Content Credentials',
      category: 'Provenance Standard',
      status: 'not_detected',
      statusLabel: 'Not Detected',
      statusTone: 'neutral',
      summary: 'No embedded C2PA manifest or JUMBF container found in file.',
      technicalDetails:
        'The file stream contains no C2PA manifests. Many web platforms and photo editors strip provenance manifests on export.',
      specificationUrl: 'https://c2pa.org/specifications/',
    };
  }

  // EXIF Row
  const exifItem: ProvenanceItem = hasExif
    ? {
        id: 'exif',
        title: 'EXIF Metadata Headers',
        category: 'Capture Metadata',
        status: 'present',
        statusLabel: `Present (${tagCount} tags)`,
        statusTone: 'info',
        summary: 'Exchangeable Image File Format tags identified.',
        technicalDetails:
          'Contains camera hardware, optics, and capture timestamp tags. Note: Standard EXIF tags can be modified and do not cryptographically prove authenticity.',
      }
    : {
        id: 'exif',
        title: 'EXIF Metadata Headers',
        category: 'Capture Metadata',
        status: 'absent',
        statusLabel: 'Not Available / Stripped',
        statusTone: 'neutral',
        summary: 'No EXIF metadata segment found in file headers.',
        technicalDetails:
          'The image does not contain standard TIFF/EXIF segments. Metadata may have been stripped during web optimization, or was not embedded at capture.',
      };

  // SynthID Row
  const synthidItem: ProvenanceItem = {
    id: 'synthid',
    title: 'SynthID Verification',
    category: 'Imperceptible Watermarking',
    status: 'not_integrated',
    statusLabel: 'Detector not integrated',
    statusTone: 'neutral',
    summary:
      'Proprietary DeepMind detector is not integrated in client-only Phase 2.',
    technicalDetails:
      'Google DeepMind SynthID embeds imperceptible watermarks directly into digital pixel frequencies. Detection requires proprietary neural model inference and cannot be performed client-side without external API access.',
    specificationUrl: 'https://deepmind.google/technologies/synthid/',
  };

  // Platform AI Labels Row
  const aiDetection = detectAiLabels(raw);
  const aiLabelsItem: ProvenanceItem = aiDetection.detected
    ? {
        id: 'aiLabels',
        title: 'Platform AI Labels',
        category: 'Generative Disclosure',
        status: 'detected',
        statusLabel: 'AI Marker Detected',
        statusTone: 'warning',
        summary: `${aiDetection.label} (found in ${aiDetection.sourceField}).`,
        technicalDetails:
          'The file metadata contains standardized IPTC or software tags indicating synthetic or algorithmic generation.',
      }
    : {
        id: 'aiLabels',
        title: 'Platform AI Labels',
        category: 'Generative Disclosure',
        status: 'not_detected',
        statusLabel: 'Not Detected',
        statusTone: 'neutral',
        summary:
          'No standardized AI generation marker (IPTC DigitalSourceType or generator signature) found.',
        technicalDetails:
          'Absence of AI metadata does not infer human authorship. Many generative AI tools do not embed standardized IPTC labels or strip them upon export.',
      };

  const provenanceData: ProvenanceData = {
    c2pa: c2paItem,
    exif: exifItem,
    synthid: synthidItem,
    aiLabels: aiLabelsItem,
  };

  return {
    exif: exifMetadata,
    provenance: provenanceData,
    rawTags: raw,
  };
}
