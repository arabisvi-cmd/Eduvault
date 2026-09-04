import React from 'react';
import { ArrowLeft } from 'lucide-react';
import IconButton from './IconButton';

/**
 * Standardized EduVault PageHeader Component
 */
export default function PageHeader({
  title,
  description,
  onBack,
  backTitle = 'Back',
  actions,
  children,
  className = '',
}) {
  return (
    <div className={`ev-page-header-container ${className}`.trim()}>
      <div className="ev-page-header">
        <div className="ev-page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onBack && (
              <IconButton
                icon={ArrowLeft}
                variant="secondary"
                size="compact"
                title={backTitle}
                ariaLabel={backTitle}
                onClick={onBack}
              />
            )}
            <h2 className="ev-page-title">{title}</h2>
          </div>
          {description && <p className="ev-page-desc">{description}</p>}
        </div>

        {actions && (
          <div className="ev-page-actions">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
