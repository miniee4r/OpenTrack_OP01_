import React, { useState, useEffect } from 'react';
import { fetchBrief } from '../api';

export const HomePage = ({ user, pendingCount = 0, onNavigateToCopilot, onNavigateToPage }) => {
  const [briefData, setBriefData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const role = user?.role || 'owner';

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

  const totalAlerts = sortedItems.length;

  // Compute the 3 role-specific stat cards strictly per B2
  const renderStatCards = () => {
    if (role === 'accounts') {
      // 1. Total alerts, 2. Due this week, 3. Pending approvals
      const emiItem = sortedItems.find((i) => i.type === 'emi_due');
      let dueThisWeekCount = 0;
      if (emiItem) {
        const match = emiItem.title.match(/(\d+)/);
        dueThisWeekCount = match ? parseInt(match[1], 10) : 1;
      }

      return (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info-text)' }}>
              🔔
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Alerts</div>
              <div className="stat-value">{totalAlerts}</div>
              <div className="stat-helper">Operational updates today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning-text)' }}>
              💰
            </div>
            <div className="stat-info">
              <div className="stat-label">Due This Week</div>
              <div className="stat-value stat-warning">{dueThisWeekCount}</div>
              <div className="stat-helper">Unpaid student EMIs</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-text)' }}>
              📋
            </div>
            <div className="stat-info">
              <div className="stat-label">Pending Approvals</div>
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-helper">Fee waivers & reminders</div>
            </div>
          </div>
        </div>
      );
    }

    if (role === 'trainer') {
      // 1. Total alerts, 2. At-risk students, 3. Classes this week
      const attItem = sortedItems.find((i) => i.type === 'attendance_deficit');
      let atRiskCount = 0;
      if (attItem) {
        const match = attItem.title.match(/(\d+)/);
        atRiskCount = match ? parseInt(match[1], 10) : 1;
      }

      const timetableItem = sortedItems.find((i) => i.type === 'timetable_status');
      let classesCount = 0;
      if (timetableItem) {
        const match = timetableItem.detail.match(/(\d+)\s+classes/);
        classesCount = match ? parseInt(match[1], 10) : 5;
      }

      return (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info-text)' }}>
              🔔
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Alerts</div>
              <div className="stat-value">{totalAlerts}</div>
              <div className="stat-helper">Active batch updates</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
              ⚠️
            </div>
            <div className="stat-info">
              <div className="stat-label">At-Risk Students</div>
              <div className="stat-value stat-high">{atRiskCount}</div>
              <div className="stat-helper">Severe absenteeism</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success-text)' }}>
              📅
            </div>
            <div className="stat-info">
              <div className="stat-label">Classes This Week</div>
              <div className="stat-value stat-success">{classesCount}</div>
              <div className="stat-helper">Scheduled sessions</div>
            </div>
          </div>
        </div>
      );
    }

    // counselor and owner: 1. Total alerts, 2. High priority, 3. Pending approvals
    const highPriorityCount = sortedItems.filter((i) => (i.severity || '').toLowerCase() === 'high').length;

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info-text)' }}>
            🔔
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Alerts</div>
            <div className="stat-value">{totalAlerts}</div>
            <div className="stat-helper">Institute operational status</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)' }}>
            ⚡
          </div>
          <div className="stat-info">
            <div className="stat-label">High Priority</div>
            <div className="stat-value stat-high">{highPriorityCount}</div>
            <div className="stat-helper">Requires urgent attention</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-text)' }}>
            📋
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value stat-warning">{pendingCount}</div>
            <div className="stat-helper">Awaiting authorization</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      {/* Header with Greeting & Date (B1) */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 className="page-title">
              {briefData?.greeting || `Good morning, ${user?.username || 'Staff'}!`}
            </h1>
            <p className="page-subtitle">
              {briefData?.summary || 'Daily operational overview and priority actions.'}
            </p>
          </div>
          {briefData?.date && (
            <div className="header-date-badge">
              <span>📅</span>
              <span>{briefData.date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="error-box" role="alert" style={{ marginBottom: '20px' }}>
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

      {/* Loading Skeletons */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="stats-grid">
            <div className="stat-card skeleton" style={{ height: '100px' }}></div>
            <div className="stat-card skeleton" style={{ height: '100px' }}></div>
            <div className="stat-card skeleton" style={{ height: '100px' }}></div>
          </div>
          <div className="card skeleton" style={{ height: '90px' }}></div>
          <div className="card skeleton" style={{ height: '90px' }}></div>
          <div className="card skeleton" style={{ height: '90px' }}></div>
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && !errorMessage && (
        <>
          {/* Role-Specific 3 Stat Cards */}
          {renderStatCards()}

          {/* Alert Cards Section */}
          <div style={{ marginTop: '24px' }}>
            <h2 className="section-title" style={{ marginBottom: '16px' }}>
              Priority Morning Brief
            </h2>

            {sortedItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <h3 className="section-title" style={{ marginBottom: '4px' }}>
                  All clear today
                </h3>
                <p className="helper-text">No pending alerts or urgent actions required right now.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {sortedItems.map((item) => {
                  const sevClass = (item.severity || 'low').toLowerCase();

                  return (
                    <div key={item.id} className={`alert-card alert-border-${sevClass}`}>
                      <div className="alert-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className={`badge badge-${sevClass}`} style={{ textTransform: 'capitalize' }}>
                            {item.severity}
                          </span>
                          <h3 className="alert-title">{item.title}</h3>
                        </div>
                        <p className="alert-detail">{item.detail}</p>
                      </div>

                      <div className="alert-action">
                        <button
                          type="button"
                          className="btn btn-primary"
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
          </div>
        </>
      )}
    </div>
  );
};
