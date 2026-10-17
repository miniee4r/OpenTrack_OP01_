import React, { useState, useEffect } from 'react';
import { fetchApprovals, createApproval, approveApproval, rejectApproval, fetchStudents, fetchTrainers } from '../api';

export const ApprovalsPage = ({ user, onPendingCountChange }) => {
  const [approvals, setApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [kindFilter, setKindFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Dropdown options for new request modal
  const [studentsList, setStudentsList] = useState([]);
  const [trainersList, setTrainersList] = useState([]);

  // New Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formStudentId, setFormStudentId] = useState('');
  const [formTrainerName, setFormTrainerName] = useState('');
  const [formDay, setFormDay] = useState('Friday');
  const [formDate, setFormDate] = useState('');
  const [formAmount, setFormAmount] = useState(5000);
  const [formReason, setFormReason] = useState('');
  const [formTitle, setFormTitle] = useState('');

  const role = user?.role || 'owner';

  const kindOptionsByRole = {
    owner: [
      { id: 'emi_reminder', label: 'WhatsApp EMI Reminder' },
      { id: 'attendance_warning', label: 'Attendance Warning' },
      { id: 'trainer_leave', label: 'Trainer Leave Request' },
      { id: 'fee_waiver', label: 'Fee Waiver / Extension' },
      { id: 'student_removal', label: 'Student Removal' },
      { id: 'certificate', label: 'Completion Certificate' },
    ],
    counselor: [
      { id: 'fee_waiver', label: 'Fee Waiver / Extension' },
      { id: 'student_removal', label: 'Student Removal' },
      { id: 'certificate', label: 'Completion Certificate' },
      { id: 'emi_reminder', label: 'WhatsApp EMI Reminder' },
      { id: 'attendance_warning', label: 'Attendance Warning' },
    ],
    accounts: [
      { id: 'fee_waiver', label: 'Fee Waiver / Extension' },
      { id: 'emi_reminder', label: 'WhatsApp EMI Reminder' },
    ],
    trainer: [
      { id: 'trainer_leave', label: 'Trainer Leave Request' },
    ],
  };

  const allowedKinds = kindOptionsByRole[role] || [];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const loadApprovals = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchApprovals();
      const list = data || [];
      setApprovals(list);

      const pendingCount = list.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
      if (onPendingCountChange) onPendingCountChange(pendingCount);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load approvals queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();

    // Pre-fetch students & trainers for dropdowns
    fetchStudents().then(setStudentsList).catch(() => {});
    fetchTrainers().then(setTrainersList).catch(() => {});
  }, [role]);

  useEffect(() => {
    if (allowedKinds.length > 0 && !modalKind) {
      setModalKind(allowedKinds[0].id);
    }
  }, [allowedKinds, modalKind]);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const res = await approveApproval(id);
      showToast(res.action_summary || 'Request approved successfully.');
      await loadApprovals();
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await rejectApproval(id);
      showToast('Request rejected.');
      await loadApprovals();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let title = formTitle.trim();
      let details = {};

      if (modalKind === 'trainer_leave') {
        const tName = formTrainerName || (trainersList[0]?.name || 'Ravi');
        title = title || `Leave Request: ${tName} (${formDay})`;
        details = {
          trainer: tName,
          day: formDay,
          reason: formReason || 'Personal leave',
        };
      } else if (modalKind === 'fee_waiver') {
        const s = studentsList.find((st) => String(st.id) === String(formStudentId)) || studentsList[0];
        const sName = s?.name || 'Student';
        title = title || `Fee Extension: ${sName}`;
        details = {
          student_id: s ? s.id : 1,
          student_name: sName,
          amount: Number(formAmount || 5000),
          new_due_date: formDate || '2026-10-31',
          reason: formReason || 'Financial hardship extension requested',
        };
      } else if (modalKind === 'student_removal') {
        const s = studentsList.find((st) => String(st.id) === String(formStudentId)) || studentsList[0];
        const sName = s?.name || 'Student';
        title = title || `Student Removal: ${sName}`;
        details = {
          student_id: s ? s.id : 1,
          student_name: sName,
          batch: s?.batch || 'General',
          reason: formReason || 'Course discontinuation requested',
        };
      } else if (modalKind === 'certificate') {
        const s = studentsList.find((st) => String(st.id) === String(formStudentId)) || studentsList[0];
        const sName = s?.name || 'Student';
        title = title || `Course Certificate: ${sName}`;
        details = {
          student_id: s ? s.id : 1,
          student_name: sName,
          batch: s?.batch || 'General',
          course: 'Completed Module',
          grade: 'A',
        };
      } else if (modalKind === 'attendance_warning') {
        const s = studentsList.find((st) => String(st.id) === String(formStudentId)) || studentsList[0];
        const sName = s?.name || 'Student';
        title = title || `Attendance Warning: ${sName}`;
        details = {
          student_name: sName,
          phone: s?.phone || '+91 9876543210',
          batch: s?.batch || 'General',
          missed_classes: 3,
          message: formReason || `Notice: ${sName} has missed classes. Academic warning issued.`,
        };
      } else {
        // emi_reminder
        const s = studentsList.find((st) => String(st.id) === String(formStudentId)) || studentsList[0];
        const sName = s?.name || 'Student';
        title = title || `WhatsApp EMI Reminder: ${sName}`;
        details = {
          student_name: sName,
          phone: s?.phone || '+91 9876543210',
          amount: Number(formAmount || 5000),
          due_date: formDate || '2026-10-25',
          message: formReason || `Gentle reminder regarding your EMI due soon.`,
        };
      }

      await createApproval({ kind: modalKind, title, details });
      showToast(`Request "${title}" submitted to queue.`);
      setIsModalOpen(false);
      setFormTitle('');
      setFormReason('');
      await loadApprovals();
    } catch (err) {
      alert(err.message || 'Failed to submit approval request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items by status tab and kind dropdown
  const filteredApprovals = approvals.filter((a) => {
    const s = (a.status || '').toLowerCase();
    const matchesTab = activeTab === 'all' || s === activeTab;
    const matchesKind = kindFilter === 'all' || a.kind === kindFilter;
    return matchesTab && matchesKind;
  });

  const pendingCount = approvals.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  const approvedCount = approvals.filter((a) => (a.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = approvals.filter((a) => (a.status || '').toLowerCase() === 'rejected').length;

  const getKindBadge = (kind) => {
    switch (kind) {
      case 'emi_reminder':
        return { icon: '💰', label: 'EMI Reminder', cls: 'badge-role-accounts' };
      case 'attendance_warning':
        return { icon: '⚠️', label: 'Attendance Warning', cls: 'badge-high' };
      case 'trainer_leave':
        return { icon: '🏖️', label: 'Trainer Leave', cls: 'badge-role-trainer' };
      case 'fee_waiver':
        return { icon: '🏷️', label: 'Fee Waiver', cls: 'badge-role-accounts' };
      case 'student_removal':
        return { icon: '🚫', label: 'Student Removal', cls: 'badge-high' };
      case 'certificate':
        return { icon: '🎓', label: 'Certificate', cls: 'badge-role-counselor' };
      default:
        return { icon: '📋', label: kind, cls: 'badge-low' };
    }
  };

  return (
    <div className="page-wrapper">
      {/* Toast Notification (B6) */}
      {toastMessage && (
        <div className="toast-notification">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title">Approvals Queue</h1>
            <p className="page-subtitle">
              Human-in-the-loop operational verification for communications and schedule modifications.
            </p>
          </div>
          {allowedKinds.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <span>+ New Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Required Note at top (B6) */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', backgroundColor: 'var(--primary-light)', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--primary-text)', fontWeight: '500' }}>
          <span>🛡️</span>
          <span>Nothing is sent or changed until a human approves. All decisions are permanently audited.</span>
        </div>
      </div>

      {/* Filter Tabs & Kind Dropdown (B6) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`chip ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All ({approvals.length})</span>
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <span>Approved ({approvedCount})</span>
          </button>
          <button
            type="button"
            className={`chip ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <span>Rejected ({rejectedCount})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Type:</span>
          <select
            className="select-control"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
          >
            <option value="all">All Kinds</option>
            <option value="emi_reminder">EMI Reminder</option>
            <option value="attendance_warning">Attendance Warning</option>
            <option value="trainer_leave">Trainer Leave</option>
            <option value="fee_waiver">Fee Waiver</option>
            <option value="student_removal">Student Removal</option>
            <option value="certificate">Certificate</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="error-box" role="alert" style={{ marginBottom: '20px' }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card skeleton" style={{ height: '110px' }}></div>
          <div className="card skeleton" style={{ height: '110px' }}></div>
          <div className="card skeleton" style={{ height: '110px' }}></div>
        </div>
      )}

      {/* Approvals Cards List (B6) */}
      {!isLoading && !errorMessage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredApprovals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3 className="section-title">No approval requests found</h3>
              <p className="helper-text">There are no operational requests matching this filter right now.</p>
            </div>
          ) : (
            filteredApprovals.map((app) => {
              const kindBadge = getKindBadge(app.kind);
              const isPending = (app.status || '').toLowerCase() === 'pending';
              const isApproved = (app.status || '').toLowerCase() === 'approved';
              const isRejected = (app.status || '').toLowerCase() === 'rejected';

              return (
                <div key={app.id} className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      {/* Kind Badge + Title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`badge ${kindBadge.cls}`}>
                          {kindBadge.icon} {kindBadge.label}
                        </span>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {app.title}
                        </h3>
                      </div>

                      {/* Key Details Rendered Cleanly */}
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '6px', lineHeight: '1.5' }}>
                        {app.details?.message && (
                          <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>"{app.details.message}"</div>
                        )}
                        {app.details?.reason && (
                          <div><strong>Reason:</strong> {app.details.reason}</div>
                        )}
                        {app.details?.day && (
                          <div><strong>Day:</strong> {app.details.day} {app.details.trainer ? `(Trainer: ${app.details.trainer})` : ''}</div>
                        )}
                        {app.details?.amount && (
                          <div><strong>Amount:</strong> Rs {Number(app.details.amount).toLocaleString()} {app.details.due_date ? `(Due: ${app.details.due_date})` : ''}</div>
                        )}
                        {app.details?.new_due_date && (
                          <div><strong>New Due Date:</strong> {app.details.new_due_date}</div>
                        )}
                        {app.details?.course && (
                          <div><strong>Course:</strong> {app.details.course} {app.details.grade ? `| Grade: ${app.details.grade}` : ''}</div>
                        )}
                      </div>

                      {/* Metadata: who requested & when */}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>👤 Requested by: <strong>{app.requested_by}</strong></span>
                        <span>🕒 {app.created_at}</span>
                        {app.decided_by && (
                          <span>⚖️ Decided by: <strong>{app.decided_by}</strong> ({app.decided_at})</span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge & Decision Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div>
                        {isPending && <span className="badge badge-warning">⏳ Pending</span>}
                        {isApproved && <span className="badge badge-low">✓ Approved</span>}
                        {isRejected && <span className="badge badge-high">✕ Rejected</span>}
                      </div>

                      {/* Approve & Reject buttons: ONLY when allowed to decide (B6) */}
                      {isPending && app.can_approve && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                            onClick={() => handleApprove(app.id)}
                            disabled={processingId === app.id}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                            onClick={() => handleReject(app.id)}
                            disabled={processingId === app.id}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* New Request Modal (B6) */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Create Operational Request</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {/* Kind Dropdown: strictly limited to caller role (B6) */}
              <div className="form-group">
                <label className="form-label">Request Type</label>
                <select
                  className="select-control"
                  style={{ width: '100%' }}
                  value={modalKind}
                  onChange={(e) => setModalKind(e.target.value)}
                  required
                >
                  {allowedKinds.map((k) => (
                    <option key={k.id} value={k.id}>{k.label}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Fields Per Kind (B6) */}
              {modalKind === 'trainer_leave' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Trainer</label>
                    <select
                      className="select-control"
                      style={{ width: '100%' }}
                      value={formTrainerName}
                      onChange={(e) => setFormTrainerName(e.target.value)}
                    >
                      {trainersList.map((t) => (
                        <option key={t.id} value={t.name}>{t.name} ({t.specialization})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Day of Absence</label>
                    <select
                      className="select-control"
                      style={{ width: '100%' }}
                      value={formDay}
                      onChange={(e) => setFormDay(e.target.value)}
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason for Absence</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Attending AI Faculty Summit"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {['fee_waiver', 'student_removal', 'certificate', 'attendance_warning', 'emi_reminder'].includes(modalKind) && (
                <div className="form-group">
                  <label className="form-label">Select Student</label>
                  <select
                    className="select-control"
                    style={{ width: '100%' }}
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    required
                  >
                    <option value="">Select student...</option>
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.batch || s.batch_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalKind === 'fee_waiver' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Amount (Rs)</label>
                    <input
                      type="number"
                      className="input-text"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Extended Due Date</label>
                    <input
                      type="date"
                      className="input-text"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Waiver / Extension Reason</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Family medical situation"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {(modalKind === 'student_removal' || modalKind === 'attendance_warning') && (
                <div className="form-group">
                  <label className="form-label">Reason / Message</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Enter explanation or notice detail"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
