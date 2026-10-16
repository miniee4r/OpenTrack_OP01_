import React, { useState } from 'react';
import { loginUser } from '../api';

export const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const demoAccounts = [
    { label: '👑 Owner', user: 'owner', pass: 'owner123' },
    { label: '🤝 Counselor', user: 'counselor', pass: 'c123' },
    { label: '👨‍🏫 Trainer', user: 'trainer', pass: 't123' },
    { label: '💰 Accounts', user: 'accounts', pass: 'a123' },
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-page)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)',
        padding: '36px 32px',
      }}>
        {/* App Title & Description */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '2.2rem',
            marginBottom: '8px',
          }}>
            🏫
          </div>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: 'var(--text-main)',
            letterSpacing: '-0.02em',
          }}>
            Institute Operations Copilot
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: '6px',
            lineHeight: '1.4',
          }}>
            Role-based administration with read-only AI verified operations.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="error-box">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="input-text"
              placeholder="e.g. counselor"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-text"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 16px', fontSize: '0.92rem', marginTop: '6px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Accounts Box */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-light)',
        }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: '600',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '10px',
            textAlign: 'center',
          }}>
            Quick Demo Accounts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {demoAccounts.map((account) => (
              <button
                key={account.user}
                type="button"
                className="chip"
                onClick={() => handleFillDemo(account.user, account.pass)}
                style={{
                  justifyContent: 'center',
                  padding: '7px 8px',
                  fontSize: '0.78rem',
                }}
              >
                <span>{account.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
