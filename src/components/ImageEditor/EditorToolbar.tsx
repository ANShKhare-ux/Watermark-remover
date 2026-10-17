import React from 'react';
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  Cpu,
} from 'lucide-react';
import type { BrushTool } from '../../types';
import styles from './EditorToolbar.module.css';

export interface EditorToolbarProps {
  activeTool: BrushTool;
  onSelectTool: (tool: BrushTool) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  inpaintRadius: number;
  onChangeInpaintRadius: (radius: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearMask: () => void;
  maskVisible: boolean;
  onToggleMaskVisibility: () => void;
  hasMask: boolean;
  isOpenCvReady: boolean;
  isProcessing: boolean;
  onExecuteInpaint: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeTool,
  onSelectTool,
  brushSize,
  onChangeBrushSize,
  inpaintRadius,
  onChangeInpaintRadius,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearMask,
  maskVisible,
  onToggleMaskVisibility,
  hasMask,
  isOpenCvReady,
  isProcessing,
  onExecuteInpaint,
}) => {
  return (
    <aside className={styles.toolbar} aria-label="Editor Drawing and Inpainting Tools">
      {/* Primary Cleanup Action */}
      <div className={styles.section}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primaryAction}`}
          onClick={onExecuteInpaint}
          disabled={!hasMask || !isOpenCvReady || isProcessing}
          title={
            !isOpenCvReady
              ? 'OpenCV WebAssembly is initializing…'
              : !hasMask
              ? 'Brush over the visible watermark region first'
              : 'Execute Telea inpainting on selected region'
          }
        >
          {isProcessing ? (
            <>
              <Loader2 size={15} className={styles.spinner} />
              <span>Inpainting…</span>
            </>
          ) : (
            <>
              <Sparkles size={15} color="#e11d48" />
              <span>Inpaint (Telea)</span>
            </>
          )}
        </button>
      </div>

      {/* Drawing Tools */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Selection Tools</span>
        <div className={styles.toolsGrid}>
          <button
            type="button"
            className={`${styles.toolButton} ${
              activeTool === 'brush' ? styles.toolButtonActive : ''
            }`}
            onClick={() => onSelectTool('brush')}
            title="Brush Tool (Paint watermark region)"
          >
            <Paintbrush size={14} />
            <span>Brush</span>
          </button>

          <button
            type="button"
            className={`${styles.toolButton} ${
              activeTool === 'eraser' ? styles.toolButtonActive : ''
            }`}
            onClick={() => onSelectTool('eraser')}
            title="Eraser Tool (Erase selection mask)"
          >
            <Eraser size={14} />
            <span>Eraser</span>
          </button>
        </div>
      </div>

      {/* Brush Size Slider */}
      <div className={styles.section}>
        <div className={styles.sliderGroup}>
          <div className={styles.sliderHeader}>
            <span>Brush Diameter</span>
            <span className={styles.sliderValue}>{brushSize} px</span>
          </div>
          <input
            type="range"
            min={4}
            max={80}
            value={brushSize}
            onChange={(e) => onChangeBrushSize(Number(e.target.value))}
            className={styles.slider}
            aria-label="Brush diameter in pixels"
          />
        </div>
      </div>

      {/* Inpainting Neighborhood Radius */}
      <div className={styles.section}>
        <div className={styles.sliderGroup}>
          <div className={styles.sliderHeader}>
            <span title="Neighborhood radius around inpainting border used by the Telea method">
              Telea Radius
            </span>
            <span className={styles.sliderValue}>{inpaintRadius} px</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={inpaintRadius}
            onChange={(e) => onChangeInpaintRadius(Number(e.target.value))}
            className={styles.slider}
            aria-label="Telea inpainting radius in pixels"
          />
        </div>
      </div>

      {/* Mask & History Actions */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Mask Operations</span>

        <div className={styles.historyRow}>
          <button
            type="button"
            className={styles.historyButton}
            onClick={onUndo}
            disabled={!canUndo || isProcessing}
            title="Undo stroke (Ctrl+Z)"
          >
            <Undo2 size={13} />
            <span>Undo</span>
          </button>

          <button
            type="button"
            className={styles.historyButton}
            onClick={onRedo}
            disabled={!canRedo || isProcessing}
            title="Redo stroke (Ctrl+Y)"
          >
            <Redo2 size={13} />
            <span>Redo</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.toggleRow}
          onClick={onToggleMaskVisibility}
          title="Toggle visibility of the mask overlay"
        >
          <span>Show Mask Overlay</span>
          {maskVisible ? <Eye size={14} /> : <EyeOff size={14} color="#f43f5e" />}
        </button>

        <button
          type="button"
          className={`${styles.actionButton} ${styles.secondaryAction}`}
          onClick={onClearMask}
          disabled={!hasMask || isProcessing}
          title="Clear entire selection mask"
        >
          <Trash2 size={13} />
          <span>Clear Selection</span>
        </button>
      </div>

      {/* Engine Status */}
      <div style={{ marginTop: 'auto' }}>
        <div className={styles.engineBadge}>
          <Cpu size={13} />
          <span className={styles.engineDot} />
          <span>
            {isOpenCvReady
              ? 'OpenCV Telea (WASM) Active'
              : 'Initializing OpenCV…'}
          </span>
        </div>
      </div>
    </aside>
  );
};
