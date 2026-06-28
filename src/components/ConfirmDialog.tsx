/**
 * 通用确认弹窗组件
 * 替代浏览器 window.confirm，提供统一的 UI 体验
 */

import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>{danger ? '⚠️' : '❓'}</div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message} style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
        <div className={styles.actions}>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
