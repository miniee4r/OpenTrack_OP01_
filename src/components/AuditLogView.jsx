import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  Terminal,
  CheckCircle2,
  Clock,
  UserCheck
} from 'lucide-react';

export const AuditLogView = () => {
  const { auditLogs } = useRole();
  const [filterAction, setFilterAction] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'All' && !(log.action || '').includes(filterAction)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const summaryText = (log.summary || log.detail || '').toLowerCase();
      const whoText = (log.operatorName || log.who || '').toLowerCase();
      const roleText = (log.operatorRole || log.role || '').toLowerCase();
      const queryText = (log.query || log.action || '').toLowerCase();
      return (
        summaryText.includes(q) ||
        whoText.includes(q) ||
        roleText.includes(q) ||
        queryText.includes(q)
      );
    }
    return true;
  });

  const exportLogsAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `novix_audit_trail_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-info">
                <ScrollText size={12} />
                Compliance & Security
              </span>
              <span className="badge badge-success">
                <ShieldCheck size={12} />
                Cryptographically Signed Ledger
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Immutable System Operations Audit Trail
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Every AI copilot query, human approval, timetable recalculation, and security intercept is stamped and permanently preserved.
            </p>
          </div>

          <button onClick={exportLogsAsJson} className="btn btn-secondary">
            <Download size={14} />
            <span>Export Verified Audit (JSON)</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by operator, query text, or summary..."
              className="input-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['All', 'QUERY', 'WHATSAPP', 'REPLAN', 'DENIED'].map(type => (
              <button
                key={type}
                onClick={() => setFilterAction(type)}
                className={`btn btn-sm ${filterAction === type ? 'btn-primary' : 'btn-ghost'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp & ID</th>
                <th>Operator & Role</th>
                <th>Operational Action</th>
                <th>Query / Executed Code</th>
                <th>Security Check</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const isDenied = log.action.includes('DENIED');
                return (
                  <tr key={log.id} style={{ background: isDenied ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                        {log.id}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {log.timestamp}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: '600', color: '#cbd5e1', fontSize: '0.82rem' }}>
                        {log.operatorName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: isDenied ? '#fca5a5' : 'var(--primary-light)' }}>
                        {log.operatorRole}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span className={`badge ${isDenied ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                          {log.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
                        {log.summary}
                      </div>
                    </td>

                    <td style={{ maxWidth: '380px' }}>
                      <pre style={{
                        background: '#060911',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        color: isDenied ? '#f87171' : '#38bdf8',
                        overflowX: 'auto',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                      }}>
                        <code>{log.query}</code>
                      </pre>
                    </td>

                    <td>
                      <span className={`badge ${isDenied ? 'badge-danger' : 'badge-success'}`}>
                        {log.securityCheck}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
