import React from 'react';
import EmptyState from './EmptyState';

/**
 * Standardized EduVault DataTable Component
 * Columns: [{ key, header, render, width, align }]
 * Rows: Array of objects
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display in this view.',
  emptyActionLabel,
  onEmptyAction,
  emptyActionIcon,
  keyExtractor = (item, index) => item.id || index,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`ev-table-wrapper ${className}`.trim()} style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ev-text-secondary)', fontSize: '13px' }}>
          <span className="ev-btn-spinner" aria-hidden="true" style={{ width: '16px', height: '16px' }} />
          <span>Loading academic records...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        actionIcon={emptyActionIcon}
      />
    );
  }

  return (
    <div className={`ev-table-wrapper ${className}`.trim()} style={{ overflowX: 'auto' }}>
      <table className="ev-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={col.key || idx} 
                className="ev-th" 
                style={{ 
                  width: col.width,
                  textAlign: col.align || 'left'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={keyExtractor(row, rowIdx)} className="ev-tr">
              {columns.map((col, colIdx) => (
                <td 
                  key={col.key || colIdx} 
                  className="ev-td" 
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.render ? col.render(row, rowIdx) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
