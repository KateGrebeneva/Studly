import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, title, message, confirmText = 'Удалить', cancelText = 'Отмена', onConfirm, onCancel, variant = 'danger' }) => {
  if (!isOpen) return null;
  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className={`confirm-modal-icon ${variant}`}>
          <AlertTriangle size={32} />
        </div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-btn cancel" onClick={onCancel}>{cancelText}</button>
          <button className={`confirm-modal-btn confirm ${variant}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
