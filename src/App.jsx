import React, { useState, useEffect, useCallback } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './components/HomePage';
import { CopilotPage } from './components/CopilotPage';
import { AtRiskPage } from './components/AtRiskPage';
import { ApprovalsPage } from './components/ApprovalsPage';
import { TimetablePage } from './components/TimetablePage';
import { AuditLogPage } from './components/AuditLogPage';
import { setAuthToken, registerUnauthorizedHandler, fetchPendingActions } from './api';

export function App() {
  // Authentication State kept strictly in-memory (no localStorage)
  const [user, setUser] = useState(null); // { username, role, token }
  const [activePage, setActivePage] = useState('home');
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Logout handler resets all state and returns to Login page
  const handleLogout = useCallback(() => {
    setAuthToken('');
    setUser(null);
    setActivePage('home');
    setCopilotPrompt('');
    setPendingCount(0);
  }, []);

  // Register global 401 interceptor
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      handleLogout();
    });
  }, [handleLogout]);

  // Load pending approvals count periodically when logged in as non-trainer
  const refreshPendingCount = useCallback(async () => {
    if (user && user.role !== 'trainer') {
      try {
        const list = await fetchPendingActions();
        if (Array.isArray(list)) {
          const count = list.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
          setPendingCount(count);
        }
      } catch (e) {
        // Silently ignore background polling failure
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role !== 'trainer') {
      refreshPendingCount();
    }
  }, [user, refreshPendingCount]);

  // Login success handler
  const handleLoginSuccess = (userData) => {
    setAuthToken(userData.token);
    setUser(userData);
    setActivePage('home'); // Go straight to Home (Morning Brief) page
  };

  // Navigate to Copilot with an automatic query
  const handleNavigateToCopilot = (promptText) => {
    setCopilotPrompt(promptText || '');
    setActivePage('copilot');
  };

  // Navigate to another page from Morning Brief
  const handleNavigateToPage = (target) => {
    const pageMap = {
      approvals: 'approvals',
      timetable: 'timetable',
      'at-risk': 'at-risk',
      audit: 'audit',
      home: 'home',
    };
    setActivePage(pageMap[target] || 'home');
  };

  // Ask Copilot about a specific student from At-Risk page
  const handleAskCopilotAboutStudent = (student) => {
    const prompt = `Tell me more about student ${student.name} in batch ${student.batch} and their attendance and EMI status.`;
    handleNavigateToCopilot(prompt);
  };

  // IF NOT LOGGED IN -> MUST RENDER LOGIN PAGE (no other page reachable)
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Active page renderer
  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return (
          <HomePage
            user={user}
            onNavigateToCopilot={handleNavigateToCopilot}
            onNavigateToPage={handleNavigateToPage}
          />
        );
      case 'copilot':
        return (
          <CopilotPage
            user={user}
            initialPrompt={copilotPrompt}
            onActionDecided={refreshPendingCount}
          />
        );
      case 'at-risk':
        return (
          <AtRiskPage
            onAskCopilotAboutStudent={handleAskCopilotAboutStudent}
          />
        );
      case 'approvals':
        // Guard: trainers cannot access approvals
        if (user.role === 'trainer') {
          return (
            <div className="page-wrapper">
              <div className="error-box">
                <span>🔒</span>
                <span>Trainers do not have access to the Approvals page.</span>
              </div>
            </div>
          );
        }
        return (
          <ApprovalsPage
            onPendingCountChange={setPendingCount}
          />
        );
      case 'timetable':
        return <TimetablePage />;
      case 'audit':
        // Guard: only owner can access audit log
        if (user.role !== 'owner') {
          return (
            <div className="page-wrapper">
              <div className="error-box">
                <span>🔒</span>
                <span>Access Denied: Only the Owner role can view the Audit Ledger.</span>
              </div>
            </div>
          );
        }
        return <AuditLogPage />;
      default:
        return (
          <HomePage
            user={user}
            onNavigateToCopilot={handleNavigateToCopilot}
            onNavigateToPage={handleNavigateToPage}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.95rem' }}>
          <span>🏫</span>
          <span>Ops Copilot</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setIsMobileOpen((prev) => !prev)}
        >
          {isMobileOpen ? '✕ Close' : '☰ Menu'}
        </button>
      </div>

      {/* Left Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          setCopilotPrompt('');
        }}
        user={user}
        onLogout={handleLogout}
        pendingCount={pendingCount}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
