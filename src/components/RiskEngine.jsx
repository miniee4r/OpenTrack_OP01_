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
  ShieldCheck,
  Sliders,
  FileSpreadsheet,
  X,
  PhoneCall
} from 'lucide-react';

export const RiskEngine = () => {
  const { students, openCopilotWithPrompt, currentRole, addAuditLog, addToast } = useRole();

  // Calibration Sliders
  const [weights, setWeights] = useState({
    attendance: 40,
    emi: 35,
    assignments: 15,
    recordings: 10
  });

  const [activeCallScriptModal, setActiveCallScriptModal] = useState(null);

  // Recalculate dynamic scores based on calibrated weights
  const scoredStudents = students.map(s => {
    const attendancePenalty = Math.max(0, 100 - s.attendancePercentage) * (weights.attendance / 100);
    const emiPenalty = (s.emiStatus.includes('Due') ? 90 : s.feePending > 0 ? 50 : 0) * (weights.emi / 100);
    const recordingPenalty = Math.max(0, 100 - (s.avgOnlineMinutes / 1.2)) * (weights.recordings / 100);
    const assignmentPenalty = (s.missedClasses >= 3 ? 80 : 20) * (weights.assignments / 100);

    const calculatedRisk = Math.min(99, Math.round(attendancePenalty + emiPenalty + recordingPenalty + assignmentPenalty));

    return {
      ...s,
      dynamicRiskScore: calculatedRisk
    };
  });

  const highRiskStudents = scoredStudents.filter(s => s.dynamicRiskScore >= 70);
  const moderateRiskStudents = scoredStudents.filter(s => s.dynamicRiskScore >= 35 && s.dynamicRiskScore < 70);
  const onTrackStudents = scoredStudents.filter(s => s.dynamicRiskScore < 35);

  const handleOpenCallScript = (student) => {
    setActiveCallScriptModal({
      student,
      script: `Hello ${student.name}, this is Meera from TechSummit Institute. I wanted to reach out warmly regarding your progress in ${student.courseName}. We noticed you missed ${student.missedClasses} sessions recently, and we know balancing schedules can get intense. We would love to book you for an exclusive 1-on-1 revision slot with a mentor, and if your upcoming instalment is causing stress, our counselor team can split it into smaller micro-installments so your learning isn't interrupted. How does that sound?`
    });

    addAuditLog({
      action: 'COUNSELOR_SCRIPT_GENERATED',
      summary: `Generated telephone outreach protocol for at-risk student ${student.name} (${student.id})`,
      query: `GENERATE_INTERVENTION_PLAYBOOK(student_id='${student.id}', risk_score=${student.dynamicRiskScore})`,
      status: 'Ready for Dispatch',
      securityCheck: 'Counselor Scope Verified'
    });
  };

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
                Calibrated Scoring Model
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Student Dropout Early Warning & Intervention Engine
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Calibrate multi-factor weighting to detect dropouts before they occur and generate compassionate counselor recovery scripts.
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

        {/* Dynamic Weight Calibration Sliders */}
        <div style={{
          marginTop: '20px',
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sliders size={16} color="#818cf8" />
            <strong style={{ fontSize: '0.85rem', color: '#fff' }}>
              Heuristic Risk Weight Calibration (Live Recalculation)
            </strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Attendance Deficit</span>
                <strong style={{ color: '#fff' }}>{weights.attendance}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={weights.attendance}
                onChange={(e) => setWeights({ ...weights, attendance: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#6366f1' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Missed/Overdue EMIs</span>
                <strong style={{ color: '#fff' }}>{weights.emi}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={weights.emi}
                onChange={(e) => setWeights({ ...weights, emi: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assignment Delays</span>
                <strong style={{ color: '#fff' }}>{weights.assignments}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.assignments}
                onChange={(e) => setWeights({ ...weights, assignments: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#ec4899' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Video Watch Deficit</span>
                <strong style={{ color: '#fff' }}>{weights.recordings}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={weights.recordings}
                onChange={(e) => setWeights({ ...weights, recordings: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#06b6d4' }}
              />
            </div>
          </div>
        </div>

        {/* Risk Distribution Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700' }}>🔴 CRITICAL RISK (≥70%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {highRiskStudents.length} Students
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              High probability of withdrawal without immediate call
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--warning-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '700' }}>🟡 MODERATE RISK (35-69%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {moderateRiskStudents.length} Students
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Early signals: 1-2 missed sessions or unsubmitted labs
            </div>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>🟢 ON TRACK (&lt;35%)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
              {onTrackStudents.length} Students
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Regular hybrid check-ins & cleared fee instalments
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
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1rem'
                  }}>
                    {st.dynamicRiskScore}%
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
                    onClick={() => handleOpenCallScript(st)}
                    className="btn btn-secondary btn-sm"
                  >
                    <PhoneCall size={14} color="#38bdf8" />
                    <span>View Call Playbook</span>
                  </button>

                  <button
                    onClick={() => openCopilotWithPrompt(`Draft an urgent academic counselor intervention WhatsApp for student ${st.name} (${st.phone}) who has ${st.dynamicRiskScore}% dropout risk`)}
                    className="btn btn-primary btn-sm"
                  >
                    <MessageSquare size={14} />
                    <span>Trigger WhatsApp Alert</span>
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
                    📹 Online Watch Duration: <strong style={{ color: '#93c5fd' }}>{st.avgOnlineMinutes} mins / session</strong>
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

      {/* Counselor Call Script Modal */}
      {activeCallScriptModal && (
        <div className="modal-backdrop" onClick={() => setActiveCallScriptModal(null)}>
          <div
            className="modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', padding: '28px', background: '#0e1422' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: '4px' }}>
                  Counselor Outreach Playbook
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                  Outreach Script for {activeCallScriptModal.student.name}
                </h3>
              </div>
              <button onClick={() => setActiveCallScriptModal(null)} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div><strong>Target Phone:</strong> {activeCallScriptModal.student.phone}</div>
                <div><strong>Course:</strong> {activeCallScriptModal.student.courseName}</div>
                <div><strong>Missed Classes:</strong> {activeCallScriptModal.student.missedClasses} classes</div>
                <div><strong>Current Risk Score:</strong> {activeCallScriptModal.student.dynamicRiskScore}%</div>
              </div>

              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--border-accent)',
                borderRadius: '10px',
                padding: '16px',
                fontStyle: 'italic',
                lineHeight: '1.7',
                color: '#e0e7ff'
              }}>
                "{activeCallScriptModal.script}"
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setActiveCallScriptModal(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
              <a
                href={`tel:${activeCallScriptModal.student.phone}`}
                className="btn btn-primary btn-sm"
              >
                <Phone size={14} />
                <span>Call Student Now</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
