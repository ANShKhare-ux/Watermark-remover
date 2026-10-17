import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Paintbrush,
  Columns,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  ImageFileState,
  ExifMetadata,
  ProvenanceData,
  BrushTool,
  ProcessedImageState,
} from '../../types';
import { getOpenCv, executeInpainting } from '../../services/opencvService';
import { EditorToolbar } from './EditorToolbar';
import { MaskCanvas, type MaskCanvasRef } from './MaskCanvas';
import { ComparisonViewer } from './ComparisonViewer';
import { ResultsPanel } from './ResultsPanel';
import styles from './ImageEditor.module.css';

export interface ImageEditorProps {
  imageState: ImageFileState;
  exif: ExifMetadata | null;
  provenance: ProvenanceData | null;
  onNotification: (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => void;
  onResetImage: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageState,
  exif,
  provenance,
  onNotification,
  onResetImage,
}) => {
  const [activeTool, setActiveTool] = useState<BrushTool>('brush');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [inpaintRadius, setInpaintRadius] = useState<number>(5);
  const [maskVisible, setMaskVisible] = useState<boolean>(true);
  const [hasMask, setHasMask] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'editor' | 'comparison'>('editor');

  const [isOpenCvReady, setIsOpenCvReady] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [openCvError, setOpenCvError] = useState<string | null>(null);

  const [processedResult, setProcessedResult] = useState<ProcessedImageState | null>(null);

  // Undo/Redo stack for mask drawings
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  const maskCanvasRef = useRef<MaskCanvasRef>(null);
  const processedUrlRef = useRef<string | null>(null);

  // Asynchronously initialize OpenCV WebAssembly runtime
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

  // Clean up processed image object URL
  const cleanupProcessedUrl = useCallback(() => {
    if (processedUrlRef.current) {
      URL.revokeObjectURL(processedUrlRef.current);
      processedUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupProcessedUrl();
    };
  }, [cleanupProcessedUrl]);

  // Handle stroke completion: update undo stack
  const handleStrokeComplete = (snapshot: ImageData) => {
    setUndoStack((prev) => {
      const updated = [...prev, snapshot];
      // Limit history to 15 snapshots to conserve browser RAM
      return updated.slice(-15);
    });
    setRedoStack([]);
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !maskCanvasRef.current) return;

    const currentSnapshot = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    setUndoStack(newUndo);
    setRedoStack((prev) => [...prev, currentSnapshot]);

    if (newUndo.length > 0) {
      maskCanvasRef.current.restoreMaskImageData(newUndo[newUndo.length - 1]);
    } else {
      maskCanvasRef.current.clearMask();
    }
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !maskCanvasRef.current) return;

    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, nextSnapshot]);

    maskCanvasRef.current.restoreMaskImageData(nextSnapshot);
  }, [redoStack]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleClearMask = () => {
    if (maskCanvasRef.current) {
      maskCanvasRef.current.clearMask();
      setUndoStack([]);
      setRedoStack([]);
      setHasMask(false);
    }
  };

  // Execute genuine OpenCV Telea Inpainting
  const handleExecuteInpaint = async () => {
    if (!maskCanvasRef.current || !isOpenCvReady || isProcessing) return;

    const maskData = maskCanvasRef.current.getMaskImageData();
    if (!maskData) {
      onNotification('warning', 'Selection Required', 'No mask data found.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Load source image onto offscreen canvas to obtain clean RGBA ImageData
      const offscreen = document.createElement('canvas');
      offscreen.width = imageState.width;
      offscreen.height = imageState.height;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) {
        throw new Error('Failed to create offscreen 2D rendering context.');
      }

      // Draw original source image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image into memory buffer.'));
        img.src = imageState.objectUrl;
      });

      offCtx.drawImage(img, 0, 0, imageState.width, imageState.height);
      const sourceImageData = offCtx.getImageData(0, 0, imageState.width, imageState.height);

      // 2. Execute genuine Telea inpainting via OpenCV
      const result = await executeInpainting(sourceImageData, maskData, {
        radius: inpaintRadius,
        algorithm: 'telea',
      });

      // 3. Put processed pixels back on offscreen canvas and generate blob URL
      offCtx.putImageData(result.outputImageData, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        offscreen.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to encode inpainting result to blob.'));
        }, 'image/png');
      });

      cleanupProcessedUrl();
      const outputUrl = URL.createObjectURL(blob);
      processedUrlRef.current = outputUrl;

      const newProcessedState: ProcessedImageState = {
        objectUrl: outputUrl,
        imageData: result.outputImageData,
        width: result.width,
        height: result.height,
        computeTimeMs: result.computeTimeMs,
        radius: result.radius,
        algorithm: 'telea',
        modifiedPixelCount: result.modifiedPixelCount,
        createdAt: Date.now(),
      };

      setProcessedResult(newProcessedState);
      setActiveView('comparison');

      onNotification(
        'success',
        'Inpainting Complete',
        `Reconstructed ${result.modifiedPixelCount.toLocaleString()} pixels in ${result.computeTimeMs} ms using the Telea Fast Marching Method.`
      );
    } catch (err: any) {
      onNotification(
        'error',
        'Inpainting Failure',
        err?.message || 'An unexpected error occurred during OpenCV inpainting.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToOriginal = () => {
    cleanupProcessedUrl();
    setProcessedResult(null);
    setActiveView('editor');
    handleClearMask();
    onNotification(
      'info',
      'Workspace Reset',
      'Discarded inpainting result and restored unedited original.'
    );
  };

  const handleExportImage = () => {
    if (!processedResult) return;

    // Trigger browser download at source resolution
    const a = document.createElement('a');
    a.href = processedResult.objectUrl;
    const baseName = imageState.name.replace(/\.[^/.]+$/, '');
    a.download = `cleaned_${baseName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onNotification(
      'success',
      'Export Successful',
      `Saved cleaned image at source resolution (${imageState.width} × ${imageState.height} px).`
    );
  };

  return (
    <div className={styles.container}>
      {/* Left Toolbar */}
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
        onToggleMaskVisibility={() => setMaskVisible((prev) => !prev)}
        hasMask={hasMask}
        isOpenCvReady={isOpenCvReady}
        isProcessing={isProcessing}
        onExecuteInpaint={handleExecuteInpaint}
      />

      {/* Main Center Workspace */}
      <div className={styles.centerWorkspace}>
        {/* Top View Selector Bar */}
        <div className={styles.topBar}>
          <div className={styles.viewTabs}>
            <button
              type="button"
              className={`${styles.viewTabButton} ${
                activeView === 'editor' ? styles.viewTabButtonActive : ''
              }`}
              onClick={() => setActiveView('editor')}
              title="Paint watermark selection mask"
            >
              <Paintbrush size={13} />
              <span>Mask Editor</span>
            </button>

            <button
              type="button"
              className={`${styles.viewTabButton} ${
                activeView === 'comparison' ? styles.viewTabButtonActive : ''
              }`}
              onClick={() => setActiveView('comparison')}
              disabled={!processedResult}
              title={
                !processedResult
                  ? 'Execute inpainting first to enable comparison'
                  : 'Compare original and cleaned result'
              }
            >
              <Columns size={13} />
              <span>Comparison View</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Resolution: {imageState.width} × {imageState.height} px
            </span>
            <button
              type="button"
              className={styles.viewTabButton}
              onClick={onResetImage}
              title="Close current asset and return to upload"
            >
              <span>Close Asset</span>
            </button>
          </div>
        </div>

        {/* Workspace Canvas / Comparison */}
        <div className={styles.canvasContainer}>
          {activeView === 'editor' || !processedResult ? (
            <MaskCanvas
              ref={maskCanvasRef}
              imageState={imageState}
              activeTool={activeTool}
              brushSize={brushSize}
              maskVisible={maskVisible}
              onStrokeComplete={handleStrokeComplete}
              onMaskStatusChange={setHasMask}
            />
          ) : (
            <ComparisonViewer
              imageState={imageState}
              processedResult={processedResult}
            />
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className={styles.processingOverlay} role="status" aria-live="assertive">
              <div className={styles.processingCard}>
                <Loader2 size={32} className={styles.spinner} />
                <div style={{ fontWeight: 600 }}>Executing Telea Inpainting…</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Propagating boundary color gradients across selected pixels
                </div>
              </div>
            </div>
          )}

          {/* OpenCV Initialization Failure Banner */}
          {openCvError && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                padding: '10px 16px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 25,
              }}
            >
              <AlertCircle size={16} />
              <span>OpenCV Init Error: {openCvError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Results and Export Controls */}
      <aside className={styles.rightSidebar}>
        <ResultsPanel
          processedResult={processedResult}
          exif={exif}
          provenance={provenance}
          onResetToOriginal={handleResetToOriginal}
          onExportImage={handleExportImage}
        />
      </aside>
    </div>
  );
};
