import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import IconButton from './IconButton';

/**
 * Standardized EduVault Modal Component
 * Backdrop blur, focus containment, title, description, close button, Escape dismiss.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default',
  closeOnOverlayClick = true,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="ev-modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={containerRef}
        className={`ev-modal-container ${size === 'lg' ? 'ev-modal-lg' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ev-modal-title"
      >
        <div className="ev-modal-header">
          <div>
            <h3 id="ev-modal-title" className="ev-modal-title">{title}</h3>
            {description && <p className="ev-modal-desc">{description}</p>}
          </div>
          <IconButton
            icon={X}
            variant="tertiary"
            size="compact"
            title="Close dialog"
            ariaLabel="Close"
            onClick={onClose}
          />
        </div>

        <div className="ev-modal-body">
          {children}
        </div>

        {footer && (
          <div className="ev-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
