import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  AlertOctagon,
  AlertTriangle,
  TrendingDown,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export const RiskEngine = () => {
  const { students, openCopilotWithPrompt, currentRole } = useRole();

  const highRiskStudents = students.filter(s => s.dropoutRiskScore >= 75);
  const moderateRiskStudents = students.filter(s => s.dropoutRiskScore >= 40 && s.dropoutRiskScore < 75);
  const onTrackStudents = students.filter(s => s.dropoutRiskScore < 40);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-danger">
                <AlertOctagon size={12} />
                Predictive Risk Engine
              </span>
              <span className="badge badge-purple">
                Multi-Factor Diagnostic Matrix
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Student Dropout Early Warning & Intervention System
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Detects students falling behind before dropout occurs by analyzing attendance gaps, missed EMIs, video dropoffs, and assignment delays.
            </p>
          </div>

          <button
            onClick={() => openCopilotWithPrompt("Show me all students at high dropout risk with their root cause factors and recommend counselor interventions.")}
            className="btn btn-primary"
          >
            <Sparkles size={16} />
            <span>Generate Counselor Intervention Plan</span>
          </button>
        </div>

        {/* Risk Distribution Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700' }}>🔴 CRITICAL RISK (≥75%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {highRiskStudents.length} Students
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Requires immediate counselor call & parent outreach
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--warning-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '700' }}>🟡 MODERATE RISK (40-74%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {moderateRiskStudents.length} Students
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Early warning: 1-2 missed sessions or unsubmitted labs
            </div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>🟢 ON TRACK (&lt;40%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {onTrackStudents.length} Students
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Regular hybrid attendance, active recording watches
            </div>
          </div>
        </div>
      </div>

      {/* Critical Students Drill-Down */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>
          At-Risk Cohort Drill-Down & Prescribed Root Causes
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {highRiskStudents.map(st => (
            <div
              key={st.id}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--danger-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                  }}>
                    {st.dropoutRiskScore}%
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '1rem', color: '#fff' }}>
                      {st.name} ({st.courseName})
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Batch: {st.batchName} • Last active: {st.lastActive}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => openCopilotWithPrompt(`Draft an urgent academic counselor intervention WhatsApp for student ${st.name} (${st.phone}) who has ${st.dropoutRiskScore}% dropout risk`)}
                    className="btn btn-primary btn-sm"
                  >
                    <MessageSquare size={14} />
                    <span>Trigger WhatsApp Intervention</span>
                  </button>
                </div>
              </div>

              {/* Contributing Factors Matrix */}
              <div style={{
                background: 'rgba(10, 15, 25, 0.8)',
                borderRadius: '10px',
                padding: '14px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px' }}>
                  Detected Signal Breakdown:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    📊 Attendance: <strong style={{ color: '#f87171' }}>{st.attendancePercentage}% ({st.missedClasses} missed)</strong>
                  </div>
                  {currentRole.canViewFees && (
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                      💳 EMI Status: <strong style={{ color: '#fbbf24' }}>{st.emiStatus} (₹{st.nextEmiAmount.toLocaleString('en-IN')})</strong>
                    </div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    📹 Online Watch Duration: <strong style={{ color: '#93c5fd' }}>{st.avgOnlineMinutes} mins / class</strong>
                  </div>
                </div>

                {st.riskFactors && st.riskFactors.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {st.riskFactors.map((rf, idx) => (
                      <span key={idx} className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                        ⚠️ {rf}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
