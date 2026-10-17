# ClearFrame — Phase 1 Foundation

> **AI Media Cleanup & Provenance Management Tool**  
> *Phase 1: Local Media Inspection, Metadata Extraction & Provenance Audit Foundation*

---

## 1. Product Overview

ClearFrame is a creative-tool web application built for inspecting images, auditing provenance credentials, and preparing media for visible watermark cleanup. 

Phase 1 establishes a client-side foundation. It provides an inspection workspace inspired by professional media software (Lightroom, Figma, DaVinci Resolve) with a neutral black and graphite color palette, precise optical metrics, and rigorous privacy safeguards.

---

## 2. Technical Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict module syntax & full type safety)
- **Styling**: Vanilla CSS Design System with CSS Modules & custom properties (neutral graphite dark palette)
- **Metadata Engine**: [`exifr`](https://github.com/MikeKovarik/exifr) (extracts TIFF, EXIF, XMP, IPTC, and ICC tags client-side)
- **Icons**: [`lucide-react`](https://lucide.dev/)
- **Zero Backend / Zero Telemetry**: Fully localized in the browser sandbox. No API keys, no network requests, no analytics.

---

## 3. Architecture & Modular Components

```
src/
├── types/
│   ├── index.ts                 # Strongly-typed models for files, EXIF, and provenance
│   └── exifr.d.ts               # Custom type declarations for exifr
├── utils/
│   ├── fileValidation.ts        # MIME/extension checks, 50MB limits, off-thread image decode
│   ├── exifReader.ts            # EXIF extraction, C2PA box scanning, AI signature detection
│   ├── formatters.ts            # Photographic formatters (shutter speed, ƒ-stop, aspect ratio)
│   └── sampleImages.ts          # Instant client-side synthetic test assets (JPEG, PNG, WebP)
├── components/
│   ├── AppShell/                # Responsive application layout, header, footer, notifications
│   ├── UploadPanel/             # Drag-and-drop dropzone, browse trigger, sample loaders
│   ├── MediaPreview/            # Canvas workspace with zoom, fit, checkerboard backdrop, pixel inspector
│   ├── FileInfoPanel/           # File specs, camera & hardware, optics, and privacy status
│   ├── ProvenancePanel/         # 4-row provenance audit (C2PA, EXIF, SynthID, Platform AI)
│   ├── StatusMessage/           # Accessible alert banners (success, warning, error, info)
│   └── common/Badge/            # Tone-based status badges
├── App.tsx                      # Root entry
├── main.tsx                     # React DOM bootstrap
└── index.css                    # Professional dark graphite design tokens & resets
```

---

## 4. Key Functional Capabilities

### A. Local Image Upload & Validation
- **Supported Formats**: JPEG (`image/jpeg`), PNG (`image/png`), and WebP (`image/webp`).
- **Input Channels**: Drag-and-drop onto the dropzone or system file picker dialog.
- **Safety Validations**:
  - Validates MIME type and file extension before loading.
  - Enforces a 50 MB client-side safety limit to prevent memory crashes.
  - Asynchronously verifies image decodability using `createImageBitmap` and `Image()`, safely rejecting malformed or truncated files.
- **Zero Memory Leaks**: All `URL.createObjectURL` references are tracked and revoked with `URL.revokeObjectURL` upon file replacement, reset, or component unmount.

### B. Media Preview Workspace
- **Dynamic Viewport**: Supports **Fit to Screen**, **100% Actual Pixels**, and variable zoom levels (`+` / `-`).
- **Transparency Inspection**: One-click toggle between solid dark graphite background and an optical checkerboard pattern for PNG-24 and WebP alpha channels.
- **Floating Optical Metrics**: Displays live resolution ($W \times H$), aspect ratio (e.g. 16:9, 4:3), and megapixels.
- **Pixel Coordinate Inspector**: Computes real-time integer pixel coordinates ($X, Y$) when hovering over the image canvas.
- **Keyboard Shortcuts**:
  - `+` / `=`: Zoom in
  - `-` / `_`: Zoom out
  - `0`: Fit to workspace
  - `1`: 100% Actual size
  - `Esc`: Reset workspace

### C. File Information Panel
- **File Specifications**: Original filename (with one-click copy), MIME format, exact byte size, dimensions, aspect ratio, and megapixels.
- **Camera & Hardware (EXIF)**: Camera make & model, lens model, capture date/time, and software. Unavailable fields display as `—` rather than fabricated values.
- **Optics & Exposure**: Exposure time (photographic fractional shutter speed, e.g., `1/250s`), aperture (e.g., `ƒ/2.8`), ISO sensitivity, focal length with 35mm equivalent, and color profile.
- **Privacy First**: GPS coordinates detected in EXIF headers are explicitly protected and hidden by default.

### D. Provenance & Verification Audit
Provides separate status rows for four provenance tiers:
1. **C2PA Content Credentials**: Inspects binary container streams for JUMBF (`c2pa`, `c2ma`, `caBX`) box headers.
2. **EXIF Metadata Headers**: Detects presence and count of camera exchangeable tags.
3. **SynthID Verification**: Accurately shows **Detector not integrated** (reflecting that Google DeepMind SynthID requires server-side neural inference).
4. **Platform AI Labels**: Scans standardized IPTC `DigitalSourceType` (e.g. `trainedAlgorithmicMedia`) and known generator signatures (Midjourney, DALL-E, Stable Diffusion, Firefly, Flux).
- **Provenance Disclaimer**: Features an explicit notice that missing markers do not imply human authorship or watermark-free content.

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
Runs the native Node test runner validating all formatters, aspect ratio calculations, MIME type validations, and file size limits.

### Code Quality & Linting
```bash
npm run lint
```
Runs `oxlint` with 0 errors and 0 warnings.

---

## 6. Scope Restrictions & Limitations (Phase 1)

This project strictly adheres to Phase 1 Foundation boundaries:
- **No Inpainting / AI Removal in Phase 1**: Watermark cleanup algorithms will be introduced in subsequent phases.
- **No Cloud Uploads or Telemetry**: All data stays on the local device.
- **No Video Processing**: Phase 1 is focused on raster images (JPEG, PNG, WebP).
- **No Accounts / Billing / Databases**: Standalone client application.
