import React from 'react';

/**
 * Standardized EduVault Button Component
 * Variants: primary, secondary, tertiary, danger, danger-outline, icon
 * Sizes: default (40px), compact (32px)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  onClick,
  title,
  ...props
}) {
  const variantClass = `ev-btn-${variant}`;
  const sizeClass = size === 'compact' ? 'ev-btn-compact' : '';
  const iconClass = variant === 'icon' ? 'ev-btn-icon' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={`ev-btn ${variantClass} ${sizeClass} ${iconClass} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <>
          <span className="ev-btn-spinner" aria-hidden="true" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'compact' ? 14 : 16} aria-hidden="true" />}
          {children && <span>{children}</span>}
          {IconRight && <IconRight size={size === 'compact' ? 14 : 16} aria-hidden="true" />}
        </>
      )}
    </button>
  );
}
