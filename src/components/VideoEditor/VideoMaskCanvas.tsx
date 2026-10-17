import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import type { VideoFileState, BrushTool } from '../../types';
import styles from './VideoMaskCanvas.module.css';

export interface VideoMaskCanvasRef {
  getMaskImageData: () => ImageData | null;
  clearMask: () => void;
  restoreMaskImageData: (data: ImageData) => void;
  hasNonZeroPixels: () => boolean;
}

export interface VideoMaskCanvasProps {
  videoState: VideoFileState;
  activeTool: BrushTool;
  brushSize: number;
  maskVisible: boolean;
  onStrokeComplete: (snapshot: ImageData) => void;
  onMaskStatusChange: (hasMask: boolean) => void;
}

export const VideoMaskCanvas = forwardRef<VideoMaskCanvasRef, VideoMaskCanvasProps>(
  (
    {
      videoState,
      activeTool,
      brushSize,
      maskVisible,
      onStrokeComplete,
      onMaskStatusChange,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // Initialize canvas to full native video resolution
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = videoState.width;
      canvas.height = videoState.height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      onMaskStatusChange(false);
    }, [videoState.width, videoState.height, onMaskStatusChange]);

    const checkHasMask = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) return true;
      }
      return false;
    }, []);

    useImperativeHandle(ref, () => ({
      getMaskImageData: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },
      clearMask: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          onMaskStatusChange(false);
        }
      },
      restoreMaskImageData: (data: ImageData) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(data, 0, 0);
          onMaskStatusChange(checkHasMask());
        }
      },
      hasNonZeroPixels: checkHasMask,
    }));

    // Mathematical coordinate mapping from screen coordinates to video source frame
    const getVideoCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      return { x, y };
    };

    const drawLine = (
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.65)';
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);

      const pt = getVideoCoordinates(e);
      lastPointRef.current = pt;
      drawLine(pt, pt);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const cursor = cursorRef.current;
      if (canvas && cursor) {
        const rect = canvas.getBoundingClientRect();
        const displayScale = rect.width / canvas.width;
        const displaySize = Math.max(6, brushSize * displayScale);

        cursor.style.display = 'block';
        cursor.style.width = `${displaySize}px`;
        cursor.style.height = `${displaySize}px`;
        cursor.style.left = `${e.clientX - rect.left}px`;
        cursor.style.top = `${e.clientY - rect.top}px`;
        cursor.style.borderColor =
          activeTool === 'eraser' ? '#f59e0b' : '#f43f5e';
      }

      if (!isDrawing || !lastPointRef.current) return;

      const currentPt = getVideoCoordinates(e);
      drawLine(lastPointRef.current, currentPt);
      lastPointRef.current = currentPt;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      lastPointRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onStrokeComplete(snapshot);
      onMaskStatusChange(checkHasMask());
    };

    const handlePointerLeave = () => {
      if (cursorRef.current) {
        cursorRef.current.style.display = 'none';
      }
      if (isDrawing) {
        setIsDrawing(false);
        lastPointRef.current = null;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            onStrokeComplete(ctx.getImageData(0, 0, canvas.width, canvas.height));
            onMaskStatusChange(checkHasMask());
          }
        }
      }
    };

    return (
      <>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ opacity: maskVisible ? 1 : 0 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
        <div ref={cursorRef} className={styles.cursorRing} />
      </>
    );
  }
);

VideoMaskCanvas.displayName = 'VideoMaskCanvas';
