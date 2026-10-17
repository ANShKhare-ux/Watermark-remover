import React, { useRef, useState, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SUPPORTED_EXTENSIONS } from '../../utils/fileValidation';
import { createSampleImage } from '../../utils/sampleImages';
import styles from './UploadPanel.module.css';

export interface UploadPanelProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
}

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

  const handleLoadSample = async (
    type: 'photo' | 'png-transparent' | 'webp-banner',
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
        aria-label="Upload image area. Drag and drop an image or click to browse"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS.join(',')}
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
          {isLoading ? 'Decoding and analyzing image…' : 'Drop an image to inspect'}
        </h2>

        <p className={styles.subtitle}>
          Drag and drop your media file here, or click to browse from your device.
          Real EXIF and provenance data are parsed locally.
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
          <span>Browse image file</span>
        </button>

        <div className={styles.specsList}>
          <span className={styles.specItem}>JPEG, PNG, WebP</span>
          <span className={styles.specDot} />
          <span className={styles.specItem}>Up to 50 MB</span>
          <span className={styles.specDot} />
          <span className={styles.specItem}>Client-side processing</span>
        </div>
      </div>

      <div className={styles.samplesSection}>
        <div className={styles.samplesHeader}>Or try an instant sample test asset:</div>
        <div className={styles.samplesGrid}>
          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadSample('photo', 'Calibration Chart')}
            disabled={isLoading || Boolean(loadingSample)}
          >
            <Sparkles size={13} />
            <span>Calibration Chart (JPEG)</span>
          </button>
          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadSample('png-transparent', 'Alpha Asset')}
            disabled={isLoading || Boolean(loadingSample)}
          >
            <Sparkles size={13} />
            <span>Alpha Transparency (PNG)</span>
          </button>
          <button
            type="button"
            className={styles.sampleButton}
            onClick={() => handleLoadSample('webp-banner', 'WebP Banner')}
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
