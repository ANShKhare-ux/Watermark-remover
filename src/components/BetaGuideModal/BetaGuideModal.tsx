import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Sparkles,
  FileCheck2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import styles from './BetaGuideModal.module.css';

export interface BetaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BetaGuideModal: React.FC<BetaGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'workflow' | 'limits' | 'provenance' | 'troubleshooting'>('workflow');
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('clearframe_beta_guide_dismissed', 'true');
      } catch {
        // LocalStorage fallback
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-guide-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <HelpCircle size={20} className={styles.titleIcon} />
            <div className={styles.titleText}>
              <div className={styles.title} id="beta-guide-title">
                <span>ClearFrame Beta User Guide</span>
                <Badge tone="warning">Controlled Beta</Badge>
              </div>
              <span className={styles.subtitle}>
                Everything you need to test visible watermark cleanup and provenance inspection
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleDismiss}
            aria-label="Close guide"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.navTabs} role="tablist">
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'workflow' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            <Sparkles size={13} />
            <span>Core Workflows</span>
          </button>

          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'limits' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('limits')}
          >
            <Info size={13} />
            <span>Formats & Limits</span>
          </button>

          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'provenance' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('provenance')}
          >
            <FileCheck2 size={13} />
            <span>Provenance & Privacy</span>
          </button>

          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'troubleshooting' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('troubleshooting')}
          >
            <AlertTriangle size={13} />
            <span>Troubleshooting</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {activeTab === 'workflow' && (
            <div className={styles.section}>
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Import Media or Load Sample</span>
                  <span className={styles.stepDescription}>
                    Drag and drop your file or use the sample buttons on the upload screen to load instant test media (including watermarked photos and 3s 720p test clips).
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Paint Visible Watermark Selection</span>
                  <span className={styles.stepDescription}>
                    Use the Brush tool with adjustable diameter to highlight visible stamps, corner logos, or text overlays. Use Eraser, Undo (Ctrl+Z), and Redo (Ctrl+Y) to refine.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Apply Inpainting (Alexandru Telea FMM)</span>
                  <span className={styles.stepDescription}>
                    Click <strong>Inpaint (Telea)</strong>. OpenCV.js reconstructs the masked pixels by propagating surrounding color gradients. For videos, every frame is processed sequentially and reassembled with FFmpeg WebAssembly.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Inspect Before & After Comparison</span>
                  <span className={styles.stepDescription}>
                    Drag the interactive split slider or switch to side-by-side mode to verify that unmasked pixels are 100% preserved and clean. Keyboard Left/Right arrows also control the divider.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>5</div>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Export or Guardrails Verification</span>
                  <span className={styles.stepDescription}>
                    Download your cleaned file at native resolution. If an imported image contains C2PA cryptographic credentials or EXIF metadata, export is disabled to prevent accidental metadata stripping.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>
                <Cpu size={14} />
                Beta Media Constraints
              </span>

              <div className={styles.tableWrapper}>
                <table className={styles.specTable}>
                  <thead>
                    <tr>
                      <th>Media Type</th>
                      <th>Supported Formats</th>
                      <th>Resolution Ceiling</th>
                      <th>Duration Limit</th>
                      <th>File Size Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Image</strong></td>
                      <td>JPEG, PNG, WebP</td>
                      <td>Up to 36 Megapixels</td>
                      <td>N/A</td>
                      <td>50 MB</td>
                    </tr>
                    <tr>
                      <td><strong>Video</strong></td>
                      <td>MP4 (H.264), WebM (VP8/VP9)</td>
                      <td>Up to 720p (1280×720)</td>
                      <td>5.0 seconds (Beta MVP)</td>
                      <td>50 MB</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.noticeBox}>
                <Info size={16} className={styles.noticeIcon} />
                <div>
                  <strong>Browser Compatibility:</strong> Requires a modern browser supporting WebAssembly and HTML5 Canvas (Chrome 90+, Edge 90+, Firefox 90+, Safari 16.4+). Mobile devices should run iOS 16.4+ or Android Chrome 90+.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'provenance' && (
            <div className={styles.section}>
              <div className={styles.noticeBox} style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>100% Client-Side Sandbox:</strong> ClearFrame processes all pixels, audio tracks, and metadata entirely within your browser. No files or personal data are ever uploaded to any external server.
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>C2PA & Provenance Transparency</span>
                  <span className={styles.stepDescription}>
                    ClearFrame audits Content Credentials using the official C2PA WebAssembly SDK. It discloses manifest validity, signing tool, and issuer, without fabricating false credentials.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>No Invisible Watermark Removal</span>
                  <span className={styles.stepDescription}>
                    ClearFrame is designed solely for visible overlay cleanup on media you own or are authorized to edit. It does not tamper with Google SynthID, Digimarc, or cryptographic provenance seals.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Export Safety Protection</span>
                  <span className={styles.stepDescription}>
                    Images with detected camera metadata or C2PA provenance cannot be exported directly, preventing accidental or silent stripping of creator attribution.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'troubleshooting' && (
            <div className={styles.section}>
              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>OpenCV Engine Loading</span>
                  <span className={styles.stepDescription}>
                    OpenCV WebAssembly loads asynchronously. If the inpaint button is disabled, check the status badge at the bottom of the toolbar. Once loaded, the badge turns green.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Video Inpainting Boundary Artifacts</span>
                  <span className={styles.stepDescription}>
                    The Phase 3/7 video MVP uses a stationary 2D mask. If high-contrast moving objects pass behind the watermark, edge color smearing can occur. For best results, use clips where the background behind the watermark is relatively stable.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Video Job Cancellation</span>
                  <span className={styles.stepDescription}>
                    You can safely cancel an in-flight video inpainting job at any time using the <strong>Cancel Job</strong> button in the right sidebar. Temporary frames will be purged immediately.
                  </span>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepContent}>
                  <span className={styles.stepHeading}>Exceeding File Limits</span>
                  <span className={styles.stepDescription}>
                    Files larger than 50MB, images larger than 36MP, or videos exceeding 5 seconds or 720p will be rejected with clear explanatory messages to prevent browser tab crashes.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles.footer}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            <span>Don't show automatically on startup</span>
          </label>

          <button
            type="button"
            className={styles.dismissButton}
            onClick={handleDismiss}
          >
            Got it, let's test
          </button>
        </div>
      </div>
    </div>
  );
};
