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
      {/* Header Row */}
      <div className="page-header">
        <h1 className="page-title">At-Risk Students</h1>
        <p className="page-subtitle">
          Weighted risk analysis based on consecutive absenteeism, fee instalment delays, and overdue EMIs.
        </p>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
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

      {/* Loading Skeletons */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card skeleton" style={{ height: '110px' }}></div>
          <div className="card skeleton" style={{ height: '110px' }}></div>
          <div className="card skeleton" style={{ height: '110px' }}></div>
        </div>
      )}

      {/* Student Cards List */}
      {!isLoading && !errorMessage && (
        <>
          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <h3 className="section-title" style={{ marginBottom: '4px' }}>
                No students found
              </h3>
              <p className="helper-text">No student profiles match the '{riskFilter}' risk filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                      marginBottom: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {s.name}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
                          Batch: {s.batch}
                        </span>
                        <span className={`badge ${badgeClass}`} style={{ textTransform: 'capitalize' }}>
                          {s.risk} Risk
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                          Risk Score: <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{s.score}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onAskCopilotAboutStudent(s)}
                        >
                          Ask Copilot →
                        </button>
                      </div>
                    </div>

                    {/* Reasons List */}
                    {s.reasons && s.reasons.length > 0 && (
                      <div style={{
                        backgroundColor: 'var(--bg-card-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: 'var(--text-main)',
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Risk Factors:
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
