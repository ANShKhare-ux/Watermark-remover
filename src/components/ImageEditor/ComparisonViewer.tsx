import React, { useState, useRef, useCallback } from 'react';
import {
  Columns,
  SplitSquareVertical,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import type { ImageFileState, ProcessedImageState, ComparisonMode } from '../../types';
import styles from './ComparisonViewer.module.css';

export interface ComparisonViewerProps {
  imageState: ImageFileState;
  processedResult: ProcessedImageState;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  imageState,
  processedResult,
}) => {
  const [mode, setMode] = useState<ComparisonMode>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0 to 100
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container dimensions safely
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSplitPos(percentage);
    },
    [isDragging]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div className={styles.container}>
      {/* Top comparison mode toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.modeButton} ${
              mode === 'split' ? styles.modeButtonActive : ''
            }`}
            onClick={() => setMode('split')}
            title="Split comparison slider"
          >
            <SplitSquareVertical size={13} />
            <span>Split Slider</span>
          </button>

          <button
            type="button"
            className={`${styles.modeButton} ${
              mode === 'side-by-side' ? styles.modeButtonActive : ''
            }`}
            onClick={() => setMode('side-by-side')}
            title="Side-by-side comparison"
          >
            <Columns size={13} />
            <span>Side-by-Side</span>
          </button>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={`${styles.holdButton} ${
              isHoldingOriginal ? styles.holdButtonActive : ''
            }`}
            onMouseDown={() => setIsHoldingOriginal(true)}
            onMouseUp={() => setIsHoldingOriginal(false)}
            onMouseLeave={() => setIsHoldingOriginal(false)}
            onTouchStart={() => setIsHoldingOriginal(true)}
            onTouchEnd={() => setIsHoldingOriginal(false)}
            title="Press and hold to temporarily preview original image"
          >
            <Eye size={13} />
            <span>Hold to View Original</span>
          </button>
        </div>
      </div>

      {/* Main Comparison Area */}
      <div className={styles.workspace}>
        {mode === 'split' ? (
          <div
            ref={containerRef}
            className={styles.splitContainer}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Base image: Cleaned Result */}
            <img
              src={
                isHoldingOriginal
                  ? imageState.objectUrl
                  : processedResult.objectUrl
              }
              alt="Processed Result"
              className={styles.splitBaseImage}
              draggable={false}
            />

            {!isHoldingOriginal && (
              <>
                {/* Overlaid Original Image clipped to splitPos */}
                <div
                  className={styles.splitOverlay}
                  style={{ width: `${splitPos}%` }}
                >
                  <img
                    src={imageState.objectUrl}
                    alt="Original"
                    className={styles.splitOverlayImage}
                    style={{
                      width: containerWidth ? `${containerWidth}px` : '100%',
                    }}
                    draggable={false}
                  />
                </div>

                {/* Draggable Divider Bar with Keyboard Support */}
                <div
                  className={styles.splitDivider}
                  style={{ left: `${splitPos}%` }}
                  onPointerDown={handlePointerDown}
                  title="Drag or use Left/Right arrow keys to compare before and after"
                  role="separator"
                  tabIndex={0}
                  aria-label="Image comparison split position"
                  aria-valuenow={Math.round(splitPos)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      setSplitPos((p) => Math.max(0, p - 5));
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      setSplitPos((p) => Math.min(100, p + 5));
                    }
                  }}
                >
                  <div className={styles.dividerHandle}>
                    <SlidersHorizontal size={14} />
                  </div>
                </div>

                {/* Badges */}
                <span className={`${styles.labelBadge} ${styles.labelBefore}`}>
                  Original (Before)
                </span>
                <span className={`${styles.labelBadge} ${styles.labelAfter}`}>
                  Telea Cleaned (After)
                </span>
              </>
            )}
          </div>
        ) : (
          /* Side by side mode */
          <div className={styles.sideBySideContainer}>
            <div className={styles.sideCard}>
              <span className={styles.sideHeader}>Original Source</span>
              <img
                src={imageState.objectUrl}
                alt="Original"
                className={styles.sideImage}
              />
            </div>

            <div className={styles.sideCard}>
              <span className={styles.sideHeader}>
                Cleaned Result ({processedResult.algorithm.toUpperCase()})
              </span>
              <img
                src={processedResult.objectUrl}
                alt="Cleaned"
                className={styles.sideImage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
