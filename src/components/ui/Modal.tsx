import React, { useEffect } from "react";
import ReactDOM from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, ariaLabel }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">✕</button>
        {children}
      </div>
      <style jsx global>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.55);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: #fff;
          color: #222;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          min-width: 600px;
          max-width: 95vw;
          width: 50vw;
          max-height: 95vh;
          overflow-y: auto;
          padding: 1.5rem;
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: #555;
          line-height: 1;
          padding: 0.25rem 0.5rem;
          transition: color 0.2s;
        }
        .modal-close:hover {
          color: #000;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal;
