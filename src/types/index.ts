export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

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
  | 'not_checked';

export interface ProvenanceItem {
  id: 'c2pa' | 'exif' | 'synthid' | 'aiLabels';
  title: string;
  category: string;
  status: ProvenanceStatus;
  statusLabel: string;
  statusTone: 'neutral' | 'success' | 'warning' | 'info';
  summary: string;
  technicalDetails: string;
  specificationUrl?: string;
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
