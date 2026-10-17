import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  FileCheck2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Paintbrush,
  Search,
  Video as VideoIcon,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import type {
  ImageFileState,
  VideoFileState,
  ExifMetadata,
  ProvenanceData,
  StatusNotification,
} from '../../types';
import { validateAndDecodeImage, isFormatSupported } from '../../utils/fileValidation';
import {
  validateAndDecodeVideo,
  isVideoFormatSupported,
} from '../../utils/videoValidation';
import { readImageMetadata } from '../../utils/exifReader';
import {
  calculateAspectRatio,
  calculateMegapixels,
} from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { StatusMessage } from '../StatusMessage/StatusMessage';
import { UploadPanel } from '../UploadPanel/UploadPanel';
import { MediaPreview } from '../MediaPreview/MediaPreview';
import { FileInfoPanel } from '../FileInfoPanel/FileInfoPanel';
import { ProvenancePanel } from '../ProvenancePanel/ProvenancePanel';
import { BetaGuideModal } from '../BetaGuideModal/BetaGuideModal';
import { FeedbackModal } from '../FeedbackModal/FeedbackModal';
import styles from './AppShell.module.css';

const ImageEditor = React.lazy(() =>
  import('../ImageEditor/ImageEditor').then((m) => ({ default: m.ImageEditor }))
);
const VideoEditor = React.lazy(() =>
  import('../VideoEditor/VideoEditor').then((m) => ({ default: m.VideoEditor }))
);

const EditorLoadingFallback: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      gap: '12px',
      color: 'var(--text-secondary)',
      backgroundColor: 'var(--bg-app)',
    }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        border: '2px solid var(--border-default)',
        borderTopColor: 'var(--text-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <span style={{ fontSize: '13px', fontWeight: 500 }}>{message}</span>
  </div>
);

