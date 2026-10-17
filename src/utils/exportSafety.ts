import type { ExifMetadata, ProvenanceData, ExportProvenanceSafety } from '../types';

/**
 * Evaluates whether an edited image can be exported safely without silently stripping provenance
 */
export function evaluateExportSafety(
  exif: ExifMetadata | null,
  provenance: ProvenanceData | null
): ExportProvenanceSafety {
  const blockers: string[] = [];

  const hasC2pa = Boolean(
    provenance?.c2pa.status === 'detected' ||
      provenance?.c2pa.status === 'validation_failure'
  );

  const hasAiLabels = Boolean(provenance?.aiLabels.status === 'detected');
  const hasExif = Boolean(exif?.hasExif && exif.rawTagsCount > 0);

  if (hasC2pa) {
    blockers.push(
      'Embedded C2PA Content Credentials detected. Modifying image pixels invalidates the cryptographic asset hash. Exporting via client canvas without an authorized private key and root CA trust would silently strip or invalidate Content Credentials.'
    );
  }

  if (hasAiLabels) {
    blockers.push(
      'Standardized AI disclosure marker detected in metadata. Canvas export strips IPTC DigitalSourceType and XMP tags, causing silent loss of AI origin disclosure.'
    );
  }

  if (hasExif) {
    blockers.push(
      `Source EXIF metadata headers present (${exif?.rawTagsCount ?? 0} tags). Browser canvas rasterization strips camera and optics metadata.`
    );
  }

  if (blockers.length > 0) {
    return {
      canExport: false,
      statusLabel: 'Export Disabled (Provenance Protection)',
      reason:
        'To prevent silent provenance stripping, direct file export is blocked because this asset contains cryptographic credentials or metadata that standard browser canvas export cannot safely preserve.',
      blockers,
      hasC2pa,
      hasExif,
      hasAiLabels,
    };
  }

  return {
    canExport: true,
    statusLabel: 'Export Permitted (No Provenance at Risk)',
    reason:
      'Source image contains no embedded C2PA manifests, EXIF headers, or AI disclosure tags. Exporting raw pixel data does not strip any preexisting provenance information.',
    blockers: [],
    hasC2pa: false,
    hasExif: false,
    hasAiLabels: false,
  };
}
