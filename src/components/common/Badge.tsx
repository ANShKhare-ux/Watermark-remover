import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'info' | 'warning' | 'success' | 'error';
  withDot?: boolean;
  className?: string;
  title?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'neutral',
  withDot = false,
  className = '',
  title,
}) => {
  return (
    <span
      className={`${styles.badge} ${styles[tone]} ${className}`}
      title={title}
    >
      {withDot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
};
