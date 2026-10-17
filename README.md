# ClearFrame — AI Media Cleanup & Provenance Management

> **Phase 1, Phase 2 & Phase 3 Complete**  
> *Phase 1: Local Media Inspection, Metadata Extraction & Provenance Audit Foundation*  
> *Phase 2: Functional Visible-Watermark Cleanup Editor with OpenCV Telea Inpainting*  
> *Phase 3: Video Cleanup MVP with Client-Side Frame Inpainting & FFmpeg WebAssembly Assembly*

---

## 1. Product Overview

ClearFrame is a creative-tool web application built for inspecting images and videos, auditing provenance credentials, and removing visible watermarks on media you own or have permission to edit.

- **Phase 1**: Local image inspection, comprehensive EXIF/camera optics parsing, and C2PA provenance analysis.
- **Phase 2**: High-precision image cleanup editor with Alexandru Telea Fast Marching Method (`cv.INPAINT_TELEA`) inpainting, split comparison, and provenance-safe export guards.
- **Phase 3**: Genuine local-first video cleanup workflow. Extracts video frames, applies the selected fixed-region mask consistently via OpenCV.js Telea inpainting, extracts and preserves audio tracks, reassembles frames with `@ffmpeg/ffmpeg` single-threaded WebAssembly, and presents interactive synchronized before-and-after comparison.

---

