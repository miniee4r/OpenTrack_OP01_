import React, { useState, useEffect } from 'react';
import { fetchTimetable, replanTimetable, resetTimetable } from '../api';

export const TimetablePage = ({ user, onNavigateToPage }) => {
  const [timetable, setTimetable] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [trainersList, setTrainersList] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [changes, setChanges] = useState([]);
  const [disruption, setDisruption] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplanning, setIsReplanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dropdown states
  const [selectedTrainer, setSelectedTrainer] = useState('Ravi');
  const [selectedDay, setSelectedDay] = useState('Friday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['10:00', '12:00', '14:00', '16:00']; // Exactly 4 time slots (B5)

  const loadTimetable = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchTimetable();
      setTimetable(data?.timetable || []);
      setUnavailable(data?.unavailable || []);
      setTrainersList(data?.trainers || []);
      setCanEdit(!!data?.can_edit);

      if (data?.trainers && data.trainers.length > 0 && !selectedTrainer) {
        setSelectedTrainer(data.trainers[0].name);
      }
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

  // Distinct soft color per batch (B5)
  const getBatchColors = (batchName) => {
    if (batchName.includes('Java')) {
      return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }; // Soft Blue
    }
    if (batchName.includes('Python')) {
      return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }; // Soft Green
    }
    if (batchName.includes('Web')) {
      return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' }; // Soft Violet
    }
    if (batchName.includes('Data Science')) {
      return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }; // Soft Amber
    }
    if (batchName.includes('Full Stack')) {
      return { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' }; // Soft Rose
    }
    return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
  };

  const changedBatches = new Set(changes.map((c) => c.batch));

  // Extract distinct batches for the color legend (B5)
  const allBatches = Array.from(new Set(timetable.map((s) => s.batch))).sort();

  return (
    <div className="page-wrapper">
      {/* Header Row */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Master Timetable</h1>
        <p className="page-subtitle">
          Weekly clash-free schedule with room capacity constraints and zero trainer double-bookings.
        </p>
      </div>

      {/* Disruption Alert Summary if changes occurred (B5) */}
      {disruption && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', padding: '16px', marginBottom: '20px', backgroundColor: 'var(--warning-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--warning-text)' }}>
              Disruption: {disruption.disruption} of {disruption.total} classes moved
            </h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--warning-text)', lineHeight: '1.5' }}>
            {changes.map((c, i) => (
              <div key={i}>• <strong>{c.batch}</strong>: {c.reason} ({c.from} → {c.to})</div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="error-box" role="alert" style={{ marginBottom: '20px' }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Re-Plan Controls: OWNER ONLY (B5) */}
      {canEdit ? (
        <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span>📅</span>
            <span>A trainer is unavailable?</span>
          </h3>
          <p className="helper-text" style={{ marginBottom: '16px' }}>
            Select the absent trainer and day. The solver moves ONLY the affected classes with minimum disruption and 0 clashes.
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label">Trainer</label>
              <select
                className="select-control"
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
              >
                {trainersList.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.batches?.join(', ') || 'No batches'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Unavailable Day</label>
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

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReplan}
              disabled={isReplanning}
            >
              {isReplanning ? 'Re-planning...' : 'Re-plan Timetable'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={isReplanning}
            >
              Reset to Original
            </button>
          </div>
        </div>
      ) : (
        /* View Only Note for Counselor & Trainer (B5) */
        <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', backgroundColor: 'var(--bg-card-subtle)', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
                View only. Only the owner can change the timetable.
              </span>
            </div>
            {onNavigateToPage && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateToPage('approvals')}
              >
                Request Time Off via Approvals →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Color Legend (B5) */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Batch Legend:
          </span>
          {allBatches.map((bName) => {
            const colors = getBatchColors(bName);
            return (
              <div key={bName} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}></span>
                <span style={{ fontWeight: '500', color: colors.text }}>{bName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Master Timetable Grid (B5: Horizontal scroll inside card) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', padding: '16px' }}>
          <table className="timetable-grid" style={{ minWidth: '780px', width: '100%', borderCollapse: 'separate', borderSpacing: '8px' }}>
            <thead>
              <tr>
                <th style={{ width: '100px', textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>Time Slot</th>
                {days.map((d) => (
                  <th key={d} style={{ textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)' }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((timeSlot) => (
                <tr key={timeSlot}>
                  <td style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '13px', verticalAlign: 'top', paddingTop: '12px' }}>
                    {timeSlot}
                  </td>
                  {days.map((d) => {
                    const sessions = timetable.filter((s) => s.day === d && s.time === timeSlot);

                    return (
                      <td key={d} style={{ verticalAlign: 'top', minWidth: '130px', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', padding: '8px', minHeight: '80px' }}>
                        {sessions.length === 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', textAlign: 'center', paddingTop: '16px' }}>
                            —
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {sessions.map((s, sIdx) => {
                              const isMoved = changedBatches.has(s.batch) && changes.some((c) => c.batch === s.batch && c.day === d && c.time === timeSlot);
                              const colors = getBatchColors(s.batch);

                              return (
                                <div
                                  key={sIdx}
                                  className={`session-pill ${isMoved ? 'session-moved' : ''}`}
                                  style={{
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                    border: isMoved ? '2px solid var(--warning)' : `1px solid ${colors.border}`,
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    boxShadow: isMoved ? '0 0 0 2px rgba(245, 158, 11, 0.3)' : 'none',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                    <strong style={{ fontSize: '12px' }}>{s.batch}</strong>
                                    <span style={{ fontSize: '10px', fontWeight: '700', backgroundColor: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', border: `1px solid ${colors.border}` }}>
                                      {s.room}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', opacity: 0.85 }}>
                                    👨‍🏫 {s.trainer}
                                  </div>
                                  {isMoved && (
                                    <div style={{ fontSize: '10px', color: 'var(--warning-text)', fontWeight: '700', marginTop: '2px' }}>
                                      ⚡ Relocated
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
