import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { VideoFileState } from '../../types';
import styles from './VideoPlayer.module.css';

export interface VideoPlayerProps {
  videoState: VideoFileState;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  children?: React.ReactNode;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoState,
  currentTime,
  onTimeUpdate,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  // Format seconds to mm:ss.ms
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '00:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // Extract filmstrip thumbnails
  useEffect(() => {
    let active = true;
    const offscreenVideo = document.createElement('video');
    const offCanvas = document.createElement('canvas');

    const generateFilmstrip = async () => {
      const thumbCount = 6;
      offscreenVideo.src = videoState.objectUrl;
      offscreenVideo.muted = true;
      offscreenVideo.playsInline = true;

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3000);
        offscreenVideo.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        offscreenVideo.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      offCanvas.width = 160;
      offCanvas.height = 90;
      const ctx = offCanvas.getContext('2d');
      if (!ctx || !active) return;

      const generated: string[] = [];
      const duration = videoState.duration;

      for (let i = 0; i < thumbCount; i++) {
        if (!active) return;
        const targetTime = (i / (thumbCount - 1 || 1)) * Math.max(0, duration - 0.05);
        offscreenVideo.currentTime = targetTime;

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            offscreenVideo.removeEventListener('seeked', onSeeked);
            resolve();
          }, 1500);

          const onSeeked = () => {
            clearTimeout(timeout);
            offscreenVideo.removeEventListener('seeked', onSeeked);
            resolve();
          };
          offscreenVideo.addEventListener('seeked', onSeeked);
        });

        if (!active) return;
        ctx.drawImage(offscreenVideo, 0, 0, 160, 90);
        generated.push(offCanvas.toDataURL('image/jpeg', 0.6));
      }

      if (active) {
        setThumbnails(generated);
      }
    };

    generateFilmstrip().catch(() => {});

    return () => {
      active = false;
      offscreenVideo.src = '';
      offscreenVideo.load();
      offCanvas.width = 0;
      offCanvas.height = 0;
    };
  }, [videoState.objectUrl, videoState.duration]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    onTimeUpdate(time);
  };

  // Step 1 frame forward or backward (assuming 30fps: ~0.033s)
  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);

    const frameDelta = 1 / 30;
    const newTime =
      direction === 'forward'
        ? Math.min(video.duration, video.currentTime + frameDelta)
        : Math.max(0, video.currentTime - frameDelta);

    video.currentTime = newTime;
    onTimeUpdate(newTime);
  }, [onTimeUpdate]);

  // Keyboard controls for video playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame('forward');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame('backward');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepFrame]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className={styles.container}>
      {/* Video Viewport Container */}
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          src={videoState.objectUrl}
          className={styles.videoElement}
          playsInline
          onTimeUpdate={() => {
            if (videoRef.current) {
              onTimeUpdate(videoRef.current.currentTime);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Overlaid Drawing Layer (Mask Canvas) */}
        {children}
      </div>

      {/* Media Playback & Scrubber Controls */}
      <div className={styles.controlsBar}>
        <div className={styles.scrubberRow}>
          {/* Filmstrip thumbnails */}
          {thumbnails.length > 0 && (
            <div className={styles.filmstrip} aria-hidden="true">
              {thumbnails.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Thumbnail ${idx + 1}`}
                  className={styles.filmstripThumb}
                />
              ))}
            </div>
          )}

          {/* Timeline range slider */}
          <input
            type="range"
            min={0}
            max={videoState.duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className={styles.timelineInput}
            aria-label="Video timeline scrubber"
          />
        </div>

        {/* Control Buttons */}
        <div className={styles.buttonsRow}>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.ctrlButton}
              onClick={togglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <button
              type="button"
              className={styles.ctrlButton}
              onClick={() => stepFrame('backward')}
              title="Step 1 frame backward"
              aria-label="Step 1 frame backward"
            >
              <SkipBack size={13} />
              <span>-1F</span>
            </button>

            <button
              type="button"
              className={styles.ctrlButton}
              onClick={() => stepFrame('forward')}
              title="Step 1 frame forward"
              aria-label="Step 1 frame forward"
            >
              <SkipForward size={13} />
              <span>+1F</span>
            </button>

            {videoState.hasAudio && (
              <button
                type="button"
                className={styles.ctrlButton}
                onClick={toggleMute}
                title={isMuted ? 'Unmute audio' : 'Mute audio'}
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            )}
          </div>

          <div className={styles.timeReadout}>
            <span className={styles.timeCurrent}>{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(videoState.duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
