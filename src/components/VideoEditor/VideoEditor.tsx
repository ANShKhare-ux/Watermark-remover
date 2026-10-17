import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video as VideoIcon,
  Columns,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  VideoFileState,
  BrushTool,
  ProcessedVideoState,
  VideoProcessingProgress,
} from '../../types';
import { getOpenCv } from '../../services/opencvService';
import { processVideoWithInpainting } from '../../services/videoProcessingService';
import { sanitizeFilename } from '../../utils/formatters';
import { EditorToolbar } from '../ImageEditor/EditorToolbar';
import { VideoPlayer } from './VideoPlayer';
import { VideoMaskCanvas, type VideoMaskCanvasRef } from './VideoMaskCanvas';
import { VideoComparisonViewer } from './VideoComparisonViewer';
import { VideoResultsPanel } from './VideoResultsPanel';
import styles from './VideoEditor.module.css';

export interface VideoEditorProps {
  videoState: VideoFileState;
  onNotification: (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => void;
  onResetVideo: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  videoState,
  onNotification,
  onResetVideo,
}) => {
  const [activeTool, setActiveTool] = useState<BrushTool>('brush');
  const [brushSize, setBrushSize] = useState<number>(28);
  const [inpaintRadius, setInpaintRadius] = useState<number>(5);
  const [maskVisible, setMaskVisible] = useState<boolean>(true);
  const [hasMask, setHasMask] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'editor' | 'comparison'>('editor');
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [isOpenCvReady, setIsOpenCvReady] = useState<boolean>(false);
  const [openCvError, setOpenCvError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] =
    useState<VideoProcessingProgress | null>(null);

  const [processedVideo, setProcessedVideo] =
    useState<ProcessedVideoState | null>(null);

  // Undo/Redo stack for mask drawings
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  const maskCanvasRef = useRef<VideoMaskCanvasRef>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const processedUrlRef = useRef<string | null>(null);

  // Initialize OpenCV WebAssembly runtime asynchronously
  useEffect(() => {
    let mounted = true;
    getOpenCv()
      .then(() => {
        if (mounted) {
          setIsOpenCvReady(true);
        }
      })
      .catch((err) => {
        if (mounted) {
          const msg = err?.message || 'Failed to initialize OpenCV runtime';
          setOpenCvError(msg);
          onNotification('error', 'OpenCV Error', msg);
        }
      });

    return () => {
      mounted = false;
    };
  }, [onNotification]);

  // Clean up processed video object URL
  const cleanupProcessedUrl = useCallback(() => {
    if (processedUrlRef.current) {
      URL.revokeObjectURL(processedUrlRef.current);
      processedUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupProcessedUrl();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cleanupProcessedUrl]);

  // Handle stroke completion: update undo stack
  const handleStrokeComplete = (snapshot: ImageData) => {
    setUndoStack((prev) => {
      const updated = [...prev, snapshot];
      if (updated.length > 20) {
        return updated.slice(updated.length - 20);
      }
      return updated;
    });
    setRedoStack([]);
  };

  // Undo operation
  const handleUndo = () => {
    if (undoStack.length === 0 || !maskCanvasRef.current) return;

    const newUndo = [...undoStack];
    const currentSnapshot = newUndo.pop();
    if (!currentSnapshot) return;

    setRedoStack((prev) => [...prev, currentSnapshot]);
    setUndoStack(newUndo);

    if (newUndo.length > 0) {
      const previousSnapshot = newUndo[newUndo.length - 1];
      maskCanvasRef.current.restoreMaskImageData(previousSnapshot);
    } else {
      maskCanvasRef.current.clearMask();
    }
  };

  // Redo operation
  const handleRedo = () => {
    if (redoStack.length === 0 || !maskCanvasRef.current) return;

    const newRedo = [...redoStack];
    const snapshotToRestore = newRedo.pop();
    if (!snapshotToRestore) return;

    setRedoStack(newRedo);
    setUndoStack((prev) => [...prev, snapshotToRestore]);
    maskCanvasRef.current.restoreMaskImageData(snapshotToRestore);
  };

  // Clear mask
  const handleClearMask = () => {
    if (!maskCanvasRef.current) return;
    maskCanvasRef.current.clearMask();
    setUndoStack([]);
    setRedoStack([]);
  };

  // Cancel processing
  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsProcessing(false);
      setProcessingProgress(null);
      onNotification('info', 'Processing Cancelled', 'Video processing job was cancelled.');
    }
  };

  // Execute Video Inpainting Pipeline
  const handleExecuteInpaint = async () => {
    if (!hasMask || !maskCanvasRef.current || isProcessing) return;

    const maskImageData = maskCanvasRef.current.getMaskImageData();
    if (!maskImageData) {
      onNotification('warning', 'Empty Selection', 'Please mark the watermark region first.');
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsProcessing(true);
    setProcessingProgress({
      phase: 'extracting',
      percent: 0,
      currentFrame: 0,
      totalFrames: 0,
      fps: videoState.frameRate || 24,
      message: 'Initializing video cleanup pipeline…',
    });

    try {
      const result = await processVideoWithInpainting({
        videoState,
        maskImageData,
        inpaintRadius,
        onProgress: (p: VideoProcessingProgress) => {
          setProcessingProgress(p);
        },
        signal: abortController.signal,
      });

      cleanupProcessedUrl();
      processedUrlRef.current = result.objectUrl;
      setProcessedVideo(result);
      setActiveView('comparison');

      onNotification(
        'success',
        'Video Inpainting Complete',
        `Cleaned ${result.totalFramesProcessed || 0} frames in ${(result.computeTimeMs / 1000).toFixed(1)}s.`
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        // Aborted by user
        return;
      }
      const msg = err instanceof Error ? err.message : 'Video processing failed';
      onNotification('error', 'Processing Error', msg);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Reset to original (clears processed video and returns to editor)
  const handleResetToOriginal = () => {
    cleanupProcessedUrl();
    setProcessedVideo(null);
    setActiveView('editor');
  };

  // Export processed video file to disk
  const handleExportVideo = () => {
    if (!processedVideo) return;
    const a = document.createElement('a');
    a.href = processedVideo.objectUrl;
    const safeBaseName = sanitizeFilename(videoState.file.name, 'video');
    a.download = `${safeBaseName}-cleaned.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onNotification(
      'info',
      'Download Started',
      `Exporting cleaned MP4 video (${(((processedVideo.fileSizeBytes || 0)) / (1024 * 1024)).toFixed(1)} MB)`
    );
  };

  return (
    <div className={styles.container}>
      {/* Left Toolbar for drawing & inpaint triggers */}
      <EditorToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        brushSize={brushSize}
        onChangeBrushSize={setBrushSize}
        inpaintRadius={inpaintRadius}
        onChangeInpaintRadius={setInpaintRadius}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearMask={handleClearMask}
        maskVisible={maskVisible}
        onToggleMaskVisibility={() => setMaskVisible((v) => !v)}
        hasMask={hasMask}
        isOpenCvReady={isOpenCvReady}
        isProcessing={isProcessing}
        onExecuteInpaint={handleExecuteInpaint}
      />

      {/* Main Workspace Area */}
      <main className={styles.centerWorkspace}>
        {/* Top View Selector Bar */}
        <div className={styles.topBar}>
          <div className={styles.viewTabs}>
            <button
              type="button"
              className={`${styles.viewTabButton} ${
                activeView === 'editor' ? styles.viewTabButtonActive : ''
              }`}
              onClick={() => setActiveView('editor')}
            >
              <VideoIcon size={14} />
              <span>Video Canvas & Selection</span>
            </button>

            <button
              type="button"
              className={`${styles.viewTabButton} ${
                activeView === 'comparison' ? styles.viewTabButtonActive : ''
              }`}
              onClick={() => setActiveView('comparison')}
              disabled={!processedVideo}
              title={
                !processedVideo
                  ? 'Run inpainting first to inspect comparison'
                  : 'Compare original vs. cleaned video'
              }
            >
              <Columns size={14} />
              <span>Before & After Compare</span>
            </button>
          </div>

          <div>
            {!isOpenCvReady && !openCvError && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Loader2 size={12} className={styles.spinner} />
                OpenCV Wasm loading…
              </span>
            )}
            {openCvError && (
              <span style={{ fontSize: '11px', color: 'var(--accent-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
                OpenCV Failed
              </span>
            )}
          </div>
        </div>

        {/* Viewport: either Player + Mask Canvas or Comparison Viewer */}
        <div className={styles.viewportContainer}>
          {activeView === 'editor' ? (
            <VideoPlayer
              videoState={videoState}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
            >
              <VideoMaskCanvas
                ref={maskCanvasRef}
                videoState={videoState}
                activeTool={activeTool}
                brushSize={brushSize}
                maskVisible={maskVisible}
                onStrokeComplete={handleStrokeComplete}
                onMaskStatusChange={setHasMask}
              />
            </VideoPlayer>
          ) : processedVideo ? (
            <VideoComparisonViewer
              videoState={videoState}
              processedVideo={processedVideo}
            />
          ) : null}
        </div>
      </main>

      {/* Right Sidebar: Results, Progress, Metadata & Safeguards */}
      <aside className={styles.rightSidebar}>
        <VideoResultsPanel
          videoState={videoState}
          processedVideo={processedVideo}
          progress={processingProgress}
          isProcessing={isProcessing}
          onCancelProcessing={handleCancelProcessing}
          onResetToOriginal={handleResetToOriginal}
          onExportVideo={handleExportVideo}
          onResetVideo={onResetVideo}
        />
      </aside>
    </div>
  );
};
