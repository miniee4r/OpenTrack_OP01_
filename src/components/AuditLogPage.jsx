import React, { useState, useEffect } from 'react';
import { fetchAuditLogs } from '../api';

export const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAudit = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchAuditLogs();
      setLogs(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const getActionBadgeClass = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('QUERY')) return 'badge-info';
    if (act.includes('BLOCK') || act.includes('DENIED')) return 'badge-danger';
    if (act.includes('DRAFT')) return 'badge-warning';
    if (act.includes('SENT') || act.includes('APPROVE')) return 'badge-success';
    if (act.includes('REJECT')) return 'badge-neutral';
    return 'badge-neutral';
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Audit Ledger</h1>
          <p className="page-subtitle">
            Cryptographically signed immutable trail of all staff operations, security checks, and query activity.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadAudit}
          disabled={isLoading}
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="error-box">
          <span>⚠️</span>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="loading-box">
          <div className="spinner"></div>
          <div>Loading audit logs...</div>
        </div>
      )}

      {/* Audit Table */}
      {!isLoading && !errorMessage && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Time</th>
                  <th style={{ width: '130px' }}>User</th>
                  <th style={{ width: '110px' }}>Role</th>
                  <th style={{ width: '130px' }}>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {log.ts}
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        {log.who}
                      </td>
                      <td>
                        <span className={`badge badge-role-${(log.role || 'owner').toLowerCase()}`} style={{ textTransform: 'capitalize' }}>
                          {log.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.84rem', color: '#374151', lineHeight: '1.45' }}>
                        {log.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
