import React, { useState, useEffect } from 'react';
import { fetchPendingActions, approvePendingAction, rejectPendingAction } from '../api';

export const ApprovalsPage = ({ onPendingCountChange }) => {
  const [actions, setActions] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'sent' | 'rejected'
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadPending = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchPendingActions();
      const list = data || [];
      setActions(list);
      const pendingCount = list.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
      if (onPendingCountChange) onPendingCountChange(pendingCount);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load approvals queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await approvePendingAction(id);
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'sent' } : a))
      );
      if (onPendingCountChange) {
        setActions((current) => {
          const count = current.filter((a) => a.id !== id && (a.status || '').toLowerCase() === 'pending').length;
          onPendingCountChange(count);
          return current;
        });
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await rejectPendingAction(id);
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
      );
      if (onPendingCountChange) {
        setActions((current) => {
          const count = current.filter((a) => a.id !== id && (a.status || '').toLowerCase() === 'pending').length;
          onPendingCountChange(count);
          return current;
        });
      }
    } catch (err) {
      alert(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredActions = actions.filter((a) => {
    const s = (a.status || '').toLowerCase();
    return s === activeTab.toLowerCase();
  });

  const pendingTotal = actions.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  const sentTotal = actions.filter((a) => (a.status || '').toLowerCase() === 'sent').length;
  const rejectedTotal = actions.filter((a) => (a.status || '').toLowerCase() === 'rejected').length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Message Approvals</h1>
        <p className="page-subtitle">
          Human-in-the-loop verification. No WhatsApp message or notification is sent without explicit authorization.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`chip ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span>Pending ({pendingTotal})</span>
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <span>Sent ({sentTotal})</span>
        </button>
        <button
          type="button"
          className={`chip ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          <span>Rejected ({rejectedTotal})</span>
        </button>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="error-box">
          <span>⚠️</span>
          <div style={{ flex: 1 }}>
            <div>{errorMessage}</div>
            <button
              onClick={loadPending}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '8px' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="loading-box">
          <div className="spinner"></div>
          <div>Loading approval queue...</div>
        </div>
      )}

      {/* Actions List */}
      {!isLoading && !errorMessage && (
        <>
          {filteredActions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                Nothing waiting for approval.
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                {activeTab === 'pending'
                  ? 'All communication drafts have been reviewed and decided.'
                  : `No messages currently in the '${activeTab}' state.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredActions.map((item) => {
                const s = (item.status || 'pending').toLowerCase();
                const isItemPending = s === 'pending';

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          {item.student_name || item['student name']}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {item.phone}
                        </span>
                        <span className={`badge ${s === 'sent' ? 'badge-success' : s === 'rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ textTransform: 'capitalize' }}>
                          {s}
                        </span>
                      </div>

                      {isItemPending && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => handleReject(item.id)}
                            disabled={processingId === item.id}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(item.id)}
                            disabled={processingId === item.id}
                          >
                            {processingId === item.id ? 'Approving...' : 'Approve & Send'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      fontSize: '0.85rem',
                      color: '#374151',
                      fontStyle: 'italic',
                      lineHeight: '1.45',
                    }}>
                      "{item.message}"
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
