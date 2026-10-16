import React, { useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
  Upload,
  Receipt,
  Sparkles,
  ExternalLink,
  Printer,
  X,
  FileCheck2
} from 'lucide-react';
import { INSTITUTE_INFO } from '../data/mockData';

export const FeeReconciler = () => {
  const { currentRole, bankStatements, reconcileStatement, batchReconcileAll, students } = useRole();
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Hard RBAC Guard for Trainer Role
  if (!currentRole.canViewFees) {
    return (
      <div className="glass-panel" style={{
        padding: '60px 40px',
        textAlign: 'center',
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid var(--danger-border)',
        borderRadius: '16px',
        maxWidth: '700px',
        margin: '40px auto',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: '#ef4444'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
          ACCESS RESTRICTED [RBAC SECURITY ENFORCEMENT]
        </h2>
        <p style={{ color: '#fca5a5', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '20px' }}>
          Your current active operational role (<strong>{currentRole.badge}</strong>) is strictly prohibited from accessing fee collections, EMI records, or UPI bank statement reconciliations, however the request is phrased.
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          To view financial registers, switch your role context to <strong>Owner / Director</strong> or <strong>Accounts Executive</strong> in the top header.
        </div>
      </div>
    );
  }

  const filteredStatements = bankStatements.filter(s => {
    if (filterStatus === 'Pending' && s.status !== 'Pending Reconciliation') return false;
    if (filterStatus === 'Reconciled' && s.status !== 'Reconciled' && s.status !== 'Auto-Reconciled') return false;
    return true;
  });

  const totalCollected = students.reduce((acc, s) => acc + s.feePaid, 0);
  const totalPending = students.reduce((acc, s) => acc + s.feePending, 0);
  const pendingHighMatch = bankStatements.filter(s => s.status === 'Pending Reconciliation' && s.suggestedStudentId && s.matchConfidence >= 90);

  const handleOpenReceipt = (stmt) => {
    const student = students.find(s => s.id === stmt.suggestedStudentId) || students[0];
    setActiveReceipt({
      receiptNo: `REC-2026-${stmt.id.replace('TXN-', '')}`,
      studentName: student.name,
      studentId: student.id,
      courseName: student.courseName,
      batchName: student.batchName,
      amount: stmt.amount,
      utr: stmt.utr,
      date: stmt.timestamp,
      phone: stmt.payerPhone,
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-warning">
                <CreditCard size={12} />
                Accounts & Treasury Ledger
              </span>
              <span className="badge badge-success">
                Fuzzy UTR Matching Active
              </span>
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              Fee Instalments & Automated UPI Statement Reconciler
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Reconcile incoming bank credits and UPI payments against student EMI instalments with single-click ledger credit.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {pendingHighMatch.length > 0 && (
              <button onClick={batchReconcileAll} className="btn btn-success">
                <Sparkles size={14} />
                <span>Reconcile All High-Confidence ({pendingHighMatch.length})</span>
              </button>
            )}
            <button className="btn btn-secondary">
              <Upload size={14} />
              <span>Import ICICI / HDFC CSV Feed</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Batch Collections</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--success)', marginTop: '4px' }}>
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outstanding Fee Receivables</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f87171', marginTop: '4px' }}>
              ₹{totalPending.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Statement Credits</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>
              ₹17,000 (2 UPI Items)
            </div>
          </div>
        </div>
      </div>

      {/* UPI / Bank Statement Reconciliation Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
              Bank & UPI Transaction Statements ({filteredStatements.length})
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Fuzzy matcher correlates payer telephone numbers, student IDs, and EMI instalment amounts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['All', 'Pending', 'Reconciled'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-ghost'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredStatements.map(stmt => {
            const isPending = stmt.status === 'Pending Reconciliation';
            return (
              <div
                key={stmt.id}
                style={{
                  background: isPending ? 'rgba(245, 158, 11, 0.05)' : 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${isPending ? 'var(--warning-border)' : 'var(--border-subtle)'}`,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: isPending ? '#fbbf24' : '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Receipt size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#fff', fontSize: '0.92rem' }}>
                        {stmt.payerName}
                      </strong>
                      <span className={`badge ${stmt.matchConfidence >= 90 ? 'badge-success' : stmt.matchConfidence >= 70 ? 'badge-warning' : 'badge-danger'}`}>
                        {stmt.matchConfidence}% Match
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#93c5fd', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {stmt.utr}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {stmt.timestamp} • Phone: {stmt.payerPhone}
                    </div>
                  </div>
                </div>

                {/* Match Target & Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>
                      ₹{stmt.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Match: <strong style={{ color: '#c7d2fe' }}>{stmt.suggestedStudentName}</strong>
                    </div>
                  </div>

                  {isPending && stmt.suggestedStudentId ? (
                    <button
                      onClick={() => reconcileStatement(stmt.id, stmt.suggestedStudentId)}
                      className="btn btn-success btn-sm"
                    >
                      <CheckCircle2 size={14} />
                      <span>1-Click Reconcile</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-success" style={{ padding: '6px 12px' }}>
                        ✓ Reconciled
                      </span>
                      {stmt.suggestedStudentId && (
                        <button
                          onClick={() => handleOpenReceipt(stmt)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          <FileCheck2 size={13} />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Tax Receipt Modal */}
      {activeReceipt && (
        <div className="modal-backdrop" onClick={() => setActiveReceipt(null)}>
          <div
            className="modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', padding: '32px', background: '#0e1422' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: '4px' }}>
                  TechSummit Institute Official Tax Receipt
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                  Receipt #{activeReceipt.receiptNo}
                </h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payer / Student Name:</span>
                <strong style={{ color: '#fff' }}>{activeReceipt.studentName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Student Registration ID:</span>
                <strong style={{ color: '#93c5fd' }}>{activeReceipt.studentId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Enrolled Program:</span>
                <span style={{ color: '#cbd5e1' }}>{activeReceipt.courseName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Channel & UTR:</span>
                <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{activeReceipt.utr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Timestamp:</span>
                <span style={{ color: '#cbd5e1' }}>{activeReceipt.date}</span>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success-border)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center',
                marginTop: '10px'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Received & Credited</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399', marginTop: '4px' }}>
                  ₹{activeReceipt.amount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Status: Credited to Student EMI Ledger • GST Compliant
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                <Printer size={14} />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
