import React, { useState, useEffect, useRef } from 'react';
import { askCopilot, approvePendingAction, rejectPendingAction, runSecurityTest } from '../api';

export const CopilotPage = ({ user, initialPrompt, onActionDecided }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSqlId, setCopiedSqlId] = useState(null);
  const [expandedSqlIds, setExpandedSqlIds] = useState({});
  const [pendingStatuses, setPendingStatuses] = useState({}); // { [actionId]: 'sent' | 'rejected' }
  const [securityTestResult, setSecurityTestResult] = useState(null);
  const [isRunningSecurityTest, setIsRunningSecurityTest] = useState(false);

  const messagesEndRef = useRef(null);
  const role = user?.role || 'owner';

  // Role-based initial suggestion chips
  const suggestionChips = role === 'trainer'
    ? [
        "Which students missed 3 or more classes?",
        "Show EMI amounts for my students",
        "List student phone numbers",
      ]
    : [
        "Which students in the Java batch missed 3 or more classes and have an EMI due this week? Draft a WhatsApp reminder for each.",
        "Show unpaid EMIs due this week",
        "Which students missed 3 or more classes?",
      ];

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Handle initial prompt passed from Home (Morning Brief) or At-Risk
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
    }
  }, [initialPrompt]);

  const handleSendMessage = async (questionText) => {
    const q = (questionText || inputText).trim();
    if (!q || isProcessing) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const data = await askCopilot(q);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'copilot',
        data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `bot-${Date.now()}`,
        sender: 'copilot',
        data: {
          error: err.message || 'An error occurred while running the query.',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopySql = (sqlText, msgId) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedSqlId(msgId);
    setTimeout(() => setCopiedSqlId(null), 2000);
  };

  const toggleSqlExpand = (msgId) => {
    setExpandedSqlIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleApprove = async (actionId) => {
    try {
      await approvePendingAction(actionId);
      setPendingStatuses((prev) => ({ ...prev, [actionId]: 'sent' }));
      if (onActionDecided) onActionDecided();
    } catch (err) {
      alert(err.message || 'Failed to approve action');
    }
  };

  const handleReject = async (actionId) => {
    try {
      await rejectPendingAction(actionId);
      setPendingStatuses((prev) => ({ ...prev, [actionId]: 'rejected' }));
      if (onActionDecided) onActionDecided();
    } catch (err) {
      alert(err.message || 'Failed to reject action');
    }
  };

  const handleApproveAll = async (pendingList) => {
    for (const item of pendingList) {
      if (!pendingStatuses[item.id]) {
        try {
          await approvePendingAction(item.id);
          setPendingStatuses((prev) => ({ ...prev, [item.id]: 'sent' }));
        } catch (e) {
          console.warn('Error approving', item.id, e);
        }
      }
    }
    if (onActionDecided) onActionDecided();
  };

  const handleRunSecurityTest = async () => {
    setIsRunningSecurityTest(true);
    try {
      const data = await runSecurityTest();
      setSecurityTestResult(data);
    } catch (err) {
      alert(err.message || 'Security test failed');
    } finally {
      setIsRunningSecurityTest(false);
    }
  };

  // Helper to format table headers: replace underscores, capitalize each word
  const formatHeader = (colName) => {
    return colName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', paddingBottom: '16px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h1 className="page-title">AI Operations Copilot</h1>
        <p className="page-subtitle">Translate staff instructions into safe, verified read-only queries.</p>
      </div>

      {/* Main Conversation Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Empty State / Initial Suggestions */}
        {messages.length === 0 && (
          <div className="card" style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🤖</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
              How can I assist your operations today?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Choose a sample question below or type your own prompt in plain English.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {suggestionChips.map((chipText, i) => (
                <button
                  key={i}
                  type="button"
                  className="chip"
                  onClick={() => handleSendMessage(chipText)}
                >
                  <span>{chipText}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '75%',
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '12px 18px',
                  fontSize: '0.9rem',
                  lineHeight: '1.45',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>{msg.text}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: '4px' }}>
                  {msg.timestamp}
                </div>
              </div>
            );
          }

          // Copilot Response Card
          const { data } = msg;
          const isError = Boolean(data?.error);
          const isBlocked = isError && String(data?.error).toLowerCase().includes('blocked');

          return (
            <div
              key={msg.id}
              style={{
                alignSelf: 'flex-start',
                width: '100%',
                maxWidth: '920px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* ERROR STATE */}
              {isError ? (
                <div style={{
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  color: 'var(--danger-text)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.92rem' }}>
                    <span>🔒</span>
                    <span>Access Restricted</span>
                  </div>
                  <p style={{ fontSize: '0.86rem', marginTop: '6px', lineHeight: '1.45' }}>
                    {data.error}
                  </p>
                  {isBlocked && (
                    <p style={{ fontSize: '0.8rem', marginTop: '8px', color: '#B91C1C', fontStyle: 'italic' }}>
                      Your role doesn't have access to this data. This is enforced by the system, not just the AI.
                    </p>
                  )}
                  {data.sql && (
                    <div style={{ marginTop: '12px', background: '#1E293B', color: '#94A3B8', padding: '10px 12px', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      <code>{data.sql}</code>
                    </div>
                  )}
                </div>
              ) : (
                /* SUCCESS STATE - Rendered in exact requested order */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* (1) The "summary" sentence in bold */}
                  {data.summary && (
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1.45' }}>
                      {data.summary}
                    </div>
                  )}

                  {/* (2) Results table with readable headers & row count */}
                  {data.columns && data.columns.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Results ({data.rows?.length || 0} {data.rows?.length === 1 ? 'row' : 'rows'})
                        </span>
                      </div>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              {data.columns.map((col, idx) => (
                                <th key={idx}>{formatHeader(col)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows?.length === 0 ? (
                              <tr>
                                <td colSpan={data.columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                  No records matched the criteria.
                                </td>
                              </tr>
                            ) : (
                              data.rows?.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx}>{String(cell)}</td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* (3) Collapsed "How I got this" section with SQL in dark code block and Copy button */}
                  {data.sql && (
                    <div style={{
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                    }}>
                      <div
                        onClick={() => toggleSqlExpand(msg.id)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                          {expandedSqlIds[msg.id] ? '▼ Hide SQL Query' : '▶ How I got this (View SQL Query)'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Read-Only SQLite Engine
                        </span>
                      </div>

                      {expandedSqlIds[msg.id] && (
                        <div style={{
                          background: '#1E293B',
                          color: '#E2E8F0',
                          padding: '14px',
                          borderTop: '1px solid var(--border-color)',
                          position: 'relative',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#334155', color: '#F8FAFC', border: 'none' }}
                              onClick={() => handleCopySql(data.sql, msg.id)}
                            >
                              {copiedSqlId === msg.id ? '✓ Copied' : '📋 Copy SQL'}
                            </button>
                          </div>
                          <pre style={{ margin: 0, overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: '1.5' }}>
                            <code>{data.sql}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* (4) "Review before sending" section with preview cards */}
                  {data.pending && data.pending.length > 0 && (
                    <div style={{
                      backgroundColor: '#FFFBEB',
                      border: '1px solid var(--warning-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--warning-text)' }}>
                            Review before sending
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#78350F' }}>
                            Nothing is sent until you approve.
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveAll(data.pending)}
                        >
                          ✓ Approve all ({data.pending.length})
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        {data.pending.map((p) => {
                          const currentStatus = pendingStatuses[p.id] || p.status || 'pending';
                          const isDecided = currentStatus === 'sent' || currentStatus === 'rejected';

                          return (
                            <div
                              key={p.id}
                              style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                    {p.student_name}
                                  </strong>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    {p.phone}
                                  </span>
                                </div>

                                {isDecided ? (
                                  <span className={`badge ${currentStatus === 'sent' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                                    {currentStatus === 'sent' ? '✓ Sent' : '✕ Rejected'}
                                  </span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-danger-outline btn-sm"
                                      onClick={() => handleReject(p.id)}
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-success btn-sm"
                                      onClick={() => handleApprove(p.id)}
                                    >
                                      Approve
                                    </button>
                                  </div>
                                )}
                              </div>

                              <p style={{ fontSize: '0.82rem', color: '#374151', background: '#F9FAFB', padding: '8px 10px', borderRadius: '6px', margin: 0, fontStyle: 'italic' }}>
                                "{p.message}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* (5) "follow_ups" as clickable chips */}
                  {data.follow_ups && data.follow_ups.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Suggested follow-ups
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {data.follow_ups.map((fu, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="chip"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => handleSendMessage(fu)}
                          >
                            <span>{fu}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-card)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            alignSelf: 'flex-start',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', margin: 0 }}></div>
            <span>Generating safe query & inspecting institute records...</span>
          </div>
        )}

        {/* Trainers only: "Try to break it" Security Test Card */}
        {role === 'trainer' && (
          <div className="card" style={{ marginTop: '16px', border: '1px dashed var(--warning-border)', backgroundColor: '#FEFDFB' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  🛡️ Try to break it (Security Authorizer Test)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Test the database engine against 5 forbidden attack queries (EMIs, student phones, users, sqlite_master, DROP table).
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRunSecurityTest}
                disabled={isRunningSecurityTest}
              >
                {isRunningSecurityTest ? 'Testing...' : 'Run security test'}
              </button>
            </div>

            {securityTestResult && (
              <div style={{ marginTop: '14px' }}>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Attack Attempt</th>
                        <th>Target Query</th>
                        <th>Security Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityTestResult.map((test, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '500' }}>{test.prompt}</td>
                          <td><code>{test.sql}</code></td>
                          <td>
                            <span className={`badge ${test.blocked ? 'badge-success' : 'badge-danger'}`}>
                              {test.blocked ? '✓ Blocked' : '✕ Allowed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{
                  marginTop: '10px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: 'var(--success-text)',
                  backgroundColor: 'var(--success-light)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  display: 'inline-block',
                }}>
                  ✓ {securityTestResult.filter((t) => t.blocked).length} of {securityTestResult.length} attacks blocked by SQLite Authorizer
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Bar */}
      <div style={{
        marginTop: '12px',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
      }}>
        <input
          type="text"
          className="input-text"
          placeholder="Ask a question in plain English (e.g. Which students missed 3 or more classes?)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isProcessing}
          style={{ border: 'none', padding: '6px 4px', fontSize: '0.92rem' }}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isProcessing}
        >
          Send
        </button>
      </div>
    </div>
  );
};
