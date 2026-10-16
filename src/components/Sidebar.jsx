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

  // Navigation items filtered strictly by role
  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠', roles: ['owner', 'counselor', 'trainer', 'accounts'] },
    { id: 'copilot', label: 'Copilot', icon: '🤖', roles: ['owner', 'counselor', 'trainer', 'accounts'] },
    { id: 'at-risk', label: 'At-risk students', icon: '⚠️', roles: ['owner', 'counselor', 'trainer', 'accounts'] },
    { id: 'approvals', label: 'Approvals', icon: '📋', roles: ['owner', 'counselor', 'accounts'], badge: pendingCount },
    { id: 'timetable', label: 'Timetable', icon: '📅', roles: ['owner', 'counselor', 'trainer', 'accounts'] },
    { id: 'audit', label: 'Audit log', icon: '📜', roles: ['owner'] },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  const roleBadgeClass = `badge badge-role-${role}`;

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-title">
          <span>🏫</span>
          <span>Ops Copilot</span>
        </div>
        <div className="brand-tag">Institute Admin & Operations</div>
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
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--danger)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '2px 7px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                  }}
                >
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
          <div>
            <div className="user-name">{user?.username}</div>
            <span className={roleBadgeClass} style={{ textTransform: 'capitalize', marginTop: '2px' }}>
              {role}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={onLogout}
        >
          <span>🚪</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
