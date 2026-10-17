import React, { useRef, useState, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SUPPORTED_EXTENSIONS as IMAGE_EXTENSIONS } from '../../utils/fileValidation';
import { SUPPORTED_VIDEO_EXTENSIONS } from '../../utils/videoValidation';
import { createSampleImage } from '../../utils/sampleImages';
import { createSampleWatermarkedVideo } from '../../utils/sampleVideos';
import styles from './UploadPanel.module.css';

export interface UploadPanelProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

const ALL_ACCEPTED_FORMATS = [
  ...IMAGE_EXTENSIONS,
  ...SUPPORTED_VIDEO_EXTENSIONS,
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
].join(',');

export const UploadPanel: React.FC<UploadPanelProps> = ({
  onFileSelected,
  isLoading = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the dropzone container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (isLoading) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelected(files[0]);
      }
    },
    [isLoading, onFileSelected]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
    // Reset file input so selecting the same file again triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrowseClick();
    }
  };

  const handleLoadImageSample = async (
    type: 'photo' | 'png-transparent' | 'webp-banner' | 'watermarked-photo',
    label: string
  ) => {
    if (isLoading || loadingSample) return;
    setLoadingSample(label);
    try {
      const sampleFile = await createSampleImage(type);
      onFileSelected(sampleFile);
    } catch {
      // Error handled by parent validation
    } finally {
      setLoadingSample(null);
    }
  };

  const handleLoadVideoSample = async () => {
    if (isLoading || loadingSample) return;
    setLoadingSample('Watermarked Video');
    try {
      const sampleVideo = await createSampleWatermarkedVideo();
      onFileSelected(sampleVideo);
    } catch {
      // Error handled by parent validation
    } finally {
      setLoadingSample(null);
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${
          isDragActive ? styles.dropzoneActive : ''
        } ${isLoading ? styles.dropzoneLoading : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Upload media area. Drag and drop an image or video, or click to browse"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALL_ACCEPTED_FORMATS}
          onChange={handleFileInputChange}
          className={styles.fileInput}
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className={styles.iconCircle}>
          {isLoading ? (
            <Loader2 size={24} className={styles.loadingSpinner} />
          ) : (
            <Upload size={24} />
          )}
        </div>

        <h2 className={styles.title}>
          {isLoading ? 'Decoding and validating media…' : 'Drop an image or video to inspect'}
        </h2>

        <p className={styles.subtitle}>
          Drag and drop media here, or browse from your device.
          Images (JPEG, PNG, WebP) and Videos (MP4, WebM up to 5s/720p) are processed 100% locally.
        </p>

        <button
          type="button"
          className={styles.browseButton}
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseClick();
          }}
          disabled={isLoading}
        >
          <ImageIcon size={15} />
          <span>Browse Media File</span>
        </button>

        <div className={styles.specsList}>
          <span className={styles.specItem}>Images: JPEG, PNG, WebP</span>
          <span className={styles.specDot} />
          <span className={styles.specItem}>Videos: MP4, WebM (≤5s, ≤720p)</span>
          <span className={styles.specDot} />
          <span className={styles.specItem}>Up to 50 MB</span>
          <span className={styles.specDot} />
          <span className={styles.specItem}>100% Client-Side Sandbox</span>
        </div>
      </div>

      <div className={styles.samplesSection}>
        <div className={styles.samplesHeader}>Or try an instant sample test asset:</div>
        <div className={styles.samplesGrid}>
          {/* Phase 3 Video MVP Sample */}
          <button
            type="button"
            className={styles.sampleButton}
            onClick={handleLoadVideoSample}
            disabled={isLoading || Boolean(loadingSample)}
            title="Generated 3.0s animated 720p test video with an authorized visible watermark and 440Hz audio tone"
            style={{
              borderColor: 'var(--accent-red)',
              backgroundColor: 'rgba(225, 29, 72, 0.08)',
              color: 'var(--text-primary)',
            }}
          >
            {loadingSample === 'Watermarked Video' ? (
              <Loader2 size={13} className={styles.loadingSpinner} />
            ) : (
              <VideoIcon size={13} color="#e11d48" />
            )}
            <span style={{ fontWeight: 600 }}>Watermarked Video (3s Test MVP)</span>
          </button>

          {/* Phase 2 Image Inpainting Sample */}
          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadImageSample('watermarked-photo', 'Watermarked Photo')}
            disabled={isLoading || Boolean(loadingSample)}
            title="Pre-loaded landscape photograph with a visible watermark stamp to test inpainting"
          >
            {loadingSample === 'Watermarked Photo' ? (
              <Loader2 size={13} className={styles.loadingSpinner} />
            ) : (
              <Sparkles size={13} color="#f59e0b" />
            )}
            <span style={{ fontWeight: 600 }}>Watermarked Photo (Test Inpainting)</span>
          </button>

          {/* Phase 1 Samples */}
          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadImageSample('photo', 'Calibration Chart')}
            disabled={isLoading || Boolean(loadingSample)}
          >
            <Sparkles size={13} />
            <span>Calibration Chart (JPEG)</span>
          </button>

          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadImageSample('png-transparent', 'Alpha Asset')}
            disabled={isLoading || Boolean(loadingSample)}
          >
            <Sparkles size={13} />
            <span>Alpha Transparency (PNG)</span>
          </button>

          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadImageSample('webp-banner', 'WebP Banner')}
            disabled={isLoading || Boolean(loadingSample)}
          >
            <Sparkles size={13} />
            <span>Editorial Banner (WebP)</span>
          </button>
        </div>
      </div>

      <div className={styles.privacyCallout}>
        <ShieldCheck size={14} className={styles.privacyIcon} />
        <span>Privacy guaranteed: Files never leave your browser sandbox</span>
      </div>
    </div>
  );
};
