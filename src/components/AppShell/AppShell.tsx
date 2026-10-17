import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  FileCheck2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type {
  ImageFileState,
  ExifMetadata,
  ProvenanceData,
  StatusNotification,
} from '../../types';
import { validateAndDecodeImage } from '../../utils/fileValidation';
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
import styles from './AppShell.module.css';

export const AppShell: React.FC = () => {
  const [imageState, setImageState] = useState<ImageFileState | null>(null);
  const [exifMetadata, setExifMetadata] = useState<ExifMetadata | null>(null);
  const [provenanceData, setProvenanceData] = useState<ProvenanceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<StatusNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'provenance'>('details');

  // Track active Object URL for clean revocation
  const activeUrlRef = useRef<string | null>(null);

  const addNotification = (
    type: StatusNotification['type'],
    title: string,
    message: string
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setNotifications((prev) => [
      ...prev.slice(-2), // Keep at most 3 notifications at once
      { id, type, title, message, dismissible: true },
    ]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearActiveImage = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setImageState(null);
    setExifMetadata(null);
    setProvenanceData(null);
  }, []);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
    };
  }, []);

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);

    // 1. Validate file format, size, and decode real pixel dimensions
    const validation = await validateAndDecodeImage(file);
    if (!validation.valid) {
      setIsLoading(false);
      addNotification('error', 'Validation Error', validation.error);
      return;
    }

    // 2. Revoke any previously active image URL before creating a new one
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }

    // 3. Create fresh Object URL
    const objectUrl = URL.createObjectURL(file);
    activeUrlRef.current = objectUrl;

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

    // 4. Read real EXIF and Provenance data
    try {
      const extracted = await readImageMetadata(file);
      setImageState(newImageState);
      setExifMetadata(extracted.exif);
      setProvenanceData(extracted.provenance);

      addNotification(
        'success',
        'Image Loaded',
        `Successfully inspected ${file.name} (${width} × ${height} px).`
      );
    } catch {
      // Fallback if metadata read throws unexpectedly
      setImageState(newImageState);
      addNotification(
        'warning',
        'Partial Metadata',
        'Image preview decoded, but metadata extraction encountered an issue.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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
              <Badge tone="neutral">Phase 1 Foundation</Badge>
            </div>
            <span className={styles.brandTagline}>
              AI Media Cleanup & Provenance Management
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.privacyBadge}>
            <ShieldCheck size={13} color="#10b981" />
            <span>Client Sandbox • Zero Telemetry</span>
          </div>

          {imageState && (
            <button
              type="button"
              className={styles.headerButton}
              onClick={clearActiveImage}
              title="Reset inspection workspace"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Workspace Area */}
      <main className={styles.main}>
        {!imageState ? (
          <div className={styles.uploadWorkspace}>
            <UploadPanel
              onFileSelected={handleProcessFile}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className={styles.inspectionWorkspace}>
            {/* Center / Left: Interactive Media Preview Canvas */}
            <div className={styles.previewPane}>
              <MediaPreview
                key={imageState.objectUrl}
                imageState={imageState}
                onReplaceImage={handleProcessFile}
                onClearImage={clearActiveImage}
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
        )}
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
                  : imageState
                  ? 'var(--tone-success)'
                  : 'var(--text-tertiary)',
              }}
            />
            <span>
              {isLoading
                ? 'Processing image and reading metadata headers…'
                : imageState
                ? `Inspecting: ${imageState.name} (${imageState.width} × ${imageState.height} px)`
                : 'Ready for image inspection'}
            </span>
          </div>
        </div>

        <div className={styles.footerRight}>
          <span>Format support: JPEG, PNG, WebP</span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} />
            <span>Phase 1: Local Inspection Only</span>
          </span>
        </div>
      </footer>
    </div>
  );
};
