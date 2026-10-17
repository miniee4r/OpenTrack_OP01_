import React, { useState, useEffect } from 'react';
import { fetchTrainers, createTrainer, deleteTrainer, createBatch } from '../api';

export const TrainersPage = () => {
  const [trainers, setTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Add Trainer Modal State
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  const [trainerSpec, setTrainerSpec] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerPhone, setTrainerPhone] = useState('');
  const [isSubmittingTrainer, setIsSubmittingTrainer] = useState(false);

  // Add Batch Modal State
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [batchCourse, setBatchCourse] = useState('');
  const [batchTrainerId, setBatchTrainerId] = useState('');
  const [batchSize, setBatchSize] = useState(20);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  // Delete Trainer Modal State
  const [trainerToDelete, setTrainerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 409 Reassign Modal State (B4)
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetReassignId, setTargetReassignId] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchTrainers();
      const list = data || [];
      setTrainers(list);
      if (list.length > 0 && !batchTrainerId) {
        setBatchTrainerId(list[0].id);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load trainers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatTimetableChanges = (changes) => {
    if (!changes || changes.length === 0) return '';
    const details = changes.map((c) => `${c.batch || 'Batch'}: ${c.reason || 'relocated'}`).join('; ');
    return ` (Timetable updated: ${details})`;
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    if (!trainerName.trim() || !trainerSpec.trim() || !trainerEmail.trim() || !trainerPhone.trim()) {
      alert('Please fill in all trainer details.');
      return;
    }

    setIsSubmittingTrainer(true);
    try {
      const res = await createTrainer({
        name: trainerName.trim(),
        specialization: trainerSpec.trim(),
        email: trainerEmail.trim(),
        phone: trainerPhone.trim(),
      });
      const changeText = formatTimetableChanges(res.timetable_changes);
      showToast(`Trainer "${res.name}" added successfully.${changeText}`);
      setIsAddTrainerOpen(false);
      setTrainerName('');
      setTrainerSpec('');
      setTrainerEmail('');
      setTrainerPhone('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to add trainer.');
    } finally {
      setIsSubmittingTrainer(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchName.trim() || !batchCourse.trim() || !batchTrainerId) {
      alert('Please fill in all batch details.');
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const res = await createBatch({
        name: batchName.trim(),
        course: batchCourse.trim(),
        trainer_id: batchTrainerId,
        size: batchSize,
      });
      const changeText = formatTimetableChanges(res.timetable_changes);
      showToast(`Batch "${res.name}" created and assigned to ${res.trainer}.${changeText}`);
      setIsAddBatchOpen(false);
      setBatchName('');
      setBatchCourse('');
      setBatchSize(20);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to create batch.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Initial delete attempt
  const handleDeleteInitial = async () => {
    if (!trainerToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteTrainer(trainerToDelete.id);
      const changeText = formatTimetableChanges(res.timetable_changes);
      showToast(`Trainer "${res.name}" deleted.${changeText}`);
      setTrainerToDelete(null);
      await loadData();
    } catch (err) {
      // If 409: Trainer still has batches -> show Reassign Modal (B4)
      if (err.status === 409 || (err.message && err.message.includes("Reassign this trainer's batches first"))) {
        const otherTrainers = trainers.filter((t) => t.id !== trainerToDelete.id);
        if (otherTrainers.length > 0) {
          setTargetReassignId(otherTrainers[0].id);
        }
        setReassignModalOpen(true);
      } else {
        alert(err.message || 'Failed to delete trainer.');
        setTrainerToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Reassign and retry delete
  const handleReassignAndDelete = async () => {
    if (!trainerToDelete || !targetReassignId) return;
    setIsDeleting(true);
    try {
      const res = await deleteTrainer(trainerToDelete.id, targetReassignId);
      const changeText = formatTimetableChanges(res.timetable_changes);
      showToast(`Batches reassigned. Trainer "${res.name}" deleted.${changeText}`);
      setReassignModalOpen(false);
      setTrainerToDelete(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to reassign batches and delete trainer.');
    } finally {
      setIsDeleting(false);
    }
  };

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
            <h1 className="page-title">Faculty & Trainers</h1>
            <p className="page-subtitle">
              Manage trainer assignments, batch courses, and automatic clash-free schedule synchronization.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddBatchOpen(true)}
            >
              <span>+ Add Batch</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddTrainerOpen(true)}
            >
              <span>+ Add Trainer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="error-box" role="alert" style={{ marginBottom: '20px' }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          <div className="card skeleton" style={{ height: '180px' }}></div>
          <div className="card skeleton" style={{ height: '180px' }}></div>
          <div className="card skeleton" style={{ height: '180px' }}></div>
          <div className="card skeleton" style={{ height: '180px' }}></div>
        </div>
      )}

      {/* Trainer Cards Grid (B4) */}
      {!isLoading && !errorMessage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {trainers.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {t.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                      {t.specialization}
                    </div>
                  </div>
                  <span className="badge badge-low">Active</span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>📧 {t.email}</div>
                  <div>📞 {t.phone}</div>
                </div>

                {/* Assigned Batches */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Assigned Batches ({t.batches?.length || 0}):
                  </div>
                  {t.batches && t.batches.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {t.batches.map((b) => (
                        <span key={b.id || b.name} className="badge badge-role-counselor">
                          {b.name} ({b.size || 20} students)
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No batches currently assigned.
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Delete Button */}
              <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                  onClick={() => setTrainerToDelete(t)}
                >
                  🗑️ Delete Trainer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Trainer Modal */}
      {isAddTrainerOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Add New Trainer</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsAddTrainerOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrainer}>
              <div className="form-group">
                <label className="form-label" htmlFor="trainer-name">Trainer Name</label>
                <input
                  id="trainer-name"
                  type="text"
                  className="input-text"
                  placeholder="e.g. Vikramaditya"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trainer-spec">Specialization</label>
                <input
                  id="trainer-spec"
                  type="text"
                  className="input-text"
                  placeholder="e.g. Cloud Architecture, DevOps"
                  value={trainerSpec}
                  onChange={(e) => setTrainerSpec(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trainer-email">Email</label>
                <input
                  id="trainer-email"
                  type="email"
                  className="input-text"
                  placeholder="e.g. vikram@institute.com"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trainer-phone">Phone Number</label>
                <input
                  id="trainer-phone"
                  type="text"
                  className="input-text"
                  placeholder="e.g. +91 9876500009"
                  value={trainerPhone}
                  onChange={(e) => setTrainerPhone(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddTrainerOpen(false)}
                  disabled={isSubmittingTrainer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingTrainer}
                >
                  {isSubmittingTrainer ? 'Adding...' : 'Add Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal (B4) */}
      {isAddBatchOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Create New Batch</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setIsAddBatchOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch}>
              <div className="form-group">
                <label className="form-label" htmlFor="batch-name">Batch Name</label>
                <input
                  id="batch-name"
                  type="text"
                  className="input-text"
                  placeholder="e.g. Cloud-F"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="batch-course">Course Subject</label>
                <input
                  id="batch-course"
                  type="text"
                  className="input-text"
                  placeholder="e.g. AWS & DevOps Engineering"
                  value={batchCourse}
                  onChange={(e) => setBatchCourse(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="batch-trainer">Assigned Trainer</label>
                <select
                  id="batch-trainer"
                  className="select-control"
                  style={{ width: '100%' }}
                  value={batchTrainerId}
                  onChange={(e) => setBatchTrainerId(e.target.value)}
                  required
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="batch-size">Expected Class Size</label>
                <input
                  id="batch-size"
                  type="number"
                  min="5"
                  max="35"
                  className="input-text"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddBatchOpen(false)}
                  disabled={isSubmittingBatch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingBatch}
                >
                  {isSubmittingBatch ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Initial) */}
      {trainerToDelete && !reassignModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Delete Trainer</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setTrainerToDelete(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 0', fontSize: '14px', lineHeight: '1.5' }}>
              Are you sure you want to delete trainer <strong>{trainerToDelete.name}</strong>?
              {trainerToDelete.batches && trainerToDelete.batches.length > 0 && (
                <div style={{ marginTop: '8px', color: 'var(--warning-text)', backgroundColor: 'var(--warning-light)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ This trainer has {trainerToDelete.batches.length} active batch(es). You will be prompted to reassign them.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTrainerToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDeleteInitial}
                disabled={isDeleting}
              >
                {isDeleting ? 'Checking...' : 'Delete Trainer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 409 Reassign Batches Modal (B4) */}
      {reassignModalOpen && trainerToDelete && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">Reassign Batches</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setReassignModalOpen(false);
                  setTrainerToDelete(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 0', fontSize: '14px', lineHeight: '1.5' }}>
              <p style={{ marginBottom: '12px' }}>
                Trainer <strong>{trainerToDelete.name}</strong> currently teaches:
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '16px', color: 'var(--text-main)' }}>
                {trainerToDelete.batches?.map((b) => (
                  <li key={b.id || b.name}><strong>{b.name}</strong> ({b.course})</li>
                ))}
              </ul>

              <div className="form-group">
                <label className="form-label">Reassign batches to:</label>
                <select
                  className="select-control"
                  style={{ width: '100%' }}
                  value={targetReassignId}
                  onChange={(e) => setTargetReassignId(e.target.value)}
                >
                  {trainers
                    .filter((t) => t.id !== trainerToDelete.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialization})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setReassignModalOpen(false);
                  setTrainerToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReassignAndDelete}
                disabled={isDeleting || !targetReassignId}
              >
                {isDeleting ? 'Reassigning...' : 'Reassign & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
