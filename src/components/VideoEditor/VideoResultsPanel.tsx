import React from 'react';
import {
  Download,
  RotateCcw,
  ShieldAlert,
  Info,
  Clock,
  Activity,
  Layers,
  StopCircle,
  Video,
  FileVideo,
} from 'lucide-react';
import type {
  VideoFileState,
  ProcessedVideoState,
  VideoProcessingProgress,
} from '../../types';
import { Badge } from '../common/Badge';
import styles from './VideoResultsPanel.module.css';

export interface VideoResultsPanelProps {
  videoState: VideoFileState;
  processedVideo: ProcessedVideoState | null;
  progress: VideoProcessingProgress | null;
  isProcessing: boolean;
  onCancelProcessing: () => void;
  onResetToOriginal: () => void;
  onExportVideo: () => void;
  onResetVideo?: () => void;
}

export const VideoResultsPanel: React.FC<VideoResultsPanelProps> = ({
  videoState,
  processedVideo,
  progress,
  isProcessing,
  onCancelProcessing,
  onResetToOriginal,
  onExportVideo,
  onResetVideo,
}) => {
  return (
    <div className={styles.panel}>
      {/* Active Processing Status Card */}
      {isProcessing && progress && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Activity size={13} />
              Video Inpainting Pipeline
            </span>
            <Badge tone="warning" withDot>
              Processing
            </Badge>
          </div>

          <div className={styles.progressCard}>
            <div className={styles.progressTop}>
              <span>{progress.message}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {progress.percent}%
              </span>
            </div>

            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {progress.currentFrame && progress.totalFrames ? (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                }}
              >
                <span>Frame processing:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {progress.currentFrame} / {progress.totalFrames}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancelProcessing}
            >
              <StopCircle size={13} />
              <span>Cancel Job</span>
            </button>
          </div>
        </section>
      )}

      {/* Source Video Clip Specs */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <FileVideo size={13} />
            Source Video Specs
          </span>
          <Badge tone="neutral">Local File</Badge>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Resolution</span>
            <span className={styles.metricValue}>
              {videoState.width} × {videoState.height}
            </span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Duration</span>
            <span className={styles.metricValue}>
              {videoState.duration.toFixed(1)}s
            </span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Frame Rate</span>
            <span className={styles.metricValue}>
              {videoState.frameRate} fps
            </span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Audio Track</span>
            <span className={styles.metricValue}>
              {videoState.hasAudio ? 'Detected' : 'None'}
            </span>
          </div>
        </div>
      </section>

      {/* Processed Results Card */}
      {processedVideo ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Layers size={13} />
              Processed Results
            </span>
            <Badge tone="success" withDot>
              Complete
            </Badge>
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Algorithm</span>
              <span className={styles.metricValue}>Telea (FMM)</span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Compute Time</span>
              <span className={styles.metricValue}>
                <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                {(processedVideo.computeTimeMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Resolution</span>
              <span className={styles.metricValue}>
                {processedVideo.width} × {processedVideo.height}
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Audio Preserved</span>
              <span className={styles.metricValue}>
                {processedVideo.hasAudio ? 'AAC Track' : 'No Audio'}
              </span>
            </div>
          </div>
        </section>
      ) : !isProcessing ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Layers size={13} />
              Video Inpainting Status
            </span>
            <Badge tone="neutral">Ready</Badge>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Scrub to a clear frame, brush over the stationary visible watermark region,
            then click <strong>Inpaint Video (Telea)</strong>.
          </p>
        </section>
      ) : null}

      {/* Honest Technical Disclosure for Video Inpainting */}
      <section className={styles.section}>
        <div className={styles.technicalNotice}>
          <div className={styles.noticeTitle}>
            <Info size={13} />
            <span>Fixed-Region Inpainting Notice</span>
          </div>
          <p>
            This Phase 3 MVP applies a manually selected, fixed 2D mask consistently
            across each frame using Alexandru Telea’s Fast Marching Method.
          </p>
          <p style={{ marginTop: '6px', color: 'var(--text-tertiary)' }}>
            <strong>Boundaries & Artifacts:</strong> Fixed-region cleanup is designed
            for stationary overlays (corner logos, timestamp stamps). It does not
            track moving watermarks, and can produce visual smearing or boundary
            artifacts when high-contrast moving objects pass behind the selected area.
          </p>
        </div>
      </section>

      {/* Provenance & Export Controls */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Video size={13} />
            Video Provenance & Export
          </span>
          <Badge tone="neutral">Local Render</Badge>
        </div>

        <div className={styles.exportCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
            <ShieldAlert size={14} color="#f59e0b" />
            <span>Provenance Disclosure</span>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Browser-side H.264 video transcoding generates an uncredentialed output stream.
            ClearFrame does not fabricate C2PA manifests or claim that transcoding
            preserves original Content Credentials.
          </p>

          <button
            type="button"
            className={styles.exportButton}
            onClick={onExportVideo}
            disabled={!processedVideo || isProcessing}
            title={
              !processedVideo
                ? 'Process video frames first to generate an export'
                : 'Download cleaned MP4 video at native resolution'
            }
          >
            <Download size={13} />
            <span>Download Cleaned Video (MP4)</span>
          </button>
        </div>
      </section>

      {/* Reset Actions */}
      <section className={styles.section} style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {processedVideo && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={onResetToOriginal}
            title="Discard processed video and return to editing mode"
          >
            <RotateCcw size={13} />
            <span>Reset to Original Video</span>
          </button>
        )}

        {onResetVideo && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={onResetVideo}
            title="Close this clip and return to upload workspace"
          >
            <RotateCcw size={13} />
            <span>Change Video File</span>
          </button>
        )}
      </section>
    </div>
  );
};
