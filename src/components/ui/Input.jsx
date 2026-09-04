import React, { forwardRef } from 'react';

/**
 * Standardized EduVault Input Component
 * Supports standard (40px) and compact (32px), error state, disabled, left/right adornments.
 */
const Input = forwardRef(function Input({
  type = 'text',
  size = 'default',
  error = false,
  className = '',
  disabled = false,
  ...props
}, ref) {
  const sizeClass = size === 'compact' ? 'ev-input-compact' : '';
  const errorClass = error ? 'has-error' : '';

  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={`ev-input-control ${sizeClass} ${errorClass} ${className}`.trim()}
      {...props}
    />
  );
});

export default Input;
