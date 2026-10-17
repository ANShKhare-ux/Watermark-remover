import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Copy,
  Download,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import styles from './FeedbackModal.module.css';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification?: (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onNotification,
}) => {
  const [category, setCategory] = useState<string>('defect');
  const [summary, setSummary] = useState<string>('');
  const [steps, setSteps] = useState<string>('');
  const [behavior, setBehavior] = useState<string>('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getSystemDiagnostics = () => {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : 'Unknown',
      hasWasm: typeof WebAssembly !== 'undefined',
      hasMediaRecorder: typeof MediaRecorder !== 'undefined',
      timestamp: new Date().toISOString(),
    };
  };

  const generateMarkdownReport = (): string => {
    const diag = getSystemDiagnostics();
    const categoryLabels: Record<string, string> = {
      defect: 'Bug / Unexpected Defect',
      artifact: 'Inpainting Artifact / Smearing',
      video: 'Video Processing or Export Issue',
      browser: 'Browser Compatibility / WebAssembly Crash',
      usability: 'Usability / Feature Suggestion',
    };

    let report = `# ClearFrame Beta Feedback Report\n\n`;
    report += `**Category**: ${categoryLabels[category] || category}\n`;
    report += `**Summary**: ${summary.trim() || 'No summary provided'}\n\n`;

    report += `## Steps to Reproduce\n`;
    report += `${steps.trim() || '1. (Steps not provided)'}\n\n`;

    report += `## Observed vs Expected Behavior\n`;
    report += `${behavior.trim() || 'Not specified'}\n\n`;

    if (includeDiagnostics) {
      report += `## Environment Diagnostics (Anonymous)\n`;
      report += `- **App Version**: ClearFrame v0.1.0-rc1\n`;
      report += `- **User Agent**: \`${diag.userAgent}\`\n`;
      report += `- **Viewport**: ${diag.viewport}\n`;
      report += `- **WebAssembly**: ${diag.hasWasm ? 'Supported' : 'Not Supported'}\n`;
      report += `- **MediaRecorder**: ${diag.hasMediaRecorder ? 'Supported' : 'Not Supported'}\n`;
      report += `- **Timestamp**: ${diag.timestamp}\n`;
      report += `\n*Note: Zero media files, zero image bytes, and zero personal data are included.*`;
    }

    return report;
  };

  const handleCopy = async () => {
    const report = generateMarkdownReport();
    try {
      await navigator.clipboard.writeText(report);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
      onNotification?.(
        'success',
        'Report Copied to Clipboard',
        'You can now paste your feedback into your team issue tracker or GitHub Issues.'
      );
    } catch {
      onNotification?.(
        'warning',
        'Clipboard Notice',
        'Could not access clipboard automatically. Please use the Download button.'
      );
    }
  };

  const handleDownload = () => {
    const report = generateMarkdownReport();
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clearframe-beta-feedback-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onNotification?.(
      'info',
      'Report Downloaded',
      'Saved clearframe-beta-feedback.md to your downloads.'
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <MessageSquare size={19} className={styles.titleIcon} />
            <div className={styles.titleText}>
              <div className={styles.title} id="feedback-dialog-title">
                <span>Beta Feedback & Issue Reporting</span>
                <Badge tone="info">Private & Local</Badge>
              </div>
              <span className={styles.subtitle}>
                Generate a structured, privacy-conscious bug report to share with the developers
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="feedback-category">
              Issue Category
            </label>
            <select
              id="feedback-category"
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="defect">Bug / Unexpected Defect</option>
              <option value="artifact">Inpainting Artifact / Smearing</option>
              <option value="video">Video Processing or Export Issue</option>
              <option value="browser">Browser Compatibility / WebAssembly Crash</option>
              <option value="usability">Usability / Feature Suggestion</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="feedback-summary">
              Summary (One sentence)
            </label>
            <input
              id="feedback-summary"
              type="text"
              className={styles.input}
              placeholder="e.g., Export button stays disabled after inpainting watermarked JPEG"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="feedback-steps">
              Steps to Reproduce
            </label>
            <textarea
              id="feedback-steps"
              className={styles.textarea}
              placeholder="1. Uploaded sample video&#10;2. Painted mask in bottom-right corner&#10;3. Clicked 'Inpaint Video'..."
              rows={3}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="feedback-behavior">
              Observed vs. Expected Behavior
            </label>
            <textarea
              id="feedback-behavior"
              className={styles.textarea}
              placeholder="What did you observe? What did you expect to happen instead?"
              rows={2}
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
            />
          </div>

          {/* Privacy Guarantee & Diagnostics Toggle */}
          <div className={styles.privacyCallout}>
            <label className={styles.privacyCheckLabel}>
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
              />
              <ShieldCheck size={14} color="#10b981" />
              <span>Include anonymous environment diagnostics</span>
            </label>
            <span>
              Includes browser engine name, viewport size, and WebAssembly availability. <strong>Zero filenames, zero image bytes, and zero personal data are included.</strong>
            </span>
            {includeDiagnostics && (
              <div className={styles.sysInfoBox}>
                Browser: {navigator.userAgent.slice(0, 75)}… | Viewport: {window.innerWidth}×{window.innerHeight} | WASM: OK
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Client-side only. No data is sent without your explicit action.
          </span>

          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.downloadButton}
              onClick={handleDownload}
              title="Save formatted markdown report file to disk"
            >
              <Download size={13} />
              <span>Download (.md)</span>
            </button>

            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopy}
              title="Copy formatted markdown report to clipboard"
            >
              {hasCopied ? (
                <>
                  <Check size={13} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Markdown Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