export const AppShell: React.FC = () => {
  const [imageState, setImageState] = useState<ImageFileState | null>(null);
  const [videoState, setVideoState] = useState<VideoFileState | null>(null);
  const [exifMetadata, setExifMetadata] = useState<ExifMetadata | null>(null);
  const [provenanceData, setProvenanceData] = useState<ProvenanceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<StatusNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'provenance'>('details');
  const [appMode, setAppMode] = useState<'editor' | 'inspect'>('editor');
  const [showBetaGuide, setShowBetaGuide] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('clearframe_beta_guide_dismissed');
    } catch {
      return false;
    }
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);

  // Track active Object URLs for clean revocation
  const activeImageUrlRef = useRef<string | null>(null);
  const activeVideoUrlRef = useRef<string | null>(null);

  const addNotification = useCallback(
    (
      type: StatusNotification['type'],
      title: string,
      message: string
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setNotifications((prev) => [
        ...prev.slice(-2), // Keep at most 3 notifications at once
        { id, type, title, message, dismissible: true },
      ]);
    },
    []
  );

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearActiveMedia = useCallback(() => {
    if (activeImageUrlRef.current) {
      URL.revokeObjectURL(activeImageUrlRef.current);
      activeImageUrlRef.current = null;
    }
    if (activeVideoUrlRef.current) {
      URL.revokeObjectURL(activeVideoUrlRef.current);
      activeVideoUrlRef.current = null;
    }
    setImageState(null);
    setVideoState(null);
    setExifMetadata(null);
    setProvenanceData(null);
    setAppMode('editor');
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeImageUrlRef.current) {
        URL.revokeObjectURL(activeImageUrlRef.current);
      }
      if (activeVideoUrlRef.current) {
        URL.revokeObjectURL(activeVideoUrlRef.current);
      }
    };
  }, []);

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);

    // Route 1: Video File
    if (isVideoFormatSupported(file)) {
      try {
        const validation = await validateAndDecodeVideo(file);
        if (!validation.valid) {
          setIsLoading(false);
          addNotification('error', 'Video Validation Error', validation.error);
          return;
        }

        // Clean up previously active media
        if (activeImageUrlRef.current) {
          URL.revokeObjectURL(activeImageUrlRef.current);
          activeImageUrlRef.current = null;
        }
        if (activeVideoUrlRef.current) {
          URL.revokeObjectURL(activeVideoUrlRef.current);
          activeVideoUrlRef.current = null;
        }

        const objectUrl = URL.createObjectURL(file);
        activeVideoUrlRef.current = objectUrl;

        const aspectRatio = calculateAspectRatio(validation.width, validation.height);

        const newVideoState: VideoFileState = {
          file,
          objectUrl,
          name: file.name,
          size: file.size,
          type: file.type || 'video/mp4',
          width: validation.width,
          height: validation.height,
          duration: validation.duration,
          frameRate: validation.frameRate,
          hasAudio: validation.hasAudio,
          aspectRatio,
          loadedAt: Date.now(),
        };

        setImageState(null);
        setExifMetadata(null);
        setProvenanceData(null);
        setVideoState(newVideoState);
        setAppMode('editor');

        addNotification(
          'success',
          'Video Loaded',
          `Loaded ${file.name} (${validation.width}×${validation.height}, ${validation.duration.toFixed(1)}s, ${validation.frameRate} fps). Draw a fixed watermark mask to clean up.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to decode video';
        addNotification('error', 'Video Import Error', msg);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Route 2: Image File
    if (isFormatSupported(file)) {
      try {
        const validation = await validateAndDecodeImage(file);
        if (!validation.valid) {
          setIsLoading(false);
          addNotification('error', 'Image Validation Error', validation.error);
          return;
        }

        // Clean up previously active media
        if (activeImageUrlRef.current) {
          URL.revokeObjectURL(activeImageUrlRef.current);
          activeImageUrlRef.current = null;
        }
        if (activeVideoUrlRef.current) {
          URL.revokeObjectURL(activeVideoUrlRef.current);
          activeVideoUrlRef.current = null;
        }

        const objectUrl = URL.createObjectURL(file);
        activeImageUrlRef.current = objectUrl;

        const width = validation.width;
        const height = validation.height;
        const aspectRatio = calculateAspectRatio(width, height);
        const megapixels = calculateMegapixels(width, height);

        const newImageState: ImageFileState = {
          file,
          objectUrl,
          name: file.name,
          size: file.size,
          type: file.type || 'image/unknown',
          width,
          height,
          aspectRatio,
          megapixels,
          loadedAt: Date.now(),
        };

        const extracted = await readImageMetadata(file);
        setVideoState(null);
        setImageState(newImageState);
        setExifMetadata(extracted.exif);
        setProvenanceData(extracted.provenance);
        setAppMode('editor');

        addNotification(
          'success',
          'Image Loaded',
          `Successfully loaded ${file.name} (${width} × ${height} px). Brush over visible watermarks to inpaint.`
        );
      } catch {
        addNotification(
          'warning',
          'Partial Metadata',
          'Image decoded, but metadata extraction encountered an issue.'
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Route 3: Unsupported media
    setIsLoading(false);
    addNotification(
      'error',
      'Unsupported File Format',
      `ClearFrame supports images (JPEG, PNG, WebP) and short clips (MP4, WebM up to 5s/720p).`
    );
  };

  const hasMedia = Boolean(imageState || videoState);

  return (
    <div className={styles.container}>
      {/* Notifications overlay */}
      {notifications.length > 0 && (
        <div className={styles.notificationArea}>
          {notifications.map((notif) => (
            <StatusMessage
              key={notif.id}
              notification={notif}
              onDismiss={dismissNotification}
            />
          ))}
        </div>
      )}

      {/* Top Application Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>CF</div>
          <div className={styles.brandText}>
            <div className={styles.brandName}>
              <span>ClearFrame</span>
              <Badge tone="neutral">
                {videoState ? 'Phase 3 Video MVP' : 'Phase 2 Editor'}
              </Badge>
            </div>
            <span className={styles.brandTagline}>
              AI Media Cleanup & Provenance Management
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* Mode Switcher when image is loaded */}
          {imageState && (
            <div className={styles.modeSwitcher} role="tablist">
              <button
                type="button"
                className={`${styles.modeSwitchButton} ${
                  appMode === 'editor' ? styles.modeSwitchActive : ''
                }`}
                onClick={() => setAppMode('editor')}
                title="Visible Watermark Cleanup Editor with Telea Inpainting"
              >
                <Paintbrush size={13} />
                <span>Cleanup Editor</span>
              </button>

              <button
                type="button"
                className={`${styles.modeSwitchButton} ${
                  appMode === 'inspect' ? styles.modeSwitchActive : ''
                }`}
                onClick={() => setAppMode('inspect')}
                title="Inspect EXIF and Provenance Credentials"
              >
                <Search size={13} />
                <span>Inspect & Provenance</span>
              </button>
            </div>
          )}

          {videoState && (
            <div className={styles.modeSwitcher} role="tablist">
              <div
                className={`${styles.modeSwitchButton} ${styles.modeSwitchActive}`}
                title="Video Inpainting & Processing Active"
              >
                <VideoIcon size={13} />
                <span>Video Cleanup (MVP)</span>
              </div>
            </div>
          )}

          <div className={styles.privacyBadge}>
            <ShieldCheck size={13} color="#10b981" />
            <span>Client Sandbox • Zero Telemetry</span>
          </div>

          <button
            type="button"
            className={styles.headerButton}
            onClick={() => setShowBetaGuide(true)}
            title="Open ClearFrame Beta Guide & System Limits"
          >
            <HelpCircle size={13} />
            <span>Beta Guide</span>
          </button>

          <button
            type="button"
            className={styles.headerButton}
            onClick={() => setShowFeedbackModal(true)}
            title="Submit bug report or feedback"
          >
            <MessageSquare size={13} />
            <span>Feedback</span>
          </button>

          {hasMedia && (
            <button
              type="button"
              className={styles.headerButton}
              onClick={clearActiveMedia}
              title="Reset media workspace"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className={styles.main}>
        {!hasMedia ? (
          <div className={styles.uploadWorkspace}>
            <UploadPanel
              onFileSelected={handleProcessFile}
              isLoading={isLoading}
            />
          </div>
        ) : videoState ? (
          /* Phase 3: Video Cleanup MVP Workspace */
          <React.Suspense fallback={<EditorLoadingFallback message="Loading video editor suite…" />}>
            <VideoEditor
              key={`video-editor-${videoState.objectUrl}`}
              videoState={videoState}
              onNotification={addNotification}
              onResetVideo={clearActiveMedia}
            />
          </React.Suspense>
        ) : appMode === 'editor' && imageState ? (
          /* Phase 2: Functional Image Cleanup Editor */
          <React.Suspense fallback={<EditorLoadingFallback message="Loading image cleanup editor…" />}>
            <ImageEditor
              key={`editor-${imageState.objectUrl}`}
              imageState={imageState}
              exif={exifMetadata}
              provenance={provenanceData}
              onNotification={addNotification}
              onResetImage={clearActiveMedia}
            />
          </React.Suspense>
        ) : imageState ? (
          /* Phase 1: Inspection & Provenance Workspace */
          <div className={styles.inspectionWorkspace}>
            {/* Center / Left: Interactive Media Preview Canvas */}
            <div className={styles.previewPane}>
              <MediaPreview
                key={`preview-${imageState.objectUrl}`}
                imageState={imageState}
                onReplaceImage={handleProcessFile}
                onClearImage={clearActiveMedia}
              />
            </div>

            {/* Right: Inspector Sidebar */}
            <aside className={styles.inspectorPane}>
              <div className={styles.inspectorTabs}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${
                    activeTab === 'details' ? styles.tabActive : ''
                  }`}
                  onClick={() => setActiveTab('details')}
                >
                  <FileText size={13} />
                  <span>File & EXIF</span>
                </button>

                <button
                  type="button"
                  className={`${styles.tabButton} ${
                    activeTab === 'provenance' ? styles.tabActive : ''
                  }`}
                  onClick={() => setActiveTab('provenance')}
                >
                  <FileCheck2 size={13} />
                  <span>Provenance & AI</span>
                  {provenanceData?.aiLabels.status === 'detected' && (
                    <Badge tone="warning">AI</Badge>
                  )}
                </button>
              </div>

              <div className={styles.inspectorContent}>
                {activeTab === 'details' && exifMetadata && (
                  <FileInfoPanel imageState={imageState} exif={exifMetadata} />
                )}

                {activeTab === 'provenance' && provenanceData && (
                  <ProvenancePanel provenance={provenanceData} />
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </main>

      {/* Bottom Status Bar */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.statusIndicator}>
            <span
              className={styles.statusDot}
              style={{
                backgroundColor: isLoading
                  ? 'var(--tone-warning)'
                  : hasMedia
                  ? 'var(--tone-success)'
                  : 'var(--text-tertiary)',
              }}
            />
            <span>
              {isLoading
                ? 'Validating and decoding media file…'
                : videoState
                ? `Active Video: ${videoState.name} (${videoState.width} × ${videoState.height} px, ${videoState.duration.toFixed(1)}s, ${videoState.frameRate} fps, ${
                    videoState.hasAudio ? 'Audio: Present' : 'No Audio'
                  })`
                : imageState
                ? `Active Image: ${imageState.name} (${imageState.width} × ${imageState.height} px) • Mode: ${
                    appMode === 'editor' ? 'Cleanup Editor' : 'Metadata Inspection'
                  }`
                : 'Ready for media inspection & visible watermark cleanup'}
            </span>
          </div>
        </div>

        <div className={styles.footerRight}>
          <span>OpenCV.js (Telea FMM)</span>
          <span>•</span>
          <span>FFmpeg Wasm Core (Local)</span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} />
            <span>ClearFrame v0.1.0-rc</span>
          </span>
        </div>
      </footer>

      {/* Beta Onboarding Guide & Feedback Modals */}
      <BetaGuideModal
        isOpen={showBetaGuide}
        onClose={() => setShowBetaGuide(false)}
      />
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onNotification={addNotification}
      />
    </div>
  );
};
