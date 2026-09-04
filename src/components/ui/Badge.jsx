import React from 'react';

/**
 * Standardized EduVault Status Badge
 * Canonical status variants: active, inactive, current
 */
export default function Badge({
  status = 'active',
  label,
  children,
  className = '',
  ...props
}) {
  const normalized = (status || '').toLowerCase();
  const statusClass = 
    normalized === 'active' || normalized === 'published' 
      ? 'ev-badge-active' 
      : normalized === 'current' 
        ? 'ev-badge-current' 
        : 'ev-badge-inactive';

  return (
    <span className={`ev-badge ${statusClass} ${className}`.trim()} {...props}>
      {children || label || (normalized === 'active' ? 'Active' : normalized === 'current' ? 'Current' : 'Inactive')}
    </span>
  );
}