## 2. Technical Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict module syntax & full type safety)
- **Computer Vision Engine**: [`@techstark/opencv-js`](https://github.com/techstark/opencv-js) (Alexandru Telea Fast Marching Method `cv.INPAINT_TELEA`)
- **Video Assembly Engine**: [`@ffmpeg/ffmpeg`](https://ffmpegwasm.netlify.app/) (v0.12.15), [`@ffmpeg/util`](https://github.com/ffmpegwasm/util) (v0.12.2), and single-threaded [`@ffmpeg/core`](https://github.com/ffmpegwasm/core) (v0.12.10) hosted locally in `/public/ffmpeg/` (zero third-party CDN dependencies)
- **Provenance Engine**: [`@contentauth/c2pa-web`](https://github.com/contentauth/c2pa-js) (Official C2PA WebAssembly SDK with inlined reader)
- **Metadata Engine**: [`exifr`](https://github.com/MikeKovarik/exifr) (extracts TIFF, EXIF, XMP, IPTC, and ICC tags client-side)
- **Styling**: Vanilla CSS Design System with CSS Modules & custom properties (neutral graphite dark palette)
- **Icons**: [`lucide-react`](https://lucide.dev/)
- **Zero Backend / Zero Telemetry**: Fully localized in the browser sandbox. No API keys, no network requests, no remote server uploads.

---

## 3. Architecture & Modular Components

```
src/
├── types/
│   ├── index.ts                 # Strongly-typed models for files, videos, EXIF, editor, and provenance
│   └── exifr.d.ts               # Custom type declarations for exifr
├── services/
│   ├── opencvService.ts         # Asynchronous OpenCV.js runtime, Telea inpainting, Mat memory management
│   ├── ffmpegService.ts         # Local-core FFmpeg singleton with lifecycle & cancellation management
│   ├── videoProcessingService.ts# Sequential seek -> capture -> OpenCV inpaint -> FFmpeg write -> encode pipeline
│   └── c2paService.ts           # C2PA manifest reader using @contentauth/c2pa-web/inline
├── utils/
│   ├── fileValidation.ts        # Image MIME/extension checks, 50MB limits, off-thread image decode
│   ├── videoValidation.ts       # Video container validation (MP4/WebM), 5s limit, 720p limit, codec check
│   ├── exifReader.ts            # EXIF extraction, C2PA manifest inspection, AI signature detection
│   ├── exportSafety.ts          # Provenance-safe export evaluation (blocks silent stripping)
│   ├── formatters.ts            # Formatters (shutter speed, ƒ-stop, aspect ratio, bytes)
│   ├── sampleImages.ts          # Client-side synthetic test assets (watermarked photo, calibration, alpha)
│   └── sampleVideos.ts          # Client-side synthetic 3s 720p test video with authorized watermark & 440Hz audio
├── components/
│   ├── AppShell/                # Responsive layout, mode switchers, reset, and status bar
│   ├── ImageEditor/             # Phase 2 Image Editor suite
│   │   ├── ImageEditor.tsx      # Main coordinator for painting, inpainting, history, and comparison
│   │   ├── EditorToolbar.tsx    # Left toolbar: Brush, Eraser, sizes, radius, Undo/Redo, mask toggle
│   │   ├── MaskCanvas.tsx       # Sub-pixel 1:1 image resolution coordinate mapping canvas
│   │   ├── ComparisonViewer.tsx # Draggable split comparison slider, side-by-side, hold-to-compare
│   │   └── ResultsPanel.tsx     # Inpainting performance metrics, Telea boundaries, and export guard
│   ├── VideoEditor/             # Phase 3 Video Editor suite
│   │   ├── VideoEditor.tsx      # Orchestrates video playback, mask drawing, pipeline, and export
│   │   ├── VideoPlayer.tsx      # Custom playback controls, scrubber, timestamp, step ±1F, filmstrip
│   │   ├── VideoMaskCanvas.tsx  # Native 1:1 video resolution coordinate mapping canvas overlay
│   │   ├── VideoComparisonViewer.tsx # Synchronized dual-video playback with interactive split slider & side-by-side
│   │   └── VideoResultsPanel.tsx     # Real-time progress bar, cancel action, clip specs, provenance notice, MP4 export
│   ├── UploadPanel/             # Drag-and-drop dropzone, browse trigger, image & video sample loaders
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

## 4. Phase 3 Video Cleanup MVP Capabilities

### A. Video Import & Strict Validation
- **Formats Supported**: MP4 (`video/mp4`, H.264/AAC) and WebM (`video/webm`, VP8/VP9/Vorbis).
- **Format Validation**: Rejects unsupported containers (MOV, AVI, MKV, FLV) with clear readable guidance.
- **Phase 3 MVP Ceilings**:
  - Maximum duration: **5.0 seconds** (enforces fast client-side turnarounds and prevents browser memory exhaustion).
  - Maximum resolution: **720p** ($1280 \times 720$, 921,600 pixels).
  - Maximum file size: **50 MB**.
- **Metadata Extraction**: Reads native pixel dimensions, duration, estimated frame rate, and audio track presence.

### B. Video Editor Interface
- **Native Video Preview & Playback**: Custom play/pause, seek scrubber, current timestamp vs total duration formatted as `mm:ss.ms`.
- **Frame Stepping**: Accurate single-frame forward (`+1F`) and single-frame backward (`-1F`) buttons.
- **Filmstrip Thumbnails**: Extracts equidistant timestamped thumbnails across the clip to aid navigation.
- **High-Precision Selection Canvas**: Overlays the video element with an exact 1:1 pixel coordinate mapping canvas that scales automatically to any aspect ratio or container sizing without coordinate drift.
- **Drawing Tools**: Brush tool (diameter 4px–80px), Eraser tool (`destination-out`), Undo/Redo stack, and Clear Selection.

### C. Authentic OpenCV Frame-by-Frame Inpainting
- **Stationary Fixed-Region Mask**: Reuses the user-drawn 2D binary mask across all frames of the clip.
- **Real Inpainting**: Employs OpenCV.js Telea Fast Marching Method (`cv.INPAINT_TELEA`) with configurable neighborhood radius. Does not substitute mock blurs, solid rectangles, or fake AI.
- **Memory Safety**: Decoded frames are not accumulated into an unbounded array. Each frame is extracted, inpainted, written to the FFmpeg virtual filesystem, and immediately dereferenced with its OpenCV matrices deleted via `.delete()`.
- **Non-Destructive**: The original source video file and object URL remain untouched.

### D. Audio Preservation & FFmpeg Reassembly
- **Local Single-Threaded Core**: Loads `ffmpeg-core.js` and `ffmpeg-core.wasm` locally from `/public/ffmpeg/` via `toBlobURL()`. Requires no third-party CDNs and avoids cross-origin isolation requirements.
- **Audio Extraction & Remuxing**: Extracts existing audio streams via `-vn -acodec aac` and re-encodes alongside the newly inpainted frame sequence using `-shortest` to ensure exact sync.
- **Progress & Cancellation**: Reports live progress percentage and frame counts (`X / Y frames`). Allows users to safely cancel in-flight jobs via `AbortController`.
- **Validated MP4 Output**: Outputs a validated, playable H.264/AAC MP4 ready for Chrome, Safari, and Firefox.

### E. Provenance & Privacy Safeguards
- **Honest Fixed-Region Disclosure**: Clearly explains that fixed-region inpainting is designed for stationary overlays (timestamps, corner logos) and can produce boundary artifacts if high-contrast objects move behind the mask.
- **No Invisible Watermark Stripping**: ClearFrame is strictly for authorized visible overlay removal. It does not tamper with SynthID, C2PA cryptographic manifests, or invisible steganographic markers.
- **Provenance Disclosure**: Discloses that browser-side H.264 transcoding generates an uncredentialed output stream and does not fabricate C2PA claims.
- **Zero Remote Uploads**: 100% of processing and video frames stay in the client browser sandbox.

---

## 5. Verification & Testing

### Installation
```bash
npm install
```
Installs all dependencies. Note that `@ffmpeg/core` runtime binaries are automatically copied from `node_modules` into `public/ffmpeg/` via predev/prebuild lifecycle hooks.

### Running the Development Server
```bash
npm run dev
```
Starts Vite locally at `http://127.0.0.1:5173/`.

### Running Production Build
```bash
npm run build
```
Executes TypeScript type checking (`tsc -b`) and Vite production bundle generation with code-splitting. Heavy libraries (`opencv`, `c2pa`, `ffmpeg`, `exifr`) are isolated into dynamic chunks, keeping the initial entry chunk under 285 kB.

### Running Automated Test Suite
```bash
npm test
```
Runs 25 automated unit and integration tests across:
- Filename sanitization against path traversal, control characters, and injection.
- Formatters (aspect ratios, shutter speeds, ƒ-stops, megapixels, dates, video MIME types).
- Image validation (empty 0-byte check, unsupported format rejection, 50MB ceiling).
- Video validation (container validation, empty 0-byte check, 5.0s duration ceiling, 720p resolution limit, 50MB ceiling).
- Provenance export safety policies (C2PA, AI disclosure, EXIF presence, validation failure, null safety).
- Inpainting safety guards (empty mask rejection, 36 Megapixel memory ceiling, pre-aborted signal cancellation).
- Authentic pixel mutation (verifies masked pixels reconstruct towards background while unmasked pixels remain 100% bit-identical).

### Code Quality & Linting
```bash
npm run lint
```
Runs `oxlint src` with 0 errors and 0 warnings across all 34 source files.

### Production Preview
```bash
npm run preview
```
Serves the generated `dist/` bundle on `http://127.0.0.1:4173/` for local production verification.

---

## 6. Deployment Guide (Vercel & Static Hosts)

ClearFrame is configured for direct deployment on **Vercel** or any modern static web host.

### Vercel Configuration (`vercel.json`)
The repository includes a production-ready `vercel.json` specifying:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: `vite`
- **SPA Rewrites**: Directs all non-asset routes to `/index.html` for single-page application navigation.
- **WASM MIME Types & Caching**: Ensures `/ffmpeg/ffmpeg-core.wasm` is served with `Content-Type: application/wasm` and long-term immutable caching headers.
- **Security Headers**: Includes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.

### Deploying via Vercel CLI
```bash
# 1. Login to your Vercel account
npx vercel login

# 2. Deploy preview build from the repository root
npx vercel

# 3. Deploy to production (when authorized)
npx vercel --prod
```

### Deploying via Git Integration (Recommended)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the repository into your Vercel Dashboard.
3. Vercel will automatically detect `vercel.json` and Vite presets.
4. Verify the preview URL generated by Vercel.

---

## 7. Supported Formats, File Limits & Privacy Policies

### Supported Formats
| Media Type | Formats / Containers | Codecs | Max Duration | Max Resolution | Max File Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Image** | JPEG (`.jpg`, `.jpeg`), PNG (`.png`), WebP (`.webp`) | N/A | N/A | 36 Megapixels (~6000x6000px) | 50 MB |
| **Video** | MP4 (`.mp4`), WebM (`.webm`) | H.264 / AAC, VP8 / VP9 / Opus | 5.0 seconds | 720p ($1280 \times 720$) | 50 MB |

*Note: Unsupported containers (e.g. MOV, AVI, MKV, FLV, HEIC, TIFF, RAW, GIF) or files exceeding size and duration limits are rejected upfront with explanatory feedback.*

### Privacy & Provenance Guarantees
- **100% Client-Side Processing**: Zero media bytes, metadata, or video frames are transmitted to remote servers. All computation runs inside the local browser WebAssembly sandbox.
- **Export Safety Protection**: If an imported image contains cryptographic C2PA provenance credentials or EXIF camera metadata, exports are disabled with an explicit notice to prevent accidental stripping of attribution.
- **No Deceptive Marketing**: ClearFrame makes no false claims of invisible watermark removal (e.g. Google SynthID or Digimarc steganography). It is solely an editor for visible surface watermarks on media owned or authorized by the user.
- **Honest Provenance Output**: Exported videos are generated locally via browser H.264 transcoding and are clearly marked as uncredentialed.

---

## 8. Known Limitations & Browser Compatibility

1. **Browser Requirements**:
   - Modern browser supporting WebAssembly, Web Workers, and HTML5 Canvas (Chrome 90+, Edge 90+, Firefox 90+, Safari 16.4+).
2. **Stationary Selection Mask**:
   - Video inpainting applies the user-drawn 2D mask uniformly across all frames of the clip. Stationary watermarks (e.g. corner logos, timestamps) are cleanly inpainted. Watermarks with panning, zoom, or motion across changing backgrounds can show boundary smearing.
3. **WebAssembly Memory Bounds**:
   - Browser memory allocations are bounded. The 5.0-second / 720p limits are intentionally enforced to ensure predictable performance across laptops and consumer hardware without causing browser tab memory crashes.

---

## 9. Controlled Beta Experience & Privacy-First Feedback

ClearFrame includes built-in guidance and reporting tools designed specifically for controlled user trials:

- **Beta Guide (`BetaGuideModal`)**:
  - Displays automatically on first visit (persisted via `localStorage`).
  - Outlines core image and video cleanup workflows, technical limits, and troubleshooting tips.
  - Accessible at any time via the **Beta Guide** button in the header.
- **Privacy-First Feedback Form (`FeedbackModal`)**:
  - Allows testers to report defects, inpainting artifacts, or browser compatibility issues.
  - Automatically formats structured Markdown issue reports ready for GitHub Issues or team trackers.
  - Offers instant clipboard copying or `.md` file download.
  - **Zero Telemetry / Zero Leakage**: Does not upload files, file paths, or EXIF metadata. Anonymized environment diagnostics (User Agent, viewport, WASM flag) are strictly opt-in.

---

## 10. Beta Testing Checklist for Users

| Category | Journey / Scenario | Expected Verification |
| :--- | :--- | :--- |
| **Image Cleanup** | Load sample watermarked photo $\rightarrow$ Draw brush selection $\rightarrow$ Inpaint (Telea) | Watermark reconstructed with boundary gradients; split comparison slider operates smoothly; Undo/Redo responsive. |
| **Video Cleanup** | Load sample watermarked 3s clip $\rightarrow$ Draw stationary mask $\rightarrow$ Inpaint Video | Progress bar advances across frame extraction, inpainting, and FFmpeg assembly; synchronized dual player displays before/after; MP4 download playable. |
| **Provenance Audit** | Inspect JPEG/PNG with EXIF $\rightarrow$ Switch to "Inspect & Provenance" tab | Displays camera optics, shutter speed, ƒ-stop; C2PA row correctly reports status; export is safely disabled if metadata is present. |
| **Mobile Responsiveness** | Test on 375px–390px viewport (iOS Safari / Android Chrome) | Header, toolbar, and inspector stack cleanly; buttons and sliders remain fully touch-accessible. |
| **Feedback Submission** | Open Feedback modal $\rightarrow$ Fill issue summary $\rightarrow$ Click "Copy Markdown Report" | Formatted report copies to clipboard with success toast; no network calls made. |

