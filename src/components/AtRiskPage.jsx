import React, { useState, useEffect } from 'react';
import { fetchAtRiskStudents } from '../api';

export const AtRiskPage = ({ onAskCopilotAboutStudent }) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [riskFilter, setRiskFilter] = useState('All'); // 'All' | 'High' | 'Medium' | 'Low'

  const loadAtRiskData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchAtRiskStudents();
      setStudents(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load at-risk students.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAtRiskData();
  }, []);

  const filteredStudents = students.filter((s) => {
    if (riskFilter === 'All') return true;
    return (s.risk || '').toLowerCase() === riskFilter.toLowerCase();
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">At-Risk Students</h1>
        <p className="page-subtitle">
          Weighted risk analysis based on consecutive absenteeism, fee instalment delays, and overdue EMIs.
        </p>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
          Filter by Risk:
        </span>
        {['All', 'High', 'Medium', 'Low'].map((level) => (
          <button
            key={level}
            type="button"
            className={`chip ${riskFilter === level ? 'active' : ''}`}
            onClick={() => setRiskFilter(level)}
          >
            <span>{level}</span>
          </button>
        ))}
      </div>

      {/* Error Box */}
      {errorMessage && (
        <div className="error-box">
          <span>⚠️</span>
          <div style={{ flex: 1 }}>
            <div>{errorMessage}</div>
            <button
              onClick={loadAtRiskData}
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
          <div>Analyzing student risk signals...</div>
        </div>
      )}

      {/* Student Cards Grid */}
      {!isLoading && !errorMessage && (
        <>
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                No students found
              </h3>
              <p style={{ fontSize: '0.85rem' }}>No student profiles match the '{riskFilter}' risk filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredStudents.map((s) => {
                const badgeClass =
                  s.risk === 'high' ? 'badge-high' : s.risk === 'medium' ? 'badge-medium' : 'badge-low';

                return (
                  <div
                    key={s.student_id}
                    className="card"
                    style={{
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
                          {s.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
                          Batch: {s.batch}
                        </span>
                        <span className={`badge ${badgeClass}`} style={{ textTransform: 'capitalize' }}>
                          {s.risk} Risk
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                          Risk Score: <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{s.score}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onAskCopilotAboutStudent(s)}
                        >
                          Ask copilot about this student →
                        </button>
                      </div>
                    </div>

                    {/* Reasons List */}
                    {s.reasons && s.reasons.length > 0 && (
                      <div style={{
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        fontSize: '0.82rem',
                        color: 'var(--text-main)',
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Root Causes:
                        </div>
                        <ul style={{ paddingLeft: '18px', margin: 0 }}>
                          {s.reasons.map((r, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
