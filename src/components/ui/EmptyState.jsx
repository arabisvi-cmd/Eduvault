import React from 'react';
import Button from './Button';

/**
 * Standardized EduVault EmptyState Component
 * Displays icon, title, description, and an actionable CTA button.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  children,
}) {
  return (
    <div className={`ev-empty-state ${className}`.trim()}>
      {Icon && (
        <div className="ev-empty-icon">
          <Icon size={24} aria-hidden="true" />
        </div>
      )}
      <h4 className="ev-empty-title">{title}</h4>
      {description && <p className="ev-empty-desc">{description}</p>}

      {actionLabel && onAction && (
        <Button
          variant="primary"
          icon={actionIcon}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}

      {children}
    </div>
  );
}
