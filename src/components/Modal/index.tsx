import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}

export function Modal({ title, description, children, onClose, busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; previousFocus?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className="mise-modal" aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className="mise-modal-panel"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="mise-icon-button" type="button" aria-label="关闭弹窗" onClick={onClose} disabled={busy}><X size={19} /></button></header>{children}</section></dialog>;
}

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel = '确认', onConfirm, onCancel }: ConfirmDialogProps) {
  return <Modal title={title} description={description} onClose={onCancel}><div className="mise-dialog-actions"><button type="button" className="mise-secondary-button" onClick={onCancel}>取消</button><button type="button" className="mise-danger-button" onClick={onConfirm}>{confirmLabel}</button></div></Modal>;
}
