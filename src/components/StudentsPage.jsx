import React, { useState, useEffect } from 'react';
import { fetchStudents, createStudent, deleteStudent } from '../api';

export const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchStudents();
      const list = data || [];
      setStudents(list);

      // Extract unique batches
      const uniqueBatches = Array.from(new Set(list.map((s) => s.batch || s.batch_id).filter(Boolean)));
      if (!uniqueBatches.includes('Java-A')) uniqueBatches.push('Java-A');
      if (!uniqueBatches.includes('Web-C')) uniqueBatches.push('Web-C');
      if (!uniqueBatches.includes('Python-B')) uniqueBatches.push('Python-B');
      if (!uniqueBatches.includes('Data Science-D')) uniqueBatches.push('Data Science-D');
      if (!uniqueBatches.includes('Full Stack-E')) uniqueBatches.push('Full Stack-E');
      setBatches(uniqueBatches.sort());

      if (!newBatch && uniqueBatches.length > 0) {
        setNewBatch(uniqueBatches[0]);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load students.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim() || !newBatch) {
      alert('Please fill in student name, phone number, and select a batch.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStudent({
        name: newName.trim(),
        phone: newPhone.trim(),
        batch_id: newBatch,
      });
      showToast(`Student "${res.name}" added successfully with default EMI plan.`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to add student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteStudent(studentToDelete.id);
      showToast(`Student "${res.name || studentToDelete.name}" and associated records removed.`);
      setStudentToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete student.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const sName = (s.name || '').toLowerCase();
    const sPhone = (s.phone || '').toLowerCase();
    const sBatch = s.batch || s.batch_id || '';
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || sName.includes(q) || sPhone.includes(q);
    const matchesBatch = batchFilter === 'All' || sBatch === batchFilter;
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title">Students Directory</h1>
            <p className="page-subtitle">
              Manage student enrollments, batches, and academic registration.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <span>+ Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="input-text"
              placeholder="🔍 Search student by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Batch:</span>
            <select
              className="select-control"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <option value="All">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="card skeleton" style={{ height: '48px' }}></div>
          <div className="card skeleton" style={{ height: '48px' }}></div>
          <div className="card skeleton" style={{ height: '48px' }}></div>
        </div>
      )}

      {/* Students Table */}
      {!isLoading && !errorMessage && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredStudents.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px' }}>
              <div className="empty-state-icon">👥</div>
              <h3 className="section-title">No students found</h3>
              <p className="helper-text">Try modifying your search query or batch filter.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student Name</th>
                    <th>Phone</th>
                    <th>Assigned Batch</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                      <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        {s.name}
                        {s.certified === 1 && (
                          <span className="badge badge-low" style={{ marginLeft: '6px', fontSize: '11px' }}>
                            🎓 Certified
                          </span>
                        )}
                      </td>
                      <td>{s.phone || '—'}</td>
                      <td>
                        <span className="badge badge-role-counselor" style={{ fontWeight: '600' }}>
                          {s.batch || s.batch_id}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-low">Active</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                          onClick={() => setStudentToDelete(s)}
                          title="Delete student"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Student Modal (B3) */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add New Student</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="student-name">Student Full Name</label>
                <input
                  id="student-name"
                  type="text"
                  className="input-text"
                  placeholder="e.g. Manasvi Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-phone">Phone Number</label>
                <input
                  id="student-phone"
                  type="text"
                  className="input-text"
                  placeholder="e.g. +91 9876543299"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-batch">Batch Assignment</label>
                <select
                  id="student-batch"
                  className="select-control"
                  style={{ width: '100%' }}
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  required
                >
                  {batches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ℹ️ Creates a default EMI plan of Rs 5,000 due in 7 days automatically.
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (B3) */}
      {studentToDelete && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Confirm Deletion</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setStudentToDelete(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 0', fontSize: '14px', lineHeight: '1.5' }}>
              Delete <strong>{studentToDelete.name}</strong>? This also removes their fees and attendance.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
