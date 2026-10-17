import cvMod from '@techstark/opencv-js';

export interface InpaintOptions {
  radius?: number; // Inpainting radius (e.g. 3 to 10 px)
  algorithm?: 'telea' | 'ns';
}

export interface InpaintResult {
  outputImageData: ImageData;
  computeTimeMs: number;
  width: number;
  height: number;
  radius: number;
  algorithm: 'telea';
  modifiedPixelCount: number;
}

let cvInstance: any = null;
let cvInitPromise: Promise<any> | null = null;
let initError: string | null = null;

/**
 * Asynchronously initializes the OpenCV.js runtime
 */
export async function getOpenCv(): Promise<any> {
  if (cvInstance) {
    return cvInstance;
  }

  if (initError) {
    throw new Error(`OpenCV initialization previously failed: ${initError}`);
  }

  if (!cvInitPromise) {
    cvInitPromise = (async () => {
      try {
        // @techstark/opencv-js exports a Promise that resolves with the cv object
        const resolved = await (cvMod as any);
        const cv = resolved.default || resolved;

        if (!cv || typeof cv.inpaint !== 'function') {
          throw new Error('OpenCV loaded but cv.inpaint API is unavailable.');
        }

        cvInstance = cv;
        return cv;
      } catch (err: any) {
        initError = err?.message || 'Failed to initialize OpenCV WebAssembly runtime.';
        cvInitPromise = null;
        throw new Error(initError ?? 'Failed to initialize OpenCV WebAssembly runtime.');
      }
    })();
  }

  return cvInitPromise;
}

/**
 * Checks if OpenCV is currently initialized and ready
 */
export function isOpenCvReady(): boolean {
  return cvInstance !== null && typeof cvInstance.inpaint === 'function';
}

/**
 * Executes authentic Telea inpainting on an ImageData object using an 8-bit mask
 *
 * @param sourceImageData Source image pixels (RGBA)
 * @param maskImageData Grayscale/Alpha mask (non-zero pixels indicate region to clean)
 * @param options Inpainting options (radius, algorithm)
 */
export async function executeInpainting(
  sourceImageData: ImageData,
  maskImageData: ImageData,
  options: InpaintOptions = {}
): Promise<InpaintResult> {
  const startTime = performance.now();
  const cv = await getOpenCv();

  const width = sourceImageData.width;
  const height = sourceImageData.height;
  const radius = Math.max(1, Math.min(options.radius ?? 5, 30));

  // Memory guard: Validate dimensions to prevent WebAssembly heap exhaustion
  const totalPixels = width * height;
  if (totalPixels > 36_000_000) {
    // > ~6000x6000 px
    throw new Error(
      `Image resolution (${width} × ${height}) exceeds maximum inpainting safety threshold of 36 Megapixels. Please resize the image to prevent browser out-of-memory errors.`
    );
  }

  // Count modified pixels in mask
  let nonZeroCount = 0;
  const maskRaw = maskImageData.data;
  // Create single-channel Uint8Array for mask (CV_8UC1)
  const singleChannelMask = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    // Check alpha or red channel of mask
    const r = maskRaw[i * 4];
    const a = maskRaw[i * 4 + 3];
    if (r > 10 || a > 10) {
      singleChannelMask[i] = 255;
      nonZeroCount++;
    } else {
      singleChannelMask[i] = 0;
    }
  }

  if (nonZeroCount === 0) {
    throw new Error(
      'No cleanup region was selected. Please use the brush tool to mark the visible watermark region before inpainting.'
    );
  }

  // Matrix allocation with guaranteed cleanup
  let srcRGBA: any = null;
  let srcRGB: any = null;
  let maskMat: any = null;
  let dstRGB: any = null;
  let dstRGBA: any = null;

  try {
    // 1. Create source RGBA Mat
    srcRGBA = cv.matFromImageData(sourceImageData);

    // 2. Convert to 3-channel RGB (cv.inpaint requires 8UC3 or 8UC1)
    srcRGB = new cv.Mat();
    cv.cvtColor(srcRGBA, srcRGB, cv.COLOR_RGBA2RGB);

    // 3. Create single-channel 8-bit mask Mat
    maskMat = cv.matFromArray(height, width, cv.CV_8UC1, singleChannelMask);

    // 4. Allocate destination RGB Mat
    dstRGB = new cv.Mat();

    // 5. Execute Telea inpainting (Fast Marching Method, Alexandru Telea 2004)
    cv.inpaint(srcRGB, maskMat, dstRGB, radius, cv.INPAINT_TELEA);

    // 6. Convert back to RGBA for canvas rendering
    dstRGBA = new cv.Mat();
    cv.cvtColor(dstRGB, dstRGBA, cv.COLOR_RGB2RGBA);

    // 7. Extract processed pixels into standard browser ImageData
    const outputData = new Uint8ClampedArray(dstRGBA.data);
    const outputImageData = new ImageData(outputData, width, height);

    const computeTimeMs = Math.round(performance.now() - startTime);

    return {
      outputImageData,
      computeTimeMs,
      width,
      height,
      radius,
      algorithm: 'telea',
      modifiedPixelCount: nonZeroCount,
    };
  } finally {
    // Crucial: Release all WebAssembly OpenCV matrices to avoid memory leaks
    if (srcRGBA) srcRGBA.delete();
    if (srcRGB) srcRGB.delete();
    if (maskMat) maskMat.delete();
    if (dstRGB) dstRGB.delete();
    if (dstRGBA) dstRGBA.delete();
  }
}
