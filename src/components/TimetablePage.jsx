import React, { useState, useEffect } from 'react';
import { fetchTimetable, replanTimetable, resetTimetable } from '../api';

export const TimetablePage = () => {
  const [timetable, setTimetable] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [changes, setChanges] = useState([]);
  const [disruption, setDisruption] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplanning, setIsReplanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown states
  const [selectedTrainer, setSelectedTrainer] = useState('Ravi');
  const [selectedDay, setSelectedDay] = useState('Friday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['10:00', '14:00', '16:00'];

  const loadTimetable = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchTimetable();
      setTimetable(data?.timetable || []);
      setUnavailable(data?.unavailable || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load timetable.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const handleReplan = async () => {
    setIsReplanning(true);
    setErrorMessage('');
    try {
      const res = await replanTimetable(selectedTrainer, selectedDay);
      setTimetable(res.timetable || []);
      setChanges(res.changes || []);
      setDisruption({ disruption: res.disruption, total: res.total });
      // Update unavailable list
      setUnavailable((prev) => {
        const entry = { trainer: selectedTrainer, day: selectedDay };
        return [...prev.filter((u) => u.trainer !== selectedTrainer || u.day !== selectedDay), entry];
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to re-plan timetable.');
    } finally {
      setIsReplanning(false);
    }
  };

  const handleReset = async () => {
    setIsReplanning(true);
    setErrorMessage('');
    try {
      const res = await resetTimetable();
      setTimetable(res.timetable || []);
      setUnavailable([]);
      setChanges([]);
      setDisruption(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset timetable.');
    } finally {
      setIsReplanning(false);
    }
  };

  // Color mapping per batch
  const getBatchStyle = (batchName, isMoved) => {
    let bg = '#F3F4F6';
    let text = '#374151';
    let border = '#E5E7EB';

    if (batchName.includes('Java')) {
      bg = '#EFF6FF';
      text = '#1E40AF';
      border = '#BFDBFE';
    } else if (batchName.includes('Python')) {
      bg = '#ECFDF5';
      text = '#065F46';
      border = '#A7F3D0';
    } else if (batchName.includes('Web')) {
      bg = '#F5F3FF';
      text = '#5B21B6';
      border = '#DDD6FE';
    }

    if (isMoved) {
      border = '#F59E0B';
    }

    return {
      backgroundColor: bg,
      color: text,
      border: isMoved ? '2px solid #F59E0B' : `1px solid ${border}`,
      borderRadius: '8px',
      padding: '8px 10px',
      position: 'relative',
      boxShadow: isMoved ? '0 0 0 2px rgba(245, 158, 11, 0.2)' : 'none',
    };
  };

  const changedBatches = new Set(changes.map((c) => c.batch));

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Master Timetable</h1>
        <p className="page-subtitle">
          Weekly clash-free schedule with room capacity constraints and zero trainer double-bookings.
        </p>
      </div>

      {/* Top Card: "A trainer is unavailable?" */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📅</span>
          <span>A trainer is unavailable?</span>
        </h3>
        <p className="card-description">
          Select the absent trainer and day. The heuristic solver moves ONLY the affected classes with minimum disruption.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Trainer</label>
            <select
              className="select-control"
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
            >
              <option value="Ravi">Ravi (Java-A, Web-C)</option>
              <option value="Meena">Meena (Python-B)</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>Unavailable Day</label>
            <select
              className="select-control"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              {days.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReplan}
              disabled={isReplanning}
            >
              {isReplanning ? 'Re-planning...' : 'Re-plan timetable'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={isReplanning}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Unavailable Banner if any */}
        {unavailable.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {unavailable.map((u, i) => (
              <span key={i} className="badge badge-warning" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                ⚠️ Trainer {u.trainer} unavailable on {u.day}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Disruption Summary Card (after replanning) */}
      {disruption && changes.length > 0 && (
        <div className="card" style={{ borderLeft: '5px solid var(--warning)', backgroundColor: '#FFFDF9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--warning-text)' }}>
              Disruption: {disruption.disruption} of {disruption.total} classes moved
            </h3>
            <span className="badge badge-warning">Zero Clashes Invariant Maintained</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {changes.map((chg, idx) => (
              <div key={idx} style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>
                <div>
                  <strong>{chg.batch}</strong>: <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{chg.from}</span> → <strong style={{ color: 'var(--primary)' }}>{chg.to}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {chg.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <div>Loading weekly timetable grid...</div>
        </div>
      )}

      {/* Weekly Grid */}
      {!isLoading && (
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px repeat(5, minmax(160px, 1fr))',
            gap: '8px',
            minWidth: '780px',
          }}>
            {/* Header row */}
            <div style={{ padding: '10px', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Time / Day
            </div>
            {days.map((d) => (
              <div
                key={d}
                style={{
                  padding: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  textAlign: 'center',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '6px',
                }}
              >
                {d}
              </div>
            ))}

            {/* Time Slot Rows */}
            {times.map((t) => (
              <React.Fragment key={t}>
                {/* Time label */}
                <div style={{
                  padding: '12px 6px',
                  fontWeight: '600',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {t}
                </div>

                {/* Day cells */}
                {days.map((d) => {
                  const classItem = timetable.find(
                    (s) => s.day?.toLowerCase() === d.toLowerCase() && s.time?.startsWith(t)
                  );

                  const isMoved = classItem && changedBatches.has(classItem.batch);

                  return (
                    <div
                      key={`${d}-${t}`}
                      style={{
                        backgroundColor: classItem ? 'transparent' : '#FAFAFA',
                        border: '1px dashed var(--border-light)',
                        borderRadius: '8px',
                        padding: '6px',
                        minHeight: '82px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      {classItem ? (
                        <div style={getBatchStyle(classItem.batch, isMoved)}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '0.84rem' }}>{classItem.batch}</strong>
                            {isMoved && (
                              <span style={{
                                backgroundColor: '#F59E0B',
                                color: '#FFFFFF',
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                              }}>
                                moved
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                            👨‍🏫 {classItem.trainer}
                          </div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                            📍 Room {classItem.room}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#D1D5DB', fontSize: '0.75rem' }}>
                          — Free —
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
