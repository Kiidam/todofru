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
        <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">×</button>
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
          max-width: 90vw;
          width: 40vw;
          max-height: 90vh;
          overflow-y: auto;
          padding: 2rem;
          position: relative;
        }
        @media (max-width: 768px) {
          .modal-content {
            min-width: unset;
            width: 90vw;
            padding: 1rem;
          }
        }
        .modal-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #666;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .modal-close:hover {
          background: #f5f5f5;
          color: #333;
        }
        .modal-close:focus {
          outline: 2px solid #0070f3;
          outline-offset: 2px;
        }
        .modal-content label {
          color: #333;
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          display: block;
        }
        .modal-content input, .modal-content textarea, .modal-content select {
          background: #fafafa;
          color: #222;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 1rem;
          width: 100%;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .modal-content input:focus, .modal-content textarea:focus, .modal-content select:focus {
          border: 1.5px solid #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
          background: #fff;
          color: #111;
          outline: none;
        }
        .modal-content input[disabled], .modal-content textarea[disabled], .modal-content select[disabled] {
          background: #f3f4f6;
          color: #6b7280;
          border-color: #d1d5db;
          opacity: 1;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal;
