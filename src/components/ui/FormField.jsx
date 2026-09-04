import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Standardized EduVault FormField Component
 * Pairs label, required marker, optional helper text, control, and validation error.
 */
export default function FormField({
  label,
  required = false,
  helperText,
  error,
  children,
  id,
  className = '',
}) {
  return (
    <div className={`ev-form-field ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="ev-form-label">
          <span>{label}</span>
          {required && <span className="ev-form-required" aria-hidden="true">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <div className="ev-form-error" role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <span className="ev-form-helper">{helperText}</span>
      ) : null}
    </div>
  );
}
