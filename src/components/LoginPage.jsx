import React, { useState } from 'react';
import { loginUser } from '../api';

export const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const demoAccounts = [
    { label: '👑 Owner', user: 'owner', pass: 'Inst@Owner2026', desc: 'Full administration & master schedule' },
    { label: '🤝 Counselor', user: 'counselor', pass: 'Inst@Couns2026', desc: 'Student retention & EMI support' },
    { label: '👨‍🏫 Trainer', user: 'trainer', pass: 'Inst@Train2026', desc: 'Batches, attendance & time off' },
    { label: '💰 Accounts', user: 'accounts', pass: 'Inst@Accts2026', desc: 'Fee collections, waivers & reminders' },
  ];

  const handleFillDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await loginUser(username.trim(), password.trim());
      onLoginSuccess({
        username: data.username,
        role: data.role,
        token: data.token,
      });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-split-container">
        {/* Left Side: Corporate Navy Gradient Branding Panel */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-brand-badge">
              <span>🏫</span>
              <span>Operations Intelligence</span>
            </div>
            <h1 className="login-brand-title">Institute Operations Copilot</h1>
            <p className="login-brand-tagline">
              Spot problems before they become dropouts.
            </p>

            <div className="login-features-list">
              <div className="login-feature-item">
                <div className="login-feature-icon">🔍</div>
                <div>
                  <div className="login-feature-heading">Proactive Risk Detection</div>
                  <div className="login-feature-sub">Identify consecutive absences and EMI payment delays before dropouts happen.</div>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">🛡️</div>
                <div>
                  <div className="login-feature-heading">Enforced Role Permissions</div>
                  <div className="login-feature-sub">Database engine authorizers guarantee strict privacy across roles.</div>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon">⚡</div>
                <div>
                  <div className="login-feature-heading">Human-in-the-Loop Actions</div>
                  <div className="login-feature-sub">Drafted WhatsApp reminders and schedule changes execute only with human sign-off.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card with Demo Account Chips */}
        <div className="login-form-panel">
          <div className="login-card">
            <div className="login-card-header">
              <h2 className="login-card-title">Sign In</h2>
              <p className="login-card-subtitle">
                Access your role-specific dashboard and AI workspace.
              </p>
            </div>

            {errorMessage && (
              <div className="error-box" role="alert" style={{ marginBottom: '16px' }}>
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label" htmlFor="inst-user">Username</label>
                <input
                  id="inst-user"
                  name="inst-user"
                  type="text"
                  className="input-text"
                  placeholder="e.g. owner or counselor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                  data-lpignore="true"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="inst-pass">Password</label>
                <input
                  id="inst-pass"
                  name="inst-pass"
                  type="password"
                  className="input-text"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  data-lpignore="true"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>

            {/* Quick Demo Credentials Selection */}
            <div className="demo-accounts-section">
              <div className="demo-section-label">Demo accounts (click to test role):</div>
              <div className="demo-chips-grid">
                {demoAccounts.map((account) => {
                  const isSelected = username === account.user;
                  return (
                    <button
                      key={account.user}
                      type="button"
                      className={`demo-chip-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => handleFillDemo(account.user, account.pass)}
                    >
                      <div className="demo-chip-top">
                        <span className="demo-chip-label">{account.label}</span>
                        <span className="demo-chip-role">{account.user}</span>
                      </div>
                      <div className="demo-chip-desc">{account.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
