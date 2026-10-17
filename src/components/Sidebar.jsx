import React from 'react';

export const Sidebar = ({
  activePage,
  setActivePage,
  user,
  onLogout,
  pendingCount = 0,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const role = user?.role || 'owner';

  // Menu items configured strictly per role (B2)
  const menuConfig = {
    owner: [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'copilot', label: 'Copilot', icon: '🤖' },
      { id: 'at-risk', label: 'At-risk students', icon: '⚠️' },
      { id: 'approvals', label: 'Approvals', icon: '📋', badge: pendingCount },
      { id: 'students', label: 'Students', icon: '🎓' },
      { id: 'trainers', label: 'Trainers', icon: '👨‍🏫' },
      { id: 'timetable', label: 'Timetable', icon: '📅' },
      { id: 'audit', label: 'Audit log', icon: '📜' },
    ],
    counselor: [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'copilot', label: 'Copilot', icon: '🤖' },
      { id: 'at-risk', label: 'At-risk students', icon: '⚠️' },
      { id: 'approvals', label: 'Approvals', icon: '📋', badge: pendingCount },
      { id: 'students', label: 'Students', icon: '🎓' },
      { id: 'timetable', label: 'Timetable', icon: '📅' },
    ],
    trainer: [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'copilot', label: 'Copilot', icon: '🤖' },
      { id: 'at-risk', label: 'At-risk students', icon: '⚠️' },
      { id: 'timetable', label: 'Timetable', icon: '📅' },
    ],
    accounts: [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'copilot', label: 'Copilot', icon: '🤖' },
      { id: 'approvals', label: 'Approvals', icon: '📋', badge: pendingCount },
    ],
  };

  const visibleItems = menuConfig[role] || menuConfig.owner;
  const initial = (user?.username || 'U')[0].toUpperCase();

  return (
    <aside className={`sidebar dark-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-title">
          <span>🏫</span>
          <span>Ops Copilot</span>
        </div>
        <div className="brand-tag">Institute Operations</div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
            >
              <div className="nav-item-left">
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </div>
              {item.id === 'approvals' && item.badge > 0 && (
                <span className="badge-pending-count">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar-circle">
            {initial}
          </div>
          <div className="user-info-text">
            <div className="user-name">{user?.username}</div>
            <span className={`role-badge role-${role}`}>
              {role}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-logout"
          onClick={onLogout}
          title="Sign out of your session"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
