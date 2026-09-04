import React from 'react';
import Button from './Button';

/**
 * Standardized EduVault Icon Button Component
 * Compact or default square icon button with mandatory accessibility label/title.
 */
export default function IconButton({
  icon: Icon,
  variant = 'tertiary',
  size = 'compact',
  title,
  ariaLabel,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <Button
      variant={variant === 'tertiary' ? 'tertiary ev-btn-icon' : `${variant} ev-btn-icon`}
      size={size}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      title={title || ariaLabel}
      aria-label={ariaLabel || title}
      className={className}
      {...props}
    >
      <Icon size={size === 'compact' ? 15 : 18} aria-hidden="true" />
    </Button>
  );
}
