"use client";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Action = { label: string; onClick: () => void; disabled?: boolean };

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  primaryAction?: Action;
  secondaryAction?: Action;
  widthClass?: string;
};

function BaseModal({ open, title, onClose, children, primaryAction, secondaryAction, widthClass = "max-w-2xl" }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) { document.addEventListener("keydown", handler); }
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      <div ref={panelRef} className={`w-11/12 ${widthClass} mx-auto p-6 border shadow-2xl rounded-xl bg-white`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-700 hover:text-gray-900">✕</button>
        </div>
        <div>{children}</div>
        <div className="mt-6 flex gap-2 justify-end">
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} disabled={secondaryAction.disabled} className="px-4 py-2 border rounded-md bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50">
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button onClick={primaryAction.onClick} disabled={primaryAction.disabled} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 focus:ring-2 focus:ring-green-500">
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const Modal = React.memo(BaseModal);
export default Modal;
