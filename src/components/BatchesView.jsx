import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  Layers,
  Video,
  Play,
  QrCode,
  Users,
  Building,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ExternalLink,
  Sparkles,
  FileText
} from 'lucide-react';

export const BatchesView = () => {
  const { batches, recordings, students, currentRole } = useRole();
  const [selectedBatchId, setSelectedBatchId] = useState('BAT-JAVA-42');
  const [activeRecordingPlayer, setActiveRecordingPlayer] = useState(null);

  const activeBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const batchStudents = students.filter(s => s.batchId === activeBatch.id);
  const batchRecordings = recordings.filter(r => r.batchId === activeBatch.id);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-success">
                <Layers size={12} />
                Hybrid Infrastructure
              </span>
              <span className="badge badge-purple">
                Multi-Room Streaming Active
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Batches, Classroom Check-Ins & Recordings Vault
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Cross-correlate physical RFID/QR turnstile attendance with Zoom & Google Meet duration join logs.
            </p>
          </div>

          {/* Batch Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Cohort:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="input-control"
              style={{ width: 'auto', fontWeight: '700', padding: '8px 14px' }}
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.courseName})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cohort Spec Card */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Trainer & Amphitheater
            </div>
            <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>
              {activeBatch.trainerName}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
              📍 {activeBatch.roomName} (Cap: {activeBatch.classroomSeats})
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Hybrid Split
            </div>
            <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>
              {activeBatch.totalStudents} Enrolled
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              In-Person: {activeBatch.classroomSeats} • Virtual Seats: {activeBatch.onlineSeats}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Syllabus Progress
            </div>
            <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.95rem' }}>
              {activeBatch.completedClasses} of {activeBatch.totalClasses} Classes
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
              {Math.round((activeBatch.completedClasses / activeBatch.totalClasses) * 100)}% Syllabus Delivered
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Virtual Join Room
            </div>
            <a
              href={activeBatch.virtualLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '4px', width: 'fit-content' }}
            >
              <Video size={14} color="#38bdf8" />
              <span>Launch Hybrid Stream</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Two-Column: Left (Hybrid Check-In Logs), Right (Recordings Vault) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        {/* Left: Real-Time Hybrid Attendance Check-In Log */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="#10b981" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>
                Session 26: Hybrid Check-In & Join Telemetry
              </h3>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
              Live Sync
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batchStudents.map(st => {
              const isAbsent = st.missedClasses >= 4;
              return (
                <div
                  key={st.id}
                  style={{
                    background: isAbsent ? 'rgba(239, 68, 68, 0.06)' : 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${isAbsent ? 'var(--danger-border)' : 'var(--border-subtle)'}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: isAbsent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: isAbsent ? '#f87171' : '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '800'
                    }}>
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.85rem' }}>
                        {st.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Preferred Mode: <strong>{st.mode}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {isAbsent ? (
                      <span className="badge badge-danger">
                        Absent (No Scan / No Join)
                      </span>
                    ) : st.mode === 'Classroom' || st.mode === 'Hybrid' ? (
                      <div>
                        <span className="badge badge-success">
                          QR Check-in: 09:28 AM
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Gate Turnstile A (Physical)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="badge badge-cyan">
                          Online: 94 mins logged
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Zoom Client 6.1 • IP Verified
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cloud Recordings Vault */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>
                Cohort Recordings & Transcripts ({batchRecordings.length})
              </h3>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              <Upload size={13} />
              <span>Upload Offline Recording</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {batchRecordings.map(rec => (
              <div
                key={rec.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem', marginBottom: '4px' }}>
                      {rec.status}
                    </span>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>
                      {rec.title}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveRecordingPlayer(rec)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '6px 12px' }}
                  >
                    <Play size={13} />
                    <span>Watch</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>📅 {rec.date}</span>
                  <span>⏱️ {rec.duration}</span>
                  <span>👁️ {rec.views} Student Views</span>
                  <span>💾 {rec.fileSize}</span>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px'
                }}>
                  <FileText size={14} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span><strong>AI Summary:</strong> {rec.transcriptSummary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recording Player Modal Simulation */}
      {activeRecordingPlayer && (
        <div className="modal-backdrop" onClick={() => setActiveRecordingPlayer(null)}>
          <div
            className="modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
                {activeRecordingPlayer.title}
              </h3>
              <button onClick={() => setActiveRecordingPlayer(null)} className="btn btn-ghost btn-sm">
                ✕
              </button>
            </div>

            {/* Video Player Mock */}
            <div style={{
              width: '100%',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '16px',
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(0,0,0,0.7)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="pulse-dot"></span>
                <span>Zoom Cloud Playback • 1080p 60fps</span>
              </div>

              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 0 30px var(--primary-glow)'
              }}>
                <Play size={28} style={{ marginLeft: '4px' }} />
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '12px' }}>
                Click to stream Session 26 lecture recording with real-time transcript sync
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              <strong>Speaker:</strong> {activeRecordingPlayer.trainer} • <strong>Processed:</strong> Verified by TechSummit Cloud Pipeline
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
