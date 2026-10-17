/**
 * Generates test images client-side for immediate inspection
 */
export async function createSampleImage(
  type: 'photo' | 'png-transparent' | 'webp-banner' | 'watermarked-photo'
): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  if (type === 'photo') {
    // 1920x1080 Simulated photographic test chart
    canvas.width = 1920;
    canvas.height = 1080;

    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#13151b');
    grad.addColorStop(1, '#08090c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Grid lines
    ctx.strokeStyle = '#222530';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1920; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1080);
      ctx.stroke();
    }
    for (let y = 0; y < 1080; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1920, y);
      ctx.stroke();
    }

    // Focal targets / calibration chart circles
    ctx.strokeStyle = '#383d4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(960, 540, 320, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#5a627d';
    ctx.beginPath();
    ctx.arc(960, 540, 160, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#818ba6';
    ctx.beginPath();
    ctx.moveTo(960, 480);
    ctx.lineTo(960, 600);
    ctx.moveTo(900, 540);
    ctx.lineTo(1020, 540);
    ctx.stroke();

    // Text labels
    ctx.fillStyle = '#f0f1f5';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLEARFRAME CALIBRATION CHART', 960, 420);

    ctx.fillStyle = '#8f95a8';
    ctx.font = '20px JetBrains Mono, monospace';
    ctx.fillText('Resolution: 1920 × 1080 px  •  Format: JPEG  •  Aspect: 16:9', 960, 460);
    ctx.fillText('Phase 1 Local Metadata & Workspace Pipeline Test', 960, 660);

    // Color bars
    const colors = ['#ffffff', '#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#ef4444', '#3b82f6'];
    const barWidth = 140;
    const startX = (1920 - colors.length * barWidth) / 2;
    colors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(startX + idx * barWidth, 720, barWidth, 60);
    });

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95)
    );
    return new File([blob], 'sample_calibration_photo.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  if (type === 'png-transparent') {
    // 800x800 Transparent PNG asset
    canvas.width = 800;
    canvas.height = 800;

    // Clear transparency
    ctx.clearRect(0, 0, 800, 800);

    // Glowing badge in center
    const radial = ctx.createRadialGradient(400, 400, 50, 400, 400, 280);
    radial.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    radial.addColorStop(0.7, 'rgba(99, 102, 241, 0.25)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 800, 800);

    // Geometric rings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(400, 400, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(400, 400, 220, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANSPARENCY TEST', 400, 390);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.fillText('PNG-24 Alpha Channel Inspection', 400, 425);

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/png')
    );
    return new File([blob], 'sample_asset_transparent.png', {
      type: 'image/png',
      lastModified: Date.now(),
    });
  }

  if (type === 'watermarked-photo') {
    // 1200x800 image with a distinct visible watermark
    canvas.width = 1200;
    canvas.height = 800;

    // Atmospheric photo backdrop (sky gradient and horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
    skyGrad.addColorStop(0, '#1a2238');
    skyGrad.addColorStop(0.6, '#394867');
    skyGrad.addColorStop(1, '#9ba4b4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1200, 500);

    // Foreground / landscape gradient
    const groundGrad = ctx.createLinearGradient(0, 500, 0, 800);
    groundGrad.addColorStop(0, '#2c394b');
    groundGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 500, 1200, 300);

    // Subtle sun / horizon glow
    const sunGrad = ctx.createRadialGradient(600, 480, 20, 600, 480, 240);
    sunGrad.addColorStop(0, 'rgba(255, 235, 180, 0.45)');
    sunGrad.addColorStop(0.5, 'rgba(255, 180, 100, 0.15)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 200, 1200, 400);

    // Distant mountain silhouettes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 500);
    ctx.lineTo(250, 420);
    ctx.lineTo(450, 470);
    ctx.lineTo(600, 390);
    ctx.lineTo(800, 460);
    ctx.lineTo(1050, 400);
    ctx.lineTo(1200, 480);
    ctx.lineTo(1200, 500);
    ctx.closePath();
    ctx.fill();

    // Scene label
    ctx.fillStyle = 'rgba(240, 241, 245, 0.85)';
    ctx.font = '600 24px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nordic Landscape Study #42', 60, 100);

    ctx.fillStyle = 'rgba(158, 164, 180, 0.75)';
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.fillText('Resolution: 1200 × 800 px  •  Visible Watermark Cleanup Test Asset', 60, 130);

    // === Prominent Visible Watermark Stamp ===
    // 1. Watermark box in lower-center area
    ctx.save();
    ctx.translate(600, 580);

    // Semi-transparent watermark stamp pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-240, -35, 480, 70, 8);
    ctx.fill();
    ctx.stroke();

    // Watermark text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('© CLEARFRAME SAMPLE WATERMARK', 0, -4);

    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('VISIBLE WATERMARK • BRUSH OVER TO CLEAN WITH TELEA', 0, 18);

    ctx.restore();

    // Secondary subtle corner stamp
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SAMPLE PROOF', 1140, 750);

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95)
    );
    return new File([blob], 'watermarked_landscape_study.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  // WebP Banner
  canvas.width = 1200;
  canvas.height = 630;

  const gradWebP = ctx.createLinearGradient(0, 0, 1200, 0);
  gradWebP.addColorStop(0, '#181922');
  gradWebP.addColorStop(0.5, '#222533');
  gradWebP.addColorStop(1, '#181922');
  ctx.fillStyle = gradWebP;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.strokeStyle = '#2d3246';
  ctx.strokeRect(40, 40, 1120, 550);

  ctx.fillStyle = '#f0f1f5';
  ctx.font = '700 42px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WEBP EDITORIAL BANNER', 600, 290);

  ctx.fillStyle = '#9499ad';
  ctx.font = '18px JetBrains Mono, monospace';
  ctx.fillText('1200 × 630 px  •  image/webp  •  Metadata & Color Inspection', 600, 350);

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), 'image/webp', 0.9)
  );
  return new File([blob], 'sample_editorial_banner.webp', {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

