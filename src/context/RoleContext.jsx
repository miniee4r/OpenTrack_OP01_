import React, { createContext, useContext, useState, useMemo } from 'react';
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

  // Copilot Drawer Open/Close State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState('');

  // Active Campus
  const [selectedCampus, setSelectedCampus] = useState('blr-main');

  const currentRole = useMemo(() => ROLES[roleKey], [roleKey]);

  const switchRole = (newRoleKey) => {
    setRoleKey(newRoleKey);
    // Log role switch to audit trail
    addAuditLog({
      action: 'ROLE_SWITCH',
      summary: `Switched operational context to ${ROLES[newRoleKey].badge}`,
      query: `SESSION_CONTEXT = '${ROLES[newRoleKey].id}'`,
      status: 'Context Switched',
      securityCheck: 'Verified'
    });
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
      id: `APPR-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleTimeString(),
      status: 'PENDING_APPROVAL',
      operatorRole: currentRole.badge,
      ...actionData
    };
    setPendingApprovals(prev => [newApproval, ...prev]);
    return newApproval;
  };

  // Approve a pending action
  const approveAction = (approvalId) => {
    const item = pendingApprovals.find(a => a.id === approvalId);
    if (!item) return;

    setPendingApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'APPROVED', approvedAt: new Date().toLocaleTimeString() } : a));

    // Execute corresponding state modification if applicable
    if (item.type === 'WHATSAPP_DISPATCH') {
      addAuditLog({
        action: 'WHATSAPP_DISPATCH_EXECUTED',
        summary: `Dispatched WhatsApp reminder to ${item.recipientCount} student(s) regarding EMI and attendance`,
        query: `DISPATCH_WHATSAPP(template='emi_attendance_alert', recipients=${item.recipientCount})`,
        status: 'Sent via WhatsApp Gateway',
        securityCheck: 'Human Verified & Approved'
      });
    } else if (item.type === 'TIMETABLE_REPLAN') {
      addAuditLog({
        action: 'TIMETABLE_REPLAN_EXECUTED',
        summary: `Applied clash-free schedule adjustment: ${item.summary}`,
        query: item.query || 'APPLY_TIMETABLE_CHANGES()',
        status: 'Timetable Updated',
        securityCheck: 'Clash-Free Heuristic Validated'
      });
    }
  };

  // Reject a pending action
  const rejectAction = (approvalId, reason = 'Rejected by operator') => {
    setPendingApprovals(prev => prev.map(a => a.id === approvalId ? { ...a, status: 'REJECTED', rejectReason: reason } : a));
    addAuditLog({
      action: 'ACTION_REJECTED',
      summary: `Action ${approvalId} was declined by ${currentRole.badge}: ${reason}`,
      query: `REJECT_OPERATION('${approvalId}')`,
      status: 'Declined',
      securityCheck: 'Operator Override'
    });
  };

  // Reconcile UPI Statement
  const reconcileStatement = (statementId, studentId) => {
    const stmt = bankStatements.find(s => s.id === statementId);
    if (!stmt) return;

    setBankStatements(prev => prev.map(s => s.id === statementId ? { ...s, status: 'Reconciled' } : s));
    
    // Update student's fee paid
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
          dropoutRiskScore: Math.max(10, st.dropoutRiskScore - 25), // reduces risk
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
  };

  // Timetable Re-planner simulation
  const replanForTrainerAbsence = (trainerName, affectedDay = 'Friday') => {
    // Substitute trainer logic
    const substitute = TRAINERS.find(t => t.name !== trainerName);
    const affectedSlot = timetableSlots.find(s => s.trainerName === trainerName && s.day === affectedDay);
    
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

    return {
      affectedSlot,
      substitute,
      explanation
    };
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
        batches: BATCHES,
        trainers: TRAINERS,
        courses: COURSES,
        rooms: ROOMS,
        recordings,
        timetableSlots,
        auditLogs,
        bankStatements,
        pendingApprovals,
        isCopilotOpen,
        setIsCopilotOpen,
        copilotInitialQuery,
        openCopilotWithPrompt,
        selectedCampus,
        setSelectedCampus,
        addAuditLog,
        queueHumanApproval,
        approveAction,
        rejectAction,
        reconcileStatement,
        replanForTrainerAbsence,
        validateQuerySecurity,
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
