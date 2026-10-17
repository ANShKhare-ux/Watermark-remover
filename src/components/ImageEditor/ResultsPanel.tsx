import React from 'react';
import {
  Download,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Info,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import type {
  ProcessedImageState,
  ExifMetadata,
  ProvenanceData,
} from '../../types';
import { evaluateExportSafety } from '../../utils/exportSafety';
import { Badge } from '../common/Badge';
import styles from './ResultsPanel.module.css';

export interface ResultsPanelProps {
  processedResult: ProcessedImageState | null;
  exif: ExifMetadata | null;
  provenance: ProvenanceData | null;
  onResetToOriginal: () => void;
  onExportImage: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  processedResult,
  exif,
  provenance,
  onResetToOriginal,
  onExportImage,
}) => {
  const exportSafety = evaluateExportSafety(exif, provenance);

  return (
    <div className={styles.panel}>
      {/* Processing Performance & Telea Metrics */}
      {processedResult ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Activity size={13} />
              Inpainting Execution
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
                {processedResult.computeTimeMs} ms
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Radius</span>
              <span className={styles.metricValue}>
                {processedResult.radius} px
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Mask Pixels</span>
              <span className={styles.metricValue}>
                {processedResult.modifiedPixelCount.toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Layers size={13} />
              Editor Status
            </span>
            <Badge tone="neutral">Ready</Badge>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Select the Brush tool and mark the visible watermark region. Then click{' '}
            <strong>Inpaint (Telea)</strong> to execute reconstruction.
          </p>
        </section>
      )}

      {/* Honest Technical Explanation of Classical Inpainting */}
      <section className={styles.section}>
        <div className={styles.methodExplanation}>
          <div className={styles.methodTitle}>
            <Info size={13} />
            <span>Classical Telea Inpainting Method</span>
          </div>
          <p>
            ClearFrame uses Alexandru Telea’s Fast Marching Method (FMM) implemented
            via OpenCV WebAssembly.
          </p>
          <p style={{ marginTop: '6px', color: 'var(--text-tertiary)' }}>
            <strong>Capabilities & Boundaries:</strong> Pixels inside the mask are
            reconstructed by propagating smooth gradients and geometric edges from
            the surrounding boundary. This works cleanly on uniform backgrounds,
            gradients, and simple lines, but does not invent novel high-frequency
            textures or deep generative structures.
          </p>
        </div>
      </section>

      {/* Provenance & Export Controls */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <ShieldCheck size={13} />
            Provenance & Export Controls
          </span>
          {exportSafety.canExport ? (
            <Badge tone="success">Export Safe</Badge>
          ) : (
            <Badge tone="error" withDot>
              Export Blocked
            </Badge>
          )}
        </div>

        <div
          className={`${styles.exportCard} ${
            exportSafety.canExport
              ? styles.exportCardAllowed
              : styles.exportCardProtected
          }`}
        >
          <div className={styles.exportHeader}>
            <div className={styles.exportTitle}>
              {exportSafety.canExport ? (
                <>
                  <ShieldCheck size={14} color="#10b981" />
                  <span>Provenance-Safe Export</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} color="#ef4444" />
                  <span>Silent Stripping Prevented</span>
                </>
              )}
            </div>
          </div>

          <p className={styles.exportReason}>{exportSafety.reason}</p>

          {exportSafety.blockers.length > 0 && (
            <ul className={styles.blockersList}>
              {exportSafety.blockers.map((blocker, idx) => (
                <li key={idx}>{blocker}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className={styles.exportButton}
            onClick={onExportImage}
            disabled={!exportSafety.canExport || !processedResult}
            title={
              !processedResult
                ? 'Run inpainting first to produce a processed result'
                : !exportSafety.canExport
                ? 'Export disabled to protect media provenance and prevent silent metadata stripping'
                : 'Download cleaned image at source resolution'
            }
          >
            <Download size={13} />
            <span>
              {exportSafety.canExport
                ? 'Download Cleaned Image'
                : 'Export Disabled (Provenance Protected)'}
            </span>
          </button>
        </div>
      </section>

      {/* Reset Workspace Action */}
      {processedResult && (
        <section className={styles.section} style={{ marginTop: 'auto' }}>
          <button
            type="button"
            className={styles.resetButton}
            onClick={onResetToOriginal}
            title="Discard current inpaint result and return to original image"
          >
            <RotateCcw size={13} />
            <span>Reset to Original</span>
          </button>
        </section>
      )}
    </div>
  );
};
