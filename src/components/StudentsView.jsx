import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Award,
  Video,
  CreditCard,
  MessageSquare,
  X,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const StudentsView = ({ onSelectCertificateStudent }) => {
  const { students, currentRole, openCopilotWithPrompt, batches } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [activeStudentDrawer, setActiveStudentDrawer] = useState(null);

  const filteredStudents = students.filter(s => {
    if (batchFilter !== 'All' && s.batchId !== batchFilter) return false;
    if (riskFilter === 'High' && s.dropoutRiskScore < 75) return false;
    if (riskFilter === 'Low' && s.dropoutRiskScore >= 75) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        s.phone.includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Search Bar */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-info">
                <Users size={12} />
                Student 360° Registry
              </span>
              {!currentRole.canViewFees && (
                <span className="badge badge-danger">
                  <ShieldAlert size={12} />
                  Fee Data Shielded (Trainer Role)
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Students Management & Hybrid Attendance History
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Consolidated classroom check-ins, online join timestamps, assignment velocity, and dropout warning indicators.
            </p>
          </div>

          <button
            onClick={() => openCopilotWithPrompt("which students in the Java batch have missed three or more classes and have an EMI due this week? Draft a WhatsApp reminder for each.")}
            className="btn btn-primary btn-sm"
          >
            <MessageSquare size={14} />
            <span>AI Copilot: Target Overdue Attendance</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, phone, or email..."
              className="input-control"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Cohort:</span>
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="input-control"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '8px 12px' }}
            >
              <option value="All">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Risk Tier:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="input-control"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '8px 12px' }}
            >
              <option value="All">All Students</option>
              <option value="High">🔴 High Dropout Risk (≥75%)</option>
              <option value="Low">🟢 On Track (&lt;75%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Batch / Course</th>
                <th>Hybrid Attendance</th>
                {currentRole.canViewFees ? <th>Fee / EMI Status</th> : null}
                <th>Dropout Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id}>
                  {/* Name & Contact */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))',
                        border: '1px solid var(--border-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.88rem' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {student.phone} • {student.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Batch & Mode */}
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                      {student.courseName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                        {student.mode}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {student.batchId}
                      </span>
                    </div>
                  </td>

                  {/* Attendance */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${student.attendancePercentage}%`,
                          height: '100%',
                          background: student.attendancePercentage < 75 ? '#ef4444' : '#10b981',
                        }} />
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '0.82rem', color: student.attendancePercentage < 75 ? '#f87171' : '#34d399' }}>
                        {student.attendancePercentage}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: student.missedClasses >= 3 ? '#f87171' : 'var(--text-muted)', marginTop: '2px' }}>
                      Missed: <strong>{student.missedClasses} classes</strong> ({student.classroomCheckins} class / {student.onlineJoins} web)
                    </div>
                  </td>

                  {/* Fee Status (Hidden from Trainer) */}
                  {currentRole.canViewFees ? (
                    <td>
                      <div>
                        <span className={`badge ${student.feePending === 0 ? 'badge-success' : student.emiStatus.includes('Due') ? 'badge-danger' : 'badge-warning'}`}>
                          {student.emiStatus}
                        </span>
                        {student.feePending > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '4px' }}>
                            Next: <strong>₹{student.nextEmiAmount.toLocaleString('en-IN')}</strong> (Due: {student.nextEmiDueDate})
                          </div>
                        )}
                      </div>
                    </td>
                  ) : null}

                  {/* Dropout Risk Score */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${student.dropoutRiskScore >= 75 ? 'badge-danger' : student.dropoutRiskScore >= 40 ? 'badge-warning' : 'badge-success'}`}>
                        {student.dropoutRiskScore >= 75 ? 'High Risk' : student.dropoutRiskScore >= 40 ? 'Moderate' : 'On Track'} ({student.dropoutRiskScore}%)
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setActiveStudentDrawer(student)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      >
                        360° Profile
                      </button>

                      {student.certificateEligible && (
                        <button
                          onClick={() => onSelectCertificateStudent && onSelectCertificateStudent(student)}
                          className="btn btn-ghost btn-sm"
                          title="Generate Certificate"
                          style={{ padding: '5px' }}
                        >
                          <Award size={15} color="#c084fc" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 360° Student Slide-out Drawer */}
      {activeStudentDrawer && (
        <div className="modal-backdrop" onClick={() => setActiveStudentDrawer(null)}>
          <div
            className="modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', padding: '28px' }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '1.4rem'
                }}>
                  {activeStudentDrawer.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                    {activeStudentDrawer.name}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ID: {activeStudentDrawer.id} • {activeStudentDrawer.courseName}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveStudentDrawer(null)}
                className="btn btn-ghost btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Contact & Risk Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span className="badge badge-cyan">Mode: {activeStudentDrawer.mode}</span>
              <span className={`badge ${activeStudentDrawer.dropoutRiskScore >= 75 ? 'badge-danger' : 'badge-success'}`}>
                Dropout Risk: {activeStudentDrawer.dropoutRiskScore}%
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} />
                {activeStudentDrawer.phone}
              </span>
            </div>

            {/* Hybrid Attendance Deep-Dive */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#fff', marginBottom: '10px' }}>
                Hybrid Attendance & Join Telemetry
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: activeStudentDrawer.attendancePercentage < 75 ? '#f87171' : '#34d399' }}>
                    {activeStudentDrawer.attendancePercentage}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Overall Rate</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#38bdf8' }}>
                    {activeStudentDrawer.classroomCheckins}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Classroom QR Scans</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#a78bfa' }}>
                    {activeStudentDrawer.onlineJoins} ({activeStudentDrawer.avgOnlineMinutes}m)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Online Join Duration</div>
                </div>
              </div>
            </div>

            {/* Fees Breakdown (Restricted for Trainer) */}
            {currentRole.canViewFees ? (
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#fff' }}>
                    Instalment & Fee Register
                  </div>
                  <span className={`badge ${activeStudentDrawer.feePending === 0 ? 'badge-success' : 'badge-warning'}`}>
                    {activeStudentDrawer.emiStatus}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Course Fee:</span>
                  <strong style={{ color: '#fff' }}>₹{activeStudentDrawer.feeTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Collected Amount:</span>
                  <strong style={{ color: 'var(--success)' }}>₹{activeStudentDrawer.feePaid.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pending Balance:</span>
                  <strong style={{ color: activeStudentDrawer.feePending > 0 ? '#f87171' : '#34d399' }}>
                    ₹{activeStudentDrawer.feePending.toLocaleString('en-IN')}
                  </strong>
                </div>
                {activeStudentDrawer.feePending > 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid var(--danger-border)',
                    fontSize: '0.78rem',
                    color: '#fca5a5'
                  }}>
                    Next EMI of <strong>₹{activeStudentDrawer.nextEmiAmount.toLocaleString('en-IN')}</strong> due on <strong>{activeStudentDrawer.nextEmiDueDate}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--danger-border)',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '0.78rem',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} />
                <span>Financial & Fee Register access is restricted under your active role ({currentRole.badge}).</span>
              </div>
            )}

            {/* Risk Factors */}
            {activeStudentDrawer.riskFactors && activeStudentDrawer.riskFactors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#f87171', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Early Warning Risk Signals:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeStudentDrawer.riskFactors.map((rf, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={13} color="#f59e0b" />
                      <span>{rf}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setActiveStudentDrawer(null);
                  openCopilotWithPrompt(`Draft a personalized WhatsApp reminder for ${activeStudentDrawer.name} regarding attendance and next class`);
                }}
                className="btn btn-primary btn-sm"
              >
                <MessageSquare size={14} />
                <span>Draft WhatsApp with Copilot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
