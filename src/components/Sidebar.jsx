import React from 'react';
import { useRole } from '../context/RoleContext';
import {
  LayoutDashboard,
  Bot,
  Users,
  Layers,
  CalendarCheck,
  CreditCard,
  AlertOctagon,
  Award,
  ScrollText,
  Lock,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { currentRole, pendingApprovals } = useRole();

  const pendingApprovalsCount = pendingApprovals.filter(a => a.status === 'PENDING_APPROVAL').length;

  const navItems = [
    {
      id: 'overview',
      label: 'Operations Overview',
      icon: LayoutDashboard,
      allowed: true,
      badge: null,
    },
    {
      id: 'copilot',
      label: 'AI Operations Copilot',
      icon: Bot,
      allowed: true,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Action` : 'AI Core',
      badgeColor: pendingApprovalsCount > 0 ? 'badge-danger' : 'badge-purple',
    },
    {
      id: 'students',
      label: 'Students Directory',
      icon: Users,
      allowed: true,
      badge: '486',
      badgeColor: 'badge-info',
    },
    {
      id: 'batches',
      label: 'Batches & Hybrid Logs',
      icon: Layers,
      allowed: true,
      badge: '4 Live',
      badgeColor: 'badge-success',
    },
    {
      id: 'timetable',
      label: 'Clash-Free Timetable',
      icon: CalendarCheck,
      allowed: true,
      badge: 'Auto Solver',
      badgeColor: 'badge-cyan',
    },
    {
      id: 'fees',
      label: 'Fees & UPI Reconciler',
      icon: CreditCard,
      allowed: currentRole.canViewFees, // STRICT RULE: Hidden or locked for Trainer
      locked: !currentRole.canViewFees,
      badge: 'UPI Match',
      badgeColor: 'badge-warning',
    },
    {
      id: 'risk',
      label: 'Dropout Risk Engine',
      icon: AlertOctagon,
      allowed: true,
      badge: '3 At Risk',
      badgeColor: 'badge-danger',
    },
    {
      id: 'certificates',
      label: 'Verifiable Certificates',
      icon: Award,
      allowed: true,
      badge: 'QR Signed',
      badgeColor: 'badge-purple',
    },
    {
      id: 'audit',
      label: 'Immutable Audit Trail',
      icon: ScrollText,
      allowed: true,
      badge: 'SEC-LOG',
      badgeColor: 'badge-info',
    }
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px 14px',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      <div>
        {/* Navigation Category Label */}
        <div style={{
          fontSize: '0.675rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          padding: '0 12px 12px 12px',
        }}>
          Operations Modules
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = item.locked;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isLocked) {
                    alert(`ACCESS RESTRICTED [RBAC-403]: Your active role (${currentRole.badge}) does not have permission to view Fees & Financial Registers.`);
                    return;
                  }
                  setActiveTab(item.id);
                }}
                disabled={isLocked}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(99, 102, 241, 0.06))' 
                    : isLocked ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                  color: isActive ? '#fff' : isLocked ? 'var(--text-muted)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '0.85rem',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left',
                  opacity: isLocked ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon 
                    size={17} 
                    color={isActive ? '#818cf8' : isLocked ? '#ef4444' : 'currentColor'} 
                  />
                  <span>{item.label}</span>
                </div>

                {isLocked ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#f87171' }}>
                    <Lock size={12} />
                    <span>Locked</span>
                  </span>
                ) : item.badge ? (
                  <span className={`badge ${item.badgeColor || 'badge-info'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Indicator Footer Card */}
      <div style={{
        background: 'rgba(24, 34, 56, 0.5)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.2rem' }}>{currentRole.avatar}</span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>
              {currentRole.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {currentRole.badge}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: '0.7rem',
          color: currentRole.canViewFees ? 'var(--success)' : '#fca5a5',
          background: currentRole.canViewFees ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${currentRole.canViewFees ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: '6px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}>
          {currentRole.canViewFees ? (
            <span>✅ Fee Access Authorized</span>
          ) : (
            <span>🛡️ Fee Data Blocked (RBAC)</span>
          )}
        </div>
      </div>
    </aside>
  );
};
