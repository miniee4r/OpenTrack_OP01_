import React, { useState, useEffect } from 'react';
import { RoleProvider, useRole } from './context/RoleContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AICopilot } from './components/AICopilot';
import { StudentsView } from './components/StudentsView';
import { BatchesView } from './components/BatchesView';
import { TimetableGenerator } from './components/TimetableGenerator';
import { FeeReconciler } from './components/FeeReconciler';
import { RiskEngine } from './components/RiskEngine';
import { CertificateBuilder } from './components/CertificateBuilder';
import { AuditLogView } from './components/AuditLogView';
import { Sparkles, Bot, X, CheckCircle2, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [certStudent, setCertStudent] = useState(null);
  const { isCopilotOpen, setIsCopilotOpen, toasts, removeToast } = useRole();

  // Keyboard shortcut: Ctrl+K / Cmd+K toggles Copilot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCopilotOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCopilotOpen]);

  const handleSelectCertificateStudent = (student) => {
    setCertStudent(student);
    setActiveTab('certificates');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'copilot':
        return <AICopilot isDrawer={false} />;
      case 'students':
        return <StudentsView onSelectCertificateStudent={handleSelectCertificateStudent} />;
      case 'batches':
        return <BatchesView />;
      case 'timetable':
        return <TimetableGenerator />;
      case 'fees':
        return <FeeReconciler />;
      case 'risk':
        return <RiskEngine />;
      case 'certificates':
        return <CertificateBuilder preselectedStudent={certStudent} />;
      case 'audit':
        return <AuditLogView />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-content">
        <Header />

        <main className="page-container">
          {renderActiveTab()}
        </main>
      </div>

      {/* Slide-over Copilot Drawer (accessible from any page via Cmd+K or Header button) */}
      {isCopilotOpen && (
        <div 
          className="modal-backdrop animate-fade-in" 
          onClick={() => setIsCopilotOpen(false)}
          style={{ justifyContent: 'flex-end', padding: 0 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              height: '100vh',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-accent)',
              boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <AICopilot isDrawer={true} onClose={() => setIsCopilotOpen(false)} />
          </div>
        </div>
      )}

      {/* Real-Time Toast Notifications Stack (Bottom-Right) */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 9999,
          maxWidth: '420px',
        }}>
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success';
            const isDanger = toast.type === 'danger';
            const isWarning = toast.type === 'warning';

            return (
              <div
                key={toast.id}
                className="animate-slide-up"
                style={{
                  background: isSuccess 
                    ? 'rgba(16, 185, 129, 0.95)' 
                    : isDanger 
                      ? 'rgba(239, 68, 68, 0.95)' 
                      : isWarning 
                        ? 'rgba(245, 158, 11, 0.95)' 
                        : 'rgba(30, 41, 59, 0.95)',
                  backdropFilter: 'blur(12px)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  fontSize: '0.84rem',
                  fontWeight: '500',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSuccess ? <CheckCircle2 size={16} /> : isDanger ? <AlertOctagon size={16} /> : isWarning ? <AlertTriangle size={16} /> : <Info size={16} />}
                  <span>{toast.message}</span>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <RoleProvider>
      <AppContent />
    </RoleProvider>
  );
}
