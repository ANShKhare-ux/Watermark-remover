import React from 'react';
import {
  FileCheck2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { ProvenanceData, ProvenanceItem } from '../../types';
import { Badge } from '../common/Badge';
import styles from './ProvenancePanel.module.css';

export interface ProvenancePanelProps {
  provenance: ProvenanceData;
}

export const ProvenancePanel: React.FC<ProvenancePanelProps> = ({ provenance }) => {
  const rows: ProvenanceItem[] = [
    provenance.c2pa,
    provenance.exif,
    provenance.synthid,
    provenance.aiLabels,
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <FileCheck2 size={14} />
          <span>Provenance & Verification Audit</span>
        </div>
        <p className={styles.subtitle}>
          Analysis of cryptographic manifests, container headers, and AI disclosure
          metadata present in this file.
        </p>
      </div>

      <div className={styles.rowsList}>
        {rows.map((item) => (
          <div key={item.id} className={styles.provenanceCard}>
            <div className={styles.cardTop}>
              <div className={styles.cardIdentity}>
                <span className={styles.cardTitle}>{item.title}</span>
                <span className={styles.cardCategory}>{item.category}</span>
              </div>
              <Badge tone={item.statusTone} withDot>
                {item.statusLabel}
              </Badge>
            </div>

            <p className={styles.summary}>{item.summary}</p>

            <div className={styles.technicalDetails}>
              {item.technicalDetails}
              {item.specificationUrl && (
                <div style={{ marginTop: '4px' }}>
                  <a
                    href={item.specificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--tone-info)',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Read standard specification</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Provenance & Authenticity Disclaimer */}
      <div className={styles.disclaimerBox} role="note">
        <AlertTriangle size={15} className={styles.disclaimerIcon} />
        <div className={styles.disclaimerContent}>
          <span className={styles.disclaimerTitle}>
            Authenticity & Detection Notice
          </span>
          <span>
            The absence of AI markers, watermarks, or C2PA credentials does{' '}
            <strong>not</strong> infer that an image is authentic, human-made, or
            watermark-free. Content provenance may be stripped by social platforms,
            converters, or photo editors.
          </span>
        </div>
      </div>
    </div>
  );
};
