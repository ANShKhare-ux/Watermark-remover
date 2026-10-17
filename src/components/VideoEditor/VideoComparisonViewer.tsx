import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SplitSquareVertical,
  Columns,
  Play,
  Pause,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react';
import type { VideoFileState, ProcessedVideoState } from '../../types';
import styles from './VideoComparisonViewer.module.css';

export interface VideoComparisonViewerProps {
  videoState: VideoFileState;
  processedVideo: ProcessedVideoState;
}

export const VideoComparisonViewer: React.FC<VideoComparisonViewerProps> = ({
  videoState,
  processedVideo,
}) => {
  const [mode, setMode] = useState<'split' | 'side-by-side'>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0 to 100
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const origVideoRef = useRef<HTMLVideoElement>(null);
  const procVideoRef = useRef<HTMLVideoElement>(null);

  // Measure split container width safely
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);

    return () => observer.disconnect();
  }, [mode]);

  // Synchronize playback between original and processed videos
  const togglePlay = () => {
    const orig = origVideoRef.current;
    const proc = procVideoRef.current;
    if (!orig || !proc) return;

    if (orig.paused) {
      // Sync times before playing
      proc.currentTime = orig.currentTime;
      orig.play().catch(() => {});
      proc.play().catch(() => {});
      setIsPlaying(true);
    } else {
      orig.pause();
      proc.pause();
      setIsPlaying(false);
    }
  };

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
      {/* Mode Toolbar */}
      <div className={styles.topBar}>
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
            title="Side-by-side synchronized view"
          >
            <Columns size={13} />
            <span>Side-by-Side</span>
          </button>
        </div>

        <div className={styles.syncBadge}>
          <Repeat size={12} />
          <span>Synchronized Playback</span>
        </div>
      </div>

      {/* Main Comparison Area */}
      <div className={styles.comparisonArea}>
        {mode === 'split' ? (
          <div
            ref={containerRef}
            className={styles.splitContainer}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Base video: Processed Inpainted Video */}
            <video
              ref={procVideoRef}
              src={processedVideo.objectUrl}
              className={styles.splitBaseVideo}
              playsInline
              loop
              muted
            />

            {/* Overlaid Original Video clipped to splitPos */}
            <div
              className={styles.splitOverlay}
              style={{ width: `${splitPos}%` }}
            >
              <video
                ref={origVideoRef}
                src={videoState.objectUrl}
                className={styles.splitOverlayVideo}
                style={{
                  width: containerWidth ? `${containerWidth}px` : '100%',
                }}
                playsInline
                loop
                muted
              />
            </div>

            {/* Draggable Divider with Keyboard Support */}
            <div
              className={styles.splitDivider}
              style={{ left: `${splitPos}%` }}
              onPointerDown={handlePointerDown}
              title="Drag or use Left/Right arrow keys to compare before and after"
              role="separator"
              tabIndex={0}
              aria-label="Video comparison split position"
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

            <span className={`${styles.labelBadge} ${styles.labelBefore}`}>
              Original (Before)
            </span>
            <span className={`${styles.labelBadge} ${styles.labelAfter}`}>
              Cleaned (After)
            </span>
          </div>
        ) : (
          /* Side by side view */
          <div className={styles.sideBySide}>
            <div className={styles.sideCard}>
              <span className={styles.sideHeader}>Original Video</span>
              <video
                ref={origVideoRef}
                src={videoState.objectUrl}
                className={styles.sideVideo}
                playsInline
                loop
                muted
              />
            </div>

            <div className={styles.sideCard}>
              <span className={styles.sideHeader}>Cleaned Video (Telea FMM)</span>
              <video
                ref={procVideoRef}
                src={processedVideo.objectUrl}
                className={styles.sideVideo}
                playsInline
                loop
                muted
              />
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Playback Control */}
      <div className={styles.controlsBar}>
        <button
          type="button"
          className={styles.modeButton}
          onClick={togglePlay}
          title={isPlaying ? 'Pause both videos' : 'Play both videos'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          <span>{isPlaying ? 'Pause Comparison' : 'Play Comparison'}</span>
        </button>

        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Duration: {videoState.duration.toFixed(2)}s • Resolution: {videoState.width} × {videoState.height} px
        </span>
      </div>
    </div>
  );
};
