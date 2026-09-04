import React, { forwardRef } from 'react';

/**
 * Standardized EduVault Select Component
 * Consistent 40px standard (32px compact), custom focus ring, error states.
 */
const Select = forwardRef(function Select({
  size = 'default',
  error = false,
  className = '',
  disabled = false,
  children,
  ...props
}, ref) {
  const sizeClass = size === 'compact' ? 'ev-select-compact' : '';
  const errorClass = error ? 'has-error' : '';

  return (
    <select
      ref={ref}
      disabled={disabled}
      className={`ev-select-control ${sizeClass} ${errorClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
