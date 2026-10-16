import React, { useState, useEffect } from 'react';
import { fetchBrief } from '../api';

export const HomePage = ({ user, onNavigateToCopilot, onNavigateToPage }) => {
  const [briefData, setBriefData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadBrief = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchBrief();
      setBriefData(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load morning brief.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrief();
  }, []);

  const handleActionClick = (item) => {
    if (item.target === 'copilot' && item.prompt) {
      onNavigateToCopilot(item.prompt);
    } else if (item.target) {
      onNavigateToPage(item.target);
    }
  };

  // Severity order for sorting: high -> medium -> low
  const severityRank = { high: 1, medium: 2, low: 3 };
  const sortedItems = briefData?.items
    ? [...briefData.items].sort((a, b) => (severityRank[a.severity] || 4) - (severityRank[b.severity] || 4))
    : [];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          {briefData?.greeting || `Good morning, ${user?.username || 'Staff'}!`}
        </h1>
        <p className="page-subtitle">
          {briefData?.summary || 'Daily operational overview and priority actions.'}
        </p>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="error-box">
          <span>⚠️</span>
          <div style={{ flex: 1 }}>
            <div>{errorMessage}</div>
            <button
              onClick={loadBrief}
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
          <div>Loading your morning brief...</div>
        </div>
      )}

      {/* Alert Items List */}
      {!isLoading && !errorMessage && (
        <>
          {sortedItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                All clear today
              </h3>
              <p style={{ fontSize: '0.85rem' }}>No pending alerts or urgent actions required right now.</p>
            </div>
          ) : (
            <div>
              {sortedItems.map((item) => {
                const sevClass = item.severity || 'low';
                const badgeSevClass = `badge-${sevClass}`;

                return (
                  <div key={item.id} className={`alert-card ${sevClass}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`badge ${badgeSevClass}`} style={{ textTransform: 'capitalize' }}>
                          {item.severity}
                        </span>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: '600', color: 'var(--text-main)' }}>
                          {item.title}
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                        {item.detail}
                      </p>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleActionClick(item)}
                      >
                        {item.action_label || 'Take Action'} →
                      </button>
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
