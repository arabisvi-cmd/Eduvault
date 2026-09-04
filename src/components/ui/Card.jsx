import React from 'react';

/**
 * Standardized EduVault Surface Card
 */
export function SurfaceCard({ children, className = '', ...props }) {
  return (
    <div className={`ev-surface-card ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

/**
 * Standardized EduVault Summary Card (Metrics & Counts)
 */
export function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
  action,
  className = '',
  onClick,
  ...props
}) {
  return (
    <div 
      className={`ev-summary-card ${className}`.trim()} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      {...props}
    >
      <div className="ev-summary-top">
        {Icon && (
          <div className="ev-summary-icon">
            <Icon size={18} aria-hidden="true" />
          </div>
        )}
        <div className="ev-summary-value">{value ?? '—'}</div>
      </div>
      <div>
        <h4 className="ev-summary-title">{title}</h4>
        {description && <p className="ev-summary-desc">{description}</p>}
      </div>
      {action && <div style={{ marginTop: 'auto', paddingTop: '8px' }}>{action}</div>}
    </div>
  );
}

/**
 * Standardized EduVault Action Card (Clickable navigation / primary options)
 */
export function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={`ev-action-card ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {Icon && (
        <div className="ev-summary-icon" style={{ flexShrink: 0 }}>
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 className="ev-summary-title" style={{ fontSize: '15px', marginBottom: '4px' }}>{title}</h4>
        {description && <p className="ev-summary-desc">{description}</p>}
      </div>
    </button>
  );
}

export default SurfaceCard;
