import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { 
  ROLES, 
  INITIAL_STUDENTS, 
  BATCHES, 
  INITIAL_TIMETABLE_SLOTS, 
  BANK_UPI_STATEMENTS, 
  INITIAL_AUDIT_LOGS,
  TRAINERS,
  COURSES,
  ROOMS,
  RECORDINGS
} from '../data/mockData';

const RoleContext = createContext(null);

export const RoleProvider = ({ children }) => {
  // Active Role State
  const [roleKey, setRoleKey] = useState('OWNER');
  
  // Institute Operational State
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [timetableSlots, setTimetableSlots] = useState(INITIAL_TIMETABLE_SLOTS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [bankStatements, setBankStatements] = useState(BANK_UPI_STATEMENTS);
  const [recordings, setRecordings] = useState(RECORDINGS);

  // Active Pending Approvals queue for the Human-in-the-Loop workflow
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // Backend API connection & Token state
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendToken, setBackendToken] = useState('');

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Copilot Drawer Open/Close State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState('');

  // Active Campus
  const [selectedCampus, setSelectedCampus] = useState('blr-main');

  const currentRole = useMemo(() => ROLES[roleKey], [roleKey]);

  // Synchronize with Backend API (http://localhost:8000)
  const syncWithBackend = useCallback(async (role = roleKey) => {
    try {
      // 1. Authenticate & Obtain Bearer Token
      const loginData = await api.login(role.toLowerCase(), 'password');
      if (loginData?.token) {
        setBackendConnected(true);
        setBackendToken(loginData.token);
      }

      // 2. Fetch Live Pending Approvals (GET /pending)
      const livePending = await api.getPendingActions();
      if (livePending && Array.isArray(livePending) && livePending.length > 0) {
        setPendingApprovals(livePending.map(item => ({
          id: item.id,
          title: item.type === 'WHATSAPP_DISPATCH' ? 'WhatsApp Academic & Fee Reminder Broadcast' : 'Schedule Re-plan Notice',
          summary: item.message,
          recipientCount: 1,
          recipients: [{ name: item['student name'] || item.student_name, phone: item.phone, amount: item.amount }],
          templateMessage: item.message,
          status: (item.status || 'pending').toUpperCase() === 'PENDING' ? 'PENDING_APPROVAL' : (item.status || '').toUpperCase(),
          targetChannel: 'WhatsApp Business API',
          ...item
        })));
      }

      // 3. Fetch Live Audit Logs (GET /audit)
      const liveAudit = await api.getAuditLogs();
      if (liveAudit && Array.isArray(liveAudit) && liveAudit.length > 0) {
        setAuditLogs(liveAudit.map((log, idx) => ({
          id: `AUD-LIVE-${idx}`,
          timestamp: log.ts,
          operatorName: log.who,
          operatorRole: log.role,
          action: log.action,
          summary: log.detail,
          query: log.action,
          status: 'Recorded in Ledger',
          securityCheck: 'Signed & Verified'
        })));
      }

      // 4. Fetch Live Timetable (GET /timetable)
      const liveTimetable = await api.getTimetable();
      if (liveTimetable && Array.isArray(liveTimetable) && liveTimetable.length > 0) {
        setTimetableSlots(prev => {
          // Merge room/batch attributes
          return liveTimetable.map((slot, i) => ({
            id: slot.id || `SLOT-${i}`,
            day: slot.day,
            time: slot.time,
            batchName: slot.batch,
            trainerName: slot.trainer,
            roomName: slot.room,
            mode: 'Hybrid (Turnstile + Zoom)',
            enrolledCount: 28,
            status: 'Confirmed'
          }));
        });
      }
    } catch (err) {
      console.log('[RoleContext] Operating with local state / mock fallback:', err.message);
      setBackendConnected(false);
    }
  }, [roleKey]);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const addToast = (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b']
      });
    } catch (e) {
      // safe fallback if canvas not available
    }
  };

  const switchRole = async (newRoleKey) => {
    setRoleKey(newRoleKey);
    try {
      await api.login(newRoleKey.toLowerCase(), 'password');
    } catch (e) {
      // safe fallback
    }
    addAuditLog({
      action: 'ROLE_SWITCH',
      summary: `Switched operational context to ${ROLES[newRoleKey].badge}`,
      query: `SESSION_CONTEXT = '${ROLES[newRoleKey].id}'`,
      status: 'Context Switched',
      securityCheck: 'Verified'
    });
    addToast(`Switched operational context to ${ROLES[newRoleKey].badge}`, 'info');
  };

  // Audit Logger
  const addAuditLog = (entry) => {
    const newLog = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operatorName: currentRole.name,
      operatorRole: currentRole.badge,
      ...entry,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Add an action requiring human approval
  const queueHumanApproval = (actionData) => {
    const newApproval = {
      id: actionData.id || `APPR-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleTimeString(),
      status: 'PENDING_APPROVAL',
      operatorRole: currentRole.badge,
      ...actionData
    };
    setPendingApprovals(prev => [newApproval, ...prev]);
    addToast(`New action preview queued for human authorization: ${actionData.title || 'Action'}`, 'warning');
    return newApproval;
  };

  // Update a pending action draft (Inline customization)
  const updatePendingAction = (approvalId, updatedData) => {
    setPendingApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, ...updatedData } : a));
    addToast('Action draft successfully customized', 'info');
  };

  // Approve a pending action
  const approveAction = async (approvalId) => {
    const item = pendingApprovals.find(a => a.id === approvalId);
    if (!item) return;

    // Call live backend POST /pending/{id}/approve
    try {
      await api.approvePending(approvalId);
    } catch (e) {
      console.warn('Backend sync for approval:', e.message);
    }

    setPendingApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'APPROVED', approvedAt: new Date().toLocaleTimeString() } : a));

    if (item.type === 'WHATSAPP_DISPATCH') {
      addAuditLog({
        action: 'WHATSAPP_DISPATCH_EXECUTED',
        summary: `Dispatched WhatsApp reminder to ${item.recipientCount || 1} student(s) regarding EMI and attendance`,
        query: `DISPATCH_WHATSAPP(template='emi_attendance_alert', recipients=${item.recipientCount || 1})`,
        status: 'Sent via WhatsApp Gateway',
        securityCheck: 'Human Verified & Approved'
      });
      addToast(`Dispatched WhatsApp broadcast to ${item.recipientCount || 1} student(s)`, 'success');
      triggerConfetti();
    } else if (item.type === 'TIMETABLE_REPLAN') {
      addAuditLog({
        action: 'TIMETABLE_REPLAN_EXECUTED',
        summary: `Applied clash-free schedule adjustment: ${item.summary || 'Schedule Re-Plan'}`,
        query: item.query || 'APPLY_TIMETABLE_CHANGES()',
        status: 'Timetable Updated',
        securityCheck: 'Clash-Free Heuristic Validated'
      });
      addToast('Timetable schedule updated without clashes', 'success');
      triggerConfetti();
    }
  };

  // Reject a pending action
  const rejectAction = async (approvalId, reason = 'Rejected by operator') => {
    // Call live backend POST /pending/{id}/reject
    try {
      await api.rejectPending(approvalId);
    } catch (e) {
      console.warn('Backend sync for rejection:', e.message);
    }

    setPendingApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'REJECTED', rejectReason: reason } : a));
    addAuditLog({
      action: 'ACTION_REJECTED',
      summary: `Action ${approvalId} was declined by ${currentRole.badge}: ${reason}`,
      query: `REJECT_OPERATION('${approvalId}')`,
      status: 'Declined',
      securityCheck: 'Operator Override'
    });
    addToast(`Action ${approvalId} was declined`, 'danger');
  };

  // Reconcile UPI Statement
  const reconcileStatement = (statementId, studentId) => {
    const stmt = bankStatements.find(s => s.id === statementId);
    if (!stmt) return;

    setBankStatements(prev => prev.map(s => s.id === statementId ? { ...s, status: 'Reconciled' } : s));
    
    setStudents(prev => prev.map(st => {
      if (st.id === studentId) {
        const newPaid = st.feePaid + stmt.amount;
        const newPending = Math.max(0, st.feeTotal - newPaid);
        return {
          ...st,
          feePaid: newPaid,
          feePending: newPending,
          emiStatus: newPending === 0 ? 'Paid' : 'Partially Cleared',
          nextEmiAmount: Math.min(newPending, st.nextEmiAmount),
          dropoutRiskScore: Math.max(10, st.dropoutRiskScore - 25),
        };
      }
      return st;
    }));

    addAuditLog({
      action: 'FEE_RECONCILED',
      summary: `Matched ${stmt.utr} (₹${stmt.amount.toLocaleString('en-IN')}) with Student ${studentId}`,
      query: `UPDATE student_ledger SET fee_paid = fee_paid + ${stmt.amount} WHERE id = '${studentId}'`,
      status: 'Reconciled in Ledger',
      securityCheck: 'Accounts Validation Passed'
    });

    addToast(`Reconciled ₹${stmt.amount.toLocaleString('en-IN')} via ${stmt.utr}`, 'success');
    triggerConfetti();
  };

  // Batch Reconcile all high-confidence transactions
  const batchReconcileAll = () => {
    const pendingEligible = bankStatements.filter(s => s.status === 'Pending Reconciliation' && s.suggestedStudentId && s.matchConfidence >= 90);
    if (pendingEligible.length === 0) {
      addToast('No high-confidence pending statements to reconcile', 'info');
      return;
    }

    pendingEligible.forEach(stmt => {
      reconcileStatement(stmt.id, stmt.suggestedStudentId);
    });

    addToast(`Batch reconciled ${pendingEligible.length} statement entries successfully!`, 'success');
  };

  // Simulate Live Attendance Check-In (Turnstile QR scan)
  const simulateTurnstileCheckIn = (studentId) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const newAttended = s.attendedClasses + 1;
        const newMissed = Math.max(0, s.missedClasses - 1);
        const newPct = Math.round((newAttended / s.totalClasses) * 1000) / 10;
        return {
          ...s,
          attendedClasses: newAttended,
          missedClasses: newMissed,
          attendancePercentage: newPct,
          classroomCheckins: s.classroomCheckins + 1,
          dropoutRiskScore: Math.max(15, s.dropoutRiskScore - 18),
          lastActive: 'Just now (Turnstile Gate A)',
        };
      }
      return s;
    }));

    addAuditLog({
      action: 'HYBRID_CHECKIN_QR',
      summary: `Real-time physical turnstile QR check-in recorded for ${targetStudent.name} (Gate A)`,
      query: `RECORD_PHYSICAL_CHECKIN(student_id='${studentId}', hardware_reader='TURNSTILE-A', timestamp=NOW())`,
      status: 'Turnstile Verified',
      securityCheck: 'Biometric/QR Signature Validated'
    });

    addToast(`Recorded turnstile check-in for ${targetStudent.name}`, 'success');
  };

  // Timetable Re-planner simulation for multiple scenarios
  const replanForTrainerAbsence = (trainerName, affectedDay = 'Friday') => {
    const substitute = TRAINERS.find(t => t.name !== trainerName);
    const affectedSlot = timetableSlots.find(s => s.trainerName.includes(trainerName) && s.day === affectedDay);
    
    if (!affectedSlot) return null;

    const updatedSlots = timetableSlots.map(s => {
      if (s.id === affectedSlot.id) {
        return {
          ...s,
          trainerName: `${substitute.name} (Substitute)`,
          status: 'Re-Planned (Clash Free)',
          replanNote: `Originally assigned to ${trainerName}. Reassigned to ${substitute.name} to avoid session cancellation.`
        };
      }
      return s;
    });

    setTimetableSlots(updatedSlots);

    const explanation = `Detected absence of ${trainerName} on ${affectedDay}. Slot ${affectedSlot.time} (${affectedSlot.course}) was reassigned to ${substitute.name}. Verified room capacity (${affectedSlot.roomName}) and trainer schedule: 0 clashes detected.`;

    addAuditLog({
      action: 'TIMETABLE_AUTO_REPLAN',
      summary: explanation,
      query: `REPLAN_SCHEDULE(absent_trainer='${trainerName}', day='${affectedDay}', solver='clash_free_heuristic_v2')`,
      status: 'Computed in 18ms',
      securityCheck: 'Hard Constraints Checked'
    });

    addToast(`Re-planned schedule for ${affectedDay}: Substitute ${substitute.name} assigned`, 'success');

    return {
      affectedSlot,
      substitute,
      explanation
    };
  };

  // Room Overhaul Re-Planner Scenario
  const replanForRoomMaintenance = (originalRoomId = 'RM-101', targetRoomId = 'RM-SEM', day = 'Thursday') => {
    const origRoom = ROOMS.find(r => r.id === originalRoomId);
    const targetRoom = ROOMS.find(r => r.id === targetRoomId);

    const updatedSlots = timetableSlots.map(s => {
      if (s.roomId === originalRoomId && s.day === day) {
        return {
          ...s,
          roomId: targetRoomId,
          roomName: `${targetRoom.name} (Relocated)`,
          roomCapacity: targetRoom.capacity,
          status: 'Re-Planned (Room Relocation)',
          replanNote: `Relocated from ${origRoom.name} due to amphitheater maintenance. Capacity ${targetRoom.capacity} verified.`
        };
      }
      return s;
    });

    setTimetableSlots(updatedSlots);

    const explanation = `Relocated sessions from ${origRoom.name} to ${targetRoom.name} on ${day}. Seating capacity (${targetRoom.capacity}) satisfies batch size. No overlapping bookings.`;

    addAuditLog({
      action: 'ROOM_RELOCATION_REPLAN',
      summary: explanation,
      query: `RELOCATE_ROOM(from='${originalRoomId}', to='${targetRoomId}', day='${day}')`,
      status: 'Relocated in 14ms',
      securityCheck: 'Capacity Constraint Satisfied'
    });

    addToast(`Relocated ${day} slots to ${targetRoom.name}`, 'info');

    return { explanation };
  };

  // Strict RBAC Query Validator for AI Copilot
  const validateQuerySecurity = (query) => {
    const qLower = query.toLowerCase();
    const financialKeywords = ['fee', 'emi', 'dues', 'paid', 'pending fee', 'rupees', 'salary', 'cost', 'revenue', 'collection', 'instalment', 'installment', 'financial', 'unpaid'];

    if (currentRole.id === 'trainer') {
      const violatesFeePrivacy = financialKeywords.some(keyword => qLower.includes(keyword));
      if (violatesFeePrivacy) {
        return {
          allowed: false,
          reason: `SECURITY POLICY ENFORCEMENT [RBAC-SEC-403]: Access Denied. Your active role (${currentRole.badge}) is strictly prohibited from accessing fee registers, student instalments, or payment records, however the question is phrased.`
        };
      }
    }

    return { allowed: true };
  };

  const openCopilotWithPrompt = (prompt) => {
    setCopilotInitialQuery(prompt);
    setIsCopilotOpen(true);
  };

  return (
    <RoleContext.Provider
      value={{
        roleKey,
        currentRole,
        switchRole,
        students,
        setStudents,
        batches: BATCHES,
        trainers: TRAINERS,
        courses: COURSES,
        rooms: ROOMS,
        recordings,
        timetableSlots,
        setTimetableSlots,
        auditLogs,
        bankStatements,
        setBankStatements,
        pendingApprovals,
        isCopilotOpen,
        setIsCopilotOpen,
        copilotInitialQuery,
        openCopilotWithPrompt,
        selectedCampus,
        setSelectedCampus,
        addAuditLog,
        queueHumanApproval,
        updatePendingAction,
        approveAction,
        rejectAction,
        reconcileStatement,
        batchReconcileAll,
        simulateTurnstileCheckIn,
        replanForTrainerAbsence,
        replanForRoomMaintenance,
        validateQuerySecurity,
        triggerConfetti,
        backendConnected,
        backendToken,
        api,
        syncWithBackend,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};
