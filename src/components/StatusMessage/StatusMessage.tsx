import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type { StatusNotification } from '../../types';
import styles from './StatusMessage.module.css';

export interface StatusMessageProps {
  notification: StatusNotification;
  onDismiss?: (id: string) => void;
  className?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  notification,
  onDismiss,
  className = '',
}) => {
  const { id, type, title, message, dismissible = true } = notification;

  const renderIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle size={16} aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle size={16} aria-hidden="true" />;
      case 'success':
        return <CheckCircle2 size={16} aria-hidden="true" />;
      case 'info':
      default:
        return <Info size={16} aria-hidden="true" />;
    }
  };

  return (
    <div
      className={`${styles.container} ${styles[type]} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className={styles.iconWrapper}>{renderIcon()}</div>
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.message}>{message}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className={styles.closeButton}
          aria-label="Dismiss message"
          title="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
