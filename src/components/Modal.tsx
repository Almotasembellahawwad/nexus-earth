'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({
  open,
  close,
  title,
  children,
  className = '',
}: {
  open: boolean;
  close: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`modal ${className}`}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <span>{title}</span>
        <button className="icon-button" onClick={close} aria-label={`Close ${title}`}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
