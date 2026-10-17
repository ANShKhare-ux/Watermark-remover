import React, { useState } from 'react';
import {
  FileText,
  Camera,
  Sliders,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import type { ImageFileState, ExifMetadata } from '../../types';
import { formatBytes, formatMimeType } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import styles from './FileInfoPanel.module.css';

export interface FileInfoPanelProps {
  imageState: ImageFileState;
  exif: ExifMetadata;
}

export const FileInfoPanel: React.FC<FileInfoPanelProps> = ({
  imageState,
  exif,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyFilename = async () => {
    try {
      await navigator.clipboard.writeText(imageState.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  const renderValue = (
    val: string | number | null | undefined,
    isMono: boolean = false
  ) => {
    if (val === null || val === undefined || val === '') {
      return <span className={styles.valueUnavailable}>—</span>;
    }
    return (
      <span
        className={`${styles.value} ${isMono ? styles.valueMono : ''}`}
      >
        {String(val)}
      </span>
    );
  };

  const displayFormat = formatMimeType(imageState.type, imageState.name);

  return (
    <div className={styles.panel}>
      {/* File Specifications */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <FileText size={13} />
            File Specifications
          </span>
          <Badge tone="neutral">{displayFormat}</Badge>
        </div>

        <div className={styles.dataGrid}>
          <div className={styles.row}>
            <span className={styles.label}>Name</span>
            <div className={styles.filenameWrapper} title={imageState.name}>
              <span className={styles.filenameText}>{imageState.name}</span>
              <button
                type="button"
                className={styles.copyButton}
                onClick={handleCopyFilename}
                title="Copy filename"
                aria-label="Copy filename"
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Format</span>
            {renderValue(`${displayFormat} (${imageState.type || 'image/*'})`)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>File Size</span>
            {renderValue(
              `${formatBytes(imageState.size)} (${imageState.size.toLocaleString()} bytes)`,
              true
            )}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Dimensions</span>
            {renderValue(
              `${imageState.width.toLocaleString()} × ${imageState.height.toLocaleString()} px`,
              true
            )}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Aspect Ratio</span>
            {renderValue(imageState.aspectRatio, true)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Megapixels</span>
            {renderValue(imageState.megapixels, true)}
          </div>
        </div>
      </section>

      {/* Camera & Hardware (EXIF) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Camera size={13} />
            Camera & Hardware
          </span>
          {exif.hasExif ? (
            <Badge tone="info" withDot>
              EXIF Found
            </Badge>
          ) : (
            <Badge tone="neutral">No EXIF</Badge>
          )}
        </div>

        <div className={styles.dataGrid}>
          <div className={styles.row}>
            <span className={styles.label}>Make</span>
            {renderValue(exif.make)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Model</span>
            {renderValue(exif.model)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Lens</span>
            {renderValue(exif.lensModel)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Software</span>
            {renderValue(exif.software)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Capture Date</span>
            {renderValue(exif.dateTimeOriginal, true)}
          </div>
        </div>
      </section>

      {/* Optics & Exposure Parameters */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Sliders size={13} />
            Optics & Exposure
          </span>
        </div>

        <div className={styles.dataGrid}>
          <div className={styles.row}>
            <span className={styles.label}>Shutter Speed</span>
            {renderValue(exif.exposureTime, true)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Aperture</span>
            {renderValue(exif.fNumber, true)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>ISO</span>
            {renderValue(exif.iso, true)}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Focal Length</span>
            {renderValue(
              exif.focalLengthIn35mmFormat
                ? `${exif.focalLength} (${exif.focalLengthIn35mmFormat} equiv.)`
                : exif.focalLength,
              true
            )}
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Color Profile</span>
            {renderValue(exif.colorSpace)}
          </div>
        </div>
      </section>

      {/* Privacy & Location Geotagging */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Shield size={13} />
            Geolocation & Privacy
          </span>
          {exif.hasGps ? (
            <Badge tone="warning">GPS Protected</Badge>
          ) : (
            <Badge tone="neutral">No GPS Tag</Badge>
          )}
        </div>

        <div className={styles.privacyAlert}>
          <Shield size={14} className={styles.privacyAlertIcon} />
          <div>
            {exif.hasGps ? (
              <span>
                <strong>GPS coordinates detected in file header.</strong> Exact
                latitude and longitude are shielded from display by default.
              </span>
            ) : (
              <span>
                No embedded GPS coordinates found in file metadata.
              </span>
            )}
            <div style={{ marginTop: '4px', color: 'var(--text-tertiary)' }}>
              ClearFrame processes files exclusively client-side. Zero telemetry or
              metadata is transmitted or logged.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
