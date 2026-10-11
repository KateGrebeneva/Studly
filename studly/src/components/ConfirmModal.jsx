import React from 'react';
import { AlertTriangle, PencilLine } from 'lucide-react';
import { Modal } from './ui';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, title, message, confirmText = 'Удалить', cancelText = 'Отмена', onConfirm, onCancel, variant = 'danger' }) => {
  const isForm = typeof message !== 'string';
  const danger = variant === 'danger';
  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      labelledBy="cm-title"
      accent={danger ? 'var(--danger)' : 'var(--primary)'}
      className={`cm ${isForm ? 'cm-form' : ''}`}
    >
      <div className={`cm-icon cm-${variant}`} aria-hidden="true">
        {danger ? <AlertTriangle size={26} /> : <PencilLine size={24} />}
      </div>
      <h2 id="cm-title" className="cm-title">{title}</h2>
      {isForm ? <div className="cm-body">{message}</div> : <p className="cm-message">{message}</p>}
      <div className="modal-foot cm-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelText}</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
