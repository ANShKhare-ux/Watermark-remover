import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Trash2,
  Grid,
  Square,
  Crosshair,
} from 'lucide-react';
import type { ImageFileState } from '../../types';
import { SUPPORTED_EXTENSIONS } from '../../utils/fileValidation';
import styles from './MediaPreview.module.css';

export interface MediaPreviewProps {
  imageState: ImageFileState;
  onReplaceImage: (file: File) => void;
  onClearImage: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  imageState,
  onReplaceImage,
  onClearImage,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [fitMode, setFitMode] = useState<'fit' | 'actual' | 'custom'>('fit');
  const [backgroundMode, setBackgroundMode] = useState<'dark' | 'checkerboard'>('dark');
  const [cursorPixel, setCursorPixel] = useState<{ x: number; y: number } | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleZoomIn = useCallback(() => {
    setFitMode('custom');
    setZoomLevel((prev) => Math.min(prev * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setFitMode('custom');
    setZoomLevel((prev) => Math.max(prev / 1.25, 0.2));
  }, []);

  const handleResetToFit = useCallback(() => {
    setFitMode('fit');
    setZoomLevel(1);
  }, []);

  const handleActualSize = useCallback(() => {
    setFitMode('actual');
    setZoomLevel(1);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or modal
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetToFit();
      } else if (e.key === '1') {
        e.preventDefault();
        handleActualSize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetToFit, handleActualSize]);

  // Track pixel position under cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = imageRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (clientX >= 0 && clientY >= 0 && clientX <= rect.width && clientY <= rect.height) {
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;

      const px = Math.min(Math.floor(clientX * scaleX), img.naturalWidth - 1);
      const py = Math.min(Math.floor(clientY * scaleY), img.naturalHeight - 1);

      setCursorPixel({ x: Math.max(0, px), y: Math.max(0, py) });
    }
  };

  const handleMouseLeave = () => {
    setCursorPixel(null);
  };

  const handleReplaceClick = () => {
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onReplaceImage(files[0]);
    }
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
  };

  // Compute image style based on zoom and fit mode
  const getImageStyle = (): React.CSSProperties => {
    if (fitMode === 'fit') {
      return {
        maxHeight: 'calc(100vh - 200px)',
        maxWidth: '100%',
        width: 'auto',
        height: 'auto',
      };
    }
    if (fitMode === 'actual') {
      return {
        width: `${imageState.width}px`,
        height: `${imageState.height}px`,
        maxWidth: 'none',
      };
    }
    // Custom zoom level
    return {
      transform: `scale(${zoomLevel})`,
      transformOrigin: 'center center',
      maxWidth: '100%',
      maxHeight: 'calc(100vh - 200px)',
    };
  };

  return (
    <div className={styles.container}>
      {/* Hidden input for replacing image */}
      <input
        ref={replaceInputRef}
        type="file"
        accept={SUPPORTED_EXTENSIONS.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Workspace Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={`${styles.toolButton} ${
              fitMode === 'fit' ? styles.toolButtonActive : ''
            }`}
            onClick={handleResetToFit}
            title="Fit to workspace (0)"
            aria-label="Fit image to workspace"
          >
            <Maximize2 size={14} />
            <span>Fit</span>
          </button>

          <button
            type="button"
            className={`${styles.toolButton} ${
              fitMode === 'actual' ? styles.toolButtonActive : ''
            }`}
            onClick={handleActualSize}
            title="100% Actual Size (1)"
            aria-label="View actual pixel size"
          >
            <span>100%</span>
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.toolButton}
            onClick={handleZoomOut}
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>

          <span className={styles.zoomLabel}>
            {Math.round(
              (fitMode === 'custom'
                ? zoomLevel
                : fitMode === 'actual'
                ? 1
                : 1) * 100
            )}
            %
          </span>

          <button
            type="button"
            className={styles.toolButton}
            onClick={handleZoomIn}
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className={styles.toolGroup}>
          <button
            type="button"
            className={`${styles.toolButton} ${
              backgroundMode === 'dark' ? styles.toolButtonActive : ''
            }`}
            onClick={() => setBackgroundMode('dark')}
            title="Solid dark background"
            aria-label="Solid dark canvas background"
          >
            <Square size={13} />
            <span>Dark</span>
          </button>

          <button
            type="button"
            className={`${styles.toolButton} ${
              backgroundMode === 'checkerboard' ? styles.toolButtonActive : ''
            }`}
            onClick={() => setBackgroundMode('checkerboard')}
            title="Checkerboard background for transparency evaluation"
            aria-label="Checkerboard transparency background"
          >
            <Grid size={13} />
            <span>Checkerboard</span>
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.toolButton}
            onClick={handleReplaceClick}
            title="Select another image"
            aria-label="Replace current image"
          >
            <RefreshCw size={13} />
            <span>Replace</span>
          </button>

          <button
            type="button"
            className={styles.toolButton}
            onClick={onClearImage}
            title="Close image and reset (Esc)"
            aria-label="Clear image"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        className={`${styles.workspace} ${
          backgroundMode === 'checkerboard'
            ? 'checkerboard-pattern'
            : styles.workspaceDark
        }`}
      >
        <div className={styles.imageWrapper}>
          <img
            ref={imageRef}
            src={imageState.objectUrl}
            alt={imageState.name}
            className={styles.previewImage}
            style={getImageStyle()}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </div>
      </div>

      {/* Floating Status & Metrics Badge */}
      <div className={styles.floatingMetrics}>
        <div className={styles.metricItem}>
          <span>Dimensions:</span>
          <span className={styles.metricValue}>
            {imageState.width} × {imageState.height} px
          </span>
        </div>

        <span className={styles.metricSeparator}>•</span>

        <div className={styles.metricItem}>
          <span>Ratio:</span>
          <span className={styles.metricValue}>{imageState.aspectRatio}</span>
        </div>

        <span className={styles.metricSeparator}>•</span>

        <div className={styles.metricItem}>
          <span>Detail:</span>
          <span className={styles.metricValue}>{imageState.megapixels}</span>
        </div>

        {cursorPixel && (
          <>
            <span className={styles.metricSeparator}>•</span>
            <div className={styles.metricItem}>
              <Crosshair size={12} />
              <span>Pixel:</span>
              <span className={styles.metricValue}>
                X:{cursorPixel.x} Y:{cursorPixel.y}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
