# ClearFrame — AI Media Cleanup & Provenance Management

> **Phase 1 & Phase 2 Complete**  
> *Phase 1: Local Media Inspection, Metadata Extraction & Provenance Audit Foundation*  
> *Phase 2: Functional Visible-Watermark Cleanup Editor with OpenCV Telea Inpainting & Provenance-Safe Export*

---

## 1. Product Overview

ClearFrame is a creative-tool web application built for inspecting images, auditing provenance credentials, and removing visible watermarks on media you own or have permission to edit.

Phase 2 introduces a functional, client-side visible-watermark cleanup editor powered by **OpenCV WebAssembly** (`@techstark/opencv-js`), **C2PA Content Credentials** inspection (`@contentauth/c2pa-web`), and strict **provenance-safe export safeguards**.

---

## 2. Technical Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict module syntax & full type safety)
- **Computer Vision Engine**: [`@techstark/opencv-js`](https://github.com/techstark/opencv-js) (Alexandru Telea Fast Marching Method `cv.INPAINT_TELEA`)
- **Provenance Engine**: [`@contentauth/c2pa-web`](https://github.com/contentauth/c2pa-js) (Official C2PA WebAssembly SDK with inlined reader)
- **Metadata Engine**: [`exifr`](https://github.com/MikeKovarik/exifr) (extracts TIFF, EXIF, XMP, IPTC, and ICC tags client-side)
- **Styling**: Vanilla CSS Design System with CSS Modules & custom properties (neutral graphite dark palette)
- **Icons**: [`lucide-react`](https://lucide.dev/)
- **Zero Backend / Zero Telemetry**: Fully localized in the browser sandbox. No API keys, no network requests, no analytics.

---

## 3. Architecture & Modular Components

```
src/
├── types/
│   ├── index.ts                 # Strongly-typed models for files, EXIF, editor, and provenance
│   └── exifr.d.ts               # Custom type declarations for exifr
├── services/
│   ├── opencvService.ts         # Asynchronous OpenCV.js runtime, Telea inpainting, Mat memory management
│   └── c2paService.ts           # C2PA manifest reader using @contentauth/c2pa-web/inline
├── utils/
│   ├── fileValidation.ts        # MIME/extension checks, 50MB limits, off-thread image decode
│   ├── exifReader.ts            # EXIF extraction, C2PA manifest inspection, AI signature detection
│   ├── exportSafety.ts          # Provenance-safe export evaluation (blocks silent stripping)
│   ├── formatters.ts            # Photographic formatters (shutter speed, ƒ-stop, aspect ratio)
│   └── sampleImages.ts          # Client-side synthetic test assets (watermarked photo, calibration, alpha)
├── components/
│   ├── AppShell/                # Responsive layout, mode switcher (Editor vs Inspect), status bar
│   ├── ImageEditor/             # Phase 2 Editor suite
│   │   ├── ImageEditor.tsx      # Main coordinator for painting, inpainting, history, and comparison
│   │   ├── EditorToolbar.tsx    # Left toolbar: Brush, Eraser, sizes, radius, Undo/Redo, mask toggle
│   │   ├── MaskCanvas.tsx       # Sub-pixel 1:1 image resolution coordinate mapping canvas
│   │   ├── ComparisonViewer.tsx # Draggable split comparison slider, side-by-side, hold-to-compare
│   │   └── ResultsPanel.tsx     # Inpainting performance metrics, Telea boundaries, and export guard
│   ├── UploadPanel/             # Drag-and-drop dropzone, browse trigger, sample loaders
│   ├── MediaPreview/            # Phase 1 Canvas workspace with zoom, fit, checkerboard backdrop
│   ├── FileInfoPanel/           # File specs, camera & hardware, optics, and privacy status
│   ├── ProvenancePanel/         # 4-row provenance audit (C2PA, EXIF, SynthID, Platform AI)
│   ├── StatusMessage/           # Accessible alert banners (success, warning, error, info)
│   └── common/Badge/            # Tone-based status badges
├── App.tsx                      # Root entry
├── main.tsx                     # React DOM bootstrap
└── index.css                    # Professional dark graphite design tokens & resets
```

---

## 4. Key Capabilities & Implementation Details

### A. Genuine OpenCV Telea Inpainting
- **Mathematical Foundation**: Implements Alexandru Telea’s Fast Marching Method (FMM) (`cv.INPAINT_TELEA`). Propagates color gradients from the surrounding boundary inward along the level lines.
- **Grayscale Mask Processing**: Extracts an 8-bit single-channel mask (`CV_8UC1`) where non-zero pixels represent the marked watermark.
- **Full Source Resolution**: Converts RGBA pixels to 3-channel RGB (`CV_8UC3`) for `cv.inpaint`, executes inpainting at native pixel resolution, converts back to RGBA (`CV_8UC4`), and creates an in-memory preview.
- **Memory Safety**: Guaranteed WebAssembly memory deallocation (`srcRGBA.delete()`, `srcRGB.delete()`, `maskMat.delete()`, `dstRGB.delete()`, `dstRGBA.delete()`) inside `try...finally` blocks.
- **Honest Performance & Technique Disclosure**: Displays exact compute duration in milliseconds and modified pixel counts. Notes transparently that classical inpainting reconstructs from boundary gradients and does not fabricate stochastic AI textures.

### B. High-Precision Editor Interface
- **Left Toolbar**:
  - **Brush Tool**: Smooth stroke painting on the mask.
  - **Eraser Tool**: Subtracts from the mask using `destination-out`.
  - **Brush Diameter Slider**: 4px to 80px with real-time visual cursor ring matching diameter.
  - **Telea Neighborhood Radius**: 1px to 20px slider with instant parameter tuning.
  - **Undo & Redo**: Stack-based stroke history with `Ctrl+Z`, `Ctrl+Shift+Z`, and `Ctrl+Y` shortcuts.
  - **Clear Selection**: Wipes the active mask.
  - **Mask Visibility Toggle**: Toggles overlay to inspect underlying watermark without obstruction.
- **Sub-Pixel Coordinate Mapping**:
  `x = ((clientX - rect.left) / rect.width) * canvas.width`
  `y = ((clientY - rect.top) / rect.height) * canvas.height`
  Every stroke is rendered onto a 1:1 offscreen buffer matching the exact native dimensions of the uploaded image.
- **Results & Comparison Viewer**:
  - **Draggable Split Slider**: Compare original vs cleaned result with an interactive divider.
  - **Side-by-Side Mode**: Dual view of before and after images.
  - **Hold to View Original**: Press and hold to temporarily preview the unedited source.
  - **Reset to Original**: Restores unedited source image with full state reset.

### C. Provenance & Metadata Safeguards
This tool strictly refuses to act as a stealth metadata or provenance stripper:
- **C2PA Inspection**: Uses `@contentauth/c2pa-web` to inspect embedded C2PA manifests, distinguishing verified credentials, validation failures, inspection errors, and uncredentialed media.
- **Export Blocker Policy**:
  - If an image contains **C2PA Content Credentials**: Export is disabled. Editing pixels breaks cryptographic manifest hashes; exporting without private key CA signing would silently tamper provenance.
  - If an image contains **AI Disclosure Markers** (IPTC/XMP): Export is disabled. Standard browser canvas rasterization discards metadata, stripping origin disclosure.
  - If an image contains **EXIF Metadata**: Export is disabled to prevent silent camera and optics stripping.
  - If the image contains **no metadata or credentials**: Export is safely enabled at full native resolution.

---

## 5. Verification & Testing

### Running the Development Server
```bash
npm run dev
```
Starts Vite locally at `http://localhost:5173/`.

### Running Production Build
```bash
npm run build
```
Executes TypeScript type checking (`tsc -b`) and Vite production bundle generation with zero errors.

### Running Automated Test Suite
```bash
npm test
```
Runs 14 unit tests across formatters, aspect ratio calculations, MIME type validation, 50MB safety ceiling, and export safety provenance rules.

### Code Quality & Linting
```bash
npm run lint
```
Runs `oxlint` with 0 errors and 0 warnings across all 26 files.
