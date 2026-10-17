/**
 * Generates an authentic client-side test video with an authorized visible watermark
 * and audio track for Phase 3 testing using Canvas captureStream and MediaRecorder.
 */
export async function createSampleWatermarkedVideo(): Promise<File> {
  const width = 640;
  const height = 360;
  const fps = 30;
  const durationSeconds = 3.0;
  const totalFrames = fps * durationSeconds;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available for video generation.');
  }

  // Audio setup: synthesize a clean 440Hz sine chord
  let audioTrack: MediaStreamTrack | null = null;
  let audioCtx: AudioContext | null = null;
  let osc: OscillatorNode | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      // Pleasant low volume
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      audioTrack = dest.stream.getAudioTracks()[0] || null;
    }
  } catch {
    // Audio synthesis fallback
  }

  // Capture canvas video stream
  const videoStream = canvas.captureStream(fps);
  if (audioTrack) {
    videoStream.addTrack(audioTrack);
  }

  // Determine best supported recording MIME type
  let mimeType = 'video/webm;codecs=vp8,opus';
  if (MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
    mimeType = 'video/webm;codecs=vp9,opus';
  } else if (MediaRecorder.isTypeSupported('video/webm')) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(videoStream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start(100);

  // Render 3.0 seconds of animation frames
  let frame = 0;
  const frameIntervalMs = 1000 / fps;

  return new Promise<File>((resolve, reject) => {
    const renderInterval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(renderInterval);
        recorder.stop();

        if (osc) {
          try {
            osc.stop();
          } catch {
            // Ignore
          }
        }
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }

        recordingPromise
          .then((blob) => {
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const file = new File(
              [blob],
              `sample_watermarked_clip.${ext}`,
              {
                type: mimeType.split(';')[0],
                lastModified: Date.now(),
              }
            );
            resolve(file);
          })
          .catch(reject);
        return;
      }

      // Render frame content: animated gradient backdrop + moving star/orb + fixed visible watermark
      const t = frame / totalFrames; // 0 to 1

      // 1. Animated background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#334155');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. Moving animated circular orb (moving background element)
      const orbX = 80 + t * (width - 160);
      const orbY = 120 + Math.sin(t * Math.PI * 4) * 50;

      const orbGrad = ctx.createRadialGradient(orbX, orbY, 5, orbX, orbY, 40);
      orbGrad.addColorStop(0, '#38bdf8');
      orbGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, 40, 0, Math.PI * 2);
      ctx.fill();

      // 3. Grid line pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // 4. Timecode & metadata labels
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CLEARFRAME PHASE 3 VIDEO TEST', 30, 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px JetBrains Mono, monospace';
      const curSec = (frame / fps).toFixed(2);
      ctx.fillText(
        `Time: 00:0${curSec} / 00:03.00  •  Frame: ${frame + 1}/${totalFrames}`,
        30,
        65
      );

      // 5. === STATIONARY VISIBLE WATERMARK STAMP ===
      // Fixed location in lower right corner for inpainting
      ctx.save();
      const wmX = width - 260;
      const wmY = height - 90;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(wmX, wmY, 230, 60, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('© SAMPLE WATERMARK', wmX + 115, wmY + 26);

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('BRUSH HERE TO INPAINT', wmX + 115, wmY + 44);

      ctx.restore();

      frame++;
    }, frameIntervalMs);
  });
}
