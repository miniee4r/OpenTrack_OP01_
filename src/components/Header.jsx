import React from 'react';
import { useRole } from '../context/RoleContext';
import { 
  Bot, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  ChevronDown, 
  Bell, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { INSTITUTE_INFO, ROLES } from '../data/mockData';

export const Header = () => {
  const { 
    currentRole, 
    roleKey, 
    switchRole, 
    selectedCampus, 
    setSelectedCampus,
    setIsCopilotOpen,
    pendingApprovals,
    backendConnected,
    backendToken
  } = useRole();

  const pendingCount = pendingApprovals.filter(a => a.status === 'PENDING_APPROVAL').length;

  return (
    <header style={{
      height: '70px',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left: Brand & Sponsor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
            color: 'white',
            fontWeight: '800',
            fontSize: '1.2rem',
          }}>
            N
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '800', fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#fff' }}>
                NOVIX
              </span>
              <span style={{ 
                fontSize: '0.65rem', 
                background: 'rgba(255, 255, 255, 0.08)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                ERP v2.4
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Institute Operations Platform
            </div>
          </div>
        </div>

        {/* Sponsor Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.12))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          padding: '4px 12px',
          borderRadius: '20px',
        }}>
          <Sparkles size={13} color="#818cf8" />
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#c7d2fe' }}>
            Sponsored by TechSummitTrainers
          </span>
        </div>
      </div>

      {/* Center: Campus Selector & Live Pulse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(17, 23, 38, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '6px 12px',
        }}>
          <Building2 size={15} color="var(--text-secondary)" />
          <select 
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
              fontWeight: '500',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {INSTITUTE_INFO.campuses.map(campus => (
              <option key={campus.id} value={campus.id} style={{ background: '#111726', color: '#fff' }}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>

        {/* Operational Pulse */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '4px 10px',
          borderRadius: '20px'
        }}>
          <span className="pulse-dot"></span>
          <span>Zero Timetable Clashes</span>
        </div>

        {/* Backend API Connection Indicator (Contract: http://localhost:8000) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          fontWeight: '700',
          color: backendConnected ? '#6ee7b7' : '#fcd34d',
          background: backendConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${backendConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          padding: '4px 10px',
          borderRadius: '20px'
        }} title={backendConnected ? `Backend Live at http://localhost:8000 | Bearer Token Active` : 'Syncing with http://localhost:8000...'}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: backendConnected ? '#10b981' : '#f59e0b',
            boxShadow: backendConnected ? '0 0 8px #10b981' : 'none'
          }}></span>
          <span>{backendConnected ? 'API Live (:8000)' : 'API Syncing...'}</span>
        </div>
      </div>

      {/* Right: Role Switcher & Copilot Launch Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Role Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active RBAC Role
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff' }}>
              {currentRole.name}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={roleKey}
              onChange={(e) => switchRole(e.target.value)}
              style={{
                background: roleKey === 'TRAINER' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                border: `1px solid ${roleKey === 'TRAINER' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`,
                color: roleKey === 'TRAINER' ? '#fca5a5' : '#c7d2fe',
                borderRadius: '10px',
                padding: '8px 14px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="OWNER" style={{ background: '#111726', color: '#fff' }}>👑 Owner / Director (Full Access)</option>
              <option value="COUNSELOR" style={{ background: '#111726', color: '#fff' }}>🤝 Academic Counselor (No Salaries)</option>
              <option value="TRAINER" style={{ background: '#111726', color: '#fff' }}>🎓 Lead Trainer (No Fee Access)</option>
              <option value="ACCOUNTS" style={{ background: '#111726', color: '#fff' }}>💳 Accounts Executive (Fee & UPI)</option>
            </select>
          </div>
        </div>

        {/* AI Operations Copilot Button */}
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="btn btn-primary"
          style={{
            position: 'relative',
            padding: '8px 16px',
            borderRadius: '12px',
          }}
        >
          <Bot size={17} />
          <span>Ask Copilot</span>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '1px 5px',
            borderRadius: '4px',
            marginLeft: '4px'
          }}>
            ⌘K
          </span>

          {pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '800',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0a0d14'
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
