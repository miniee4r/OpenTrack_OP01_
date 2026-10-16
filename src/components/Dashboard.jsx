import React from 'react';
import { useRole } from '../context/RoleContext';
import {
  Users,
  Layers,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Video,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building
} from 'lucide-react';
import { INSTITUTE_INFO } from '../data/mockData';

export const Dashboard = ({ setActiveTab }) => {
  const { currentRole, batches, students, openCopilotWithPrompt, pendingApprovals } = useRole();

  const atRiskStudents = students.filter(s => s.dropoutRiskScore >= 75);
  const pendingCount = pendingApprovals.filter(a => a.status === 'PENDING_APPROVAL').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome & Sponsorship Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(24, 34, 56, 0.8), rgba(15, 23, 42, 0.95))',
        border: '1px solid var(--border-accent)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-purple">
                <Sparkles size={12} />
                Institute Operations Hub
              </span>
              <span className="badge badge-cyan">
                {INSTITUTE_INFO.tagline}
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Welcome back, {currentRole.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Active operational role: <strong style={{ color: '#c7d2fe' }}>{currentRole.badge}</strong>. 
              {currentRole.canViewFees 
                ? ' Unrestricted view of academic sessions, fees, and UPI ledgers.' 
                : ' Academic and classroom view active. Financial records are strictly protected under RBAC.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => openCopilotWithPrompt("which students in the Java batch have missed three or more classes and have an EMI due this week? Draft a WhatsApp reminder for each.")}
              className="btn btn-primary"
            >
              <Sparkles size={16} />
              <span>Run AI Operations Copilot</span>
            </button>
            <button
              onClick={() => setActiveTab('timetable')}
              className="btn btn-secondary"
            >
              <CalendarCheck size={16} />
              <span>Inspect Timetable</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signals That Matter Alert Ticker */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        borderLeft: '4px solid #ef4444',
        background: 'rgba(239, 68, 68, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <strong style={{ fontSize: '0.9rem', color: '#fff' }}>Signals That Matter (Early Operational Warnings)</strong>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time telemetry</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Signal 1 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--danger-border)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="badge badge-danger">Urgent Intervention</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Java Batch 42</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600' }}>
                3 Students missed ≥3 classes with upcoming EMIs
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Aarav Mehta, Ananya Deshmukh, Rohan Singhania are at critical dropout risk.
              </div>
            </div>
            <button
              onClick={() => openCopilotWithPrompt("which students in the Java batch have missed three or more classes and have an EMI due this week? Draft a WhatsApp reminder for each.")}
              className="btn btn-sm btn-ghost"
              style={{ justifyContent: 'flex-start', padding: '4px 0', color: '#f87171' }}
            >
              <span>Draft WhatsApp reminders via Copilot</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Signal 2 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--warning-border)',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="badge badge-warning">Schedule Contingency</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trainer Absence</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600' }}>
                Trainer Priya Sharma absence simulation ready
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Automated heuristic can re-plan Friday's slot to Rahul Verma with 0 clashes.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('timetable')}
              className="btn btn-sm btn-ghost"
              style={{ justifyContent: 'flex-start', padding: '4px 0', color: '#fbbf24' }}
            >
              <span>Open Timetable Re-Planner</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Signal 3 (Accounts / Owner only) */}
          {currentRole.canViewFees ? (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="badge badge-cyan">Accounts Reconciliation</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UPI Transactions</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600' }}>
                  2 Bank Statement entries matched (₹17,000)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  UTR fuzzy matching suggests immediate clearance for Aarav & Ananya.
                </div>
              </div>
              <button
                onClick={() => setActiveTab('fees')}
                className="btn btn-sm btn-ghost"
                style={{ justifyContent: 'flex-start', padding: '4px 0', color: '#22d3ee' }}
              >
                <span>Reconcile in 1-Click</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--success-border)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="badge badge-success">Session Recording</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Zoom Cloud</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '600' }}>
                  Session 26 (Microservices) Transcribed
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Distributed Tracing lecture video ready with automated key-moment timestamps.
                </div>
              </div>
              <button
                onClick={() => setActiveTab('batches')}
                className="btn btn-sm btn-ghost"
                style={{ justifyContent: 'flex-start', padding: '4px 0', color: '#34d399' }}
              >
                <span>View Recordings Vault</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* KPI 1 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Students</span>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '8px', color: '#818cf8' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff' }}>
            {INSTITUTE_INFO.stats.totalStudents}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} />
            <span>+18 new admissions this month</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Cohorts</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px', color: '#34d399' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff' }}>
            {batches.length} Live
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across 4 smart hybrid amphitheaters
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Avg Hybrid Attendance</span>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px', color: '#22d3ee' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff' }}>
            {INSTITUTE_INFO.stats.averageAttendance}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            QR Scan: 72% • Online Joins: 28%
          </div>
        </div>

        {/* KPI 4 (Dynamic: Financial for Owner/Accounts, Academic for Trainer/Counselor) */}
        {currentRole.canViewFees ? (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Monthly Collections</span>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '8px', color: '#fbbf24' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff' }}>
              {INSTITUTE_INFO.stats.monthlyCollection}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
              Pending Dues: {INSTITUTE_INFO.stats.pendingDues}
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Curriculum Progress</span>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '8px', color: '#c084fc' }}>
                <Layers size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff' }}>
              68.5%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>
              On track for Nov graduation
            </div>
          </div>
        )}
      </div>

      {/* Batches Overview Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>
              Active Batches & Hybrid Classroom Hub
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Real-time seat occupancy, assigned trainers, and classroom-to-online streams.
            </p>
          </div>
          <button onClick={() => setActiveTab('batches')} className="btn btn-secondary btn-sm">
            <span>Manage All Batches</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {batches.map((b) => (
            <div
              key={b.id}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className={`badge ${b.health === 'Good' ? 'badge-success' : 'badge-danger'}`}>
                    {b.health}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.roomName}</span>
                </div>

                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff', marginBottom: '4px' }}>
                  {b.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', marginBottom: '8px' }}>
                  Trainer: {b.trainerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  🕒 {b.schedule}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Progress ({b.completedClasses}/{b.totalClasses} classes)</span>
                    <span>{Math.round((b.completedClasses / b.totalClasses) * 100)}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(b.completedClasses / b.totalClasses) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Enrolled: <strong>{b.totalStudents}</strong> (Class: {b.classroomSeats} / Web: {b.onlineSeats})
                </span>
                <a
                  href={b.virtualLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#38bdf8',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  <Video size={13} />
                  <span>Join Hybrid</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
