export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type SupportedVideoFormat = 'video/mp4' | 'video/webm';

export interface ImageFileState {
  file: File;
  objectUrl: string;
  name: string;
  size: number;
  type: SupportedImageFormat | string;
  width: number;
  height: number;
  aspectRatio: string;
  megapixels: string;
  loadedAt: number;
}

export interface VideoFileState {
  file: File;
  objectUrl: string;
  name: string;
  size: number;
  type: SupportedVideoFormat | string;
  width: number;
  height: number;
  duration: number; // in seconds
  aspectRatio: string;
  hasAudio: boolean;
  frameRate: number; // e.g. 24 or 30 fps
  loadedAt: number;
}

export interface ExifMetadata {
  hasExif: boolean;
  make: string | null;
  model: string | null;
  lensModel: string | null;
  software: string | null;
  dateTimeOriginal: string | null;
  modifyDate: string | null;
  exposureTime: string | null;
  fNumber: string | null;
  iso: number | string | null;
  focalLength: string | null;
  focalLengthIn35mmFormat: string | null;
  colorSpace: string | null;
  orientation: string | null;
  exposureProgram: string | null;
  meteringMode: string | null;
  flash: string | null;
  whiteBalance: string | null;
  hasGps: boolean;
  gpsProtectedMessage: string | null;
  rawTagsCount: number;
}

export type ProvenanceStatus =
  | 'present'
  | 'absent'
  | 'detected'
  | 'not_detected'
  | 'not_integrated'
  | 'not_checked'
  | 'validation_failure'
  | 'inspection_error';

export interface ProvenanceItem {
  id: 'c2pa' | 'exif' | 'synthid' | 'aiLabels';
  title: string;
  category: string;
  status: ProvenanceStatus;
  statusLabel: string;
  statusTone: 'neutral' | 'success' | 'warning' | 'info' | 'error';
  summary: string;
  technicalDetails: string;
  specificationUrl?: string;
  manifestInfo?: {
    claimGenerator?: string;
    format?: string;
    title?: string;
    issuer?: string;
    isSignatureValid?: boolean;
    validationErrors?: string[];
  };
}

export interface ProvenanceData {
  c2pa: ProvenanceItem;
  exif: ProvenanceItem;
  synthid: ProvenanceItem;
  aiLabels: ProvenanceItem;
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface StatusNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  dismissible?: boolean;
}

export interface ViewportState {
  zoom: number; // e.g. 1.0 = 100%
  fitMode: 'fit' | 'actual' | 'custom';
  background: 'dark' | 'checkerboard';
  cursorCoords: { x: number; y: number } | null;
}

// Phase 2 Editor Types
export type BrushTool = 'brush' | 'eraser';

export interface ProcessedImageState {
  objectUrl: string;
  imageData: ImageData;
  width: number;
  height: number;
  computeTimeMs: number;
  radius: number;
  algorithm: 'telea';
  modifiedPixelCount: number;
  createdAt: number;
}

export type ComparisonMode = 'split' | 'side-by-side' | 'toggle';

export interface ExportProvenanceSafety {
  canExport: boolean;
  statusLabel: string;
  reason: string;
  blockers: string[];
  hasC2pa: boolean;
  hasExif: boolean;
  hasAiLabels: boolean;
}

// Phase 3 Video Types
export type VideoProcessingPhase =
  | 'idle'
  | 'extracting'
  | 'inpainting'
  | 'encoding'
  | 'complete'
  | 'canceled'
  | 'error';

export interface VideoProcessingProgress {
  phase: VideoProcessingPhase;
  percent: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  fps: number;
  message: string;
  etaSeconds?: number;
}

export interface ProcessedVideoState {
  objectUrl: string;
  width: number;
  height: number;
  duration: number;
  computeTimeMs: number;
  algorithm: 'telea';
  radius: number;
  outputFormat: 'mp4' | 'webm';
  hasAudio: boolean;
  createdAt: number;
}
