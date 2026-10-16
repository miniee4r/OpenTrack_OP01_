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
import { Sparkles, Bot, X } from 'lucide-react';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [certStudent, setCertStudent] = useState(null);
  const { isCopilotOpen, setIsCopilotOpen } = useRole();

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
