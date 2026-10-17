import React, { useState, useEffect, useRef } from 'react';
import { fetchCopilotSuggestions, askCopilot, approvePendingAction, rejectPendingAction, runSecurityTest } from '../api';

export const CopilotPage = ({ user, initialPrompt, onPromptConsumed, onActionDecided }) => {
  const [suggestionsConfig, setSuggestionsConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSqlId, setCopiedSqlId] = useState(null);
  const [expandedSqlIds, setExpandedSqlIds] = useState({});
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [securityTestResult, setSecurityTestResult] = useState(null);
  const [isRunningSecurityTest, setIsRunningSecurityTest] = useState(false);

  // Guards against double submit and React StrictMode double invocation (B7)
  const isProcessingRef = useRef(false);
  const pendingQuestionRef = useRef('');
  const lastInitialPromptRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasLoadedWelcomeRef = useRef(false);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Load role-specific copilot suggestions on open (B2)
  useEffect(() => {
    let isMounted = true;
    hasLoadedWelcomeRef.current = false;
    setMessages([]);

    async function loadSuggestions() {
      try {
        const config = await fetchCopilotSuggestions();
        if (isMounted && config) {
          setSuggestionsConfig(config);
          // Show "welcome" as the first copilot message
          if (!hasLoadedWelcomeRef.current && config.welcome) {
            hasLoadedWelcomeRef.current = true;
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                sender: 'copilot',
                isWelcome: true,
                text: config.welcome,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }
        }
      } catch (e) {
        console.error('Failed to load copilot suggestions:', e);
      }
    }

    loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [user?.username, user?.role]);

  // Handle initial prompt passed from Home (Morning Brief) or At-Risk
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const trimmed = initialPrompt.trim();
      if (lastInitialPromptRef.current === trimmed) {
        return; // Guard against React StrictMode double effect execution
      }
      lastInitialPromptRef.current = trimmed;
      handleSendMessage(trimmed);
      if (onPromptConsumed) {
        onPromptConsumed();
      }
    } else {
      lastInitialPromptRef.current = null;
    }
  }, [initialPrompt]);

  const handleSendMessage = async (questionText) => {
    const q = (typeof questionText === 'string' ? questionText : inputText).trim();
    if (!q) return;

    // Guard against double submits (B7)
    if (isProcessingRef.current || pendingQuestionRef.current === q) {
      return;
    }

    isProcessingRef.current = true;
    pendingQuestionRef.current = q;
    setIsProcessing(true);
    setInputText('');

    // Exactly ONE user bubble per question (B7)
    const userMsg = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const data = await askCopilot(q);
      // Exactly ONE answer card per question (B7)
      const botMsg = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sender: 'copilot',
        data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sender: 'copilot',
        data: {
          error: err.message || 'An error occurred while running the query.',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      isProcessingRef.current = false;
      pendingQuestionRef.current = '';
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

  const formatHeader = (colName) => {
    return colName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', paddingBottom: '16px' }}>
      {/* Header Row */}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 className="page-title">Operations Copilot</h1>
            {/* "helper" strictly under the page title from GET /copilot/suggestions (B2) */}
            <p className="page-subtitle">
              {suggestionsConfig?.helper || 'Natural language queries with SQLite authorizer protection.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRunSecurityTest}
            disabled={isRunningSecurityTest}
          >
            <span>🛡️</span>
            <span>{isRunningSecurityTest ? 'Auditing Security...' : 'Run Security Check'}</span>
          </button>
        </div>
      </div>

      {/* Security Test Results Drawer / Modal */}
      {securityTestResult && (
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--info)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span>
              <span>Permission & Security Verification Results</span>
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSecurityTestResult(null)}
            >
              ✕ Close
            </button>
          </div>
          <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Test Scenario</th>
                  <th>SQL / Request</th>
                  <th>Status</th>
                  <th>Enforcement Detail</th>
                </tr>
              </thead>
              <tbody>
                {securityTestResult.map((test, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '500' }}>{test.prompt}</td>
                    <td><code>{test.sql_or_request || test.sql}</code></td>
                    <td>
                      {test.blocked ? (
                        <span className="badge badge-high">🛡️ BLOCKED (SAFE)</span>
                      ) : (
                        <span className="badge badge-low">PERMITTED</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{test.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chat Messages History Container */}
      <div className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="chat-bubble user-bubble">
                <div className="bubble-text">{msg.text}</div>
                <div className="bubble-time">{msg.timestamp}</div>
              </div>
            );
          }

          // Welcome Message
          if (msg.isWelcome) {
            return (
              <div key={msg.id} className="chat-bubble bot-bubble" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Ops Copilot</span>
                </div>
                <div className="bubble-text">{msg.text}</div>
                <div className="bubble-time">{msg.timestamp}</div>
              </div>
            );
          }

          // Bot Answer Card
          const data = msg.data || {};
          const hasError = !!data.error;
          const hasResults = Array.isArray(data.rows) && data.rows.length > 0;
          const hasPending = Array.isArray(data.pending) && data.pending.length > 0;
          const isSqlExpanded = !!expandedSqlIds[msg.id];
          const isCopied = copiedSqlId === msg.id;

          return (
            <div key={msg.id} className="chat-bubble bot-bubble">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                  <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Ops Copilot</span>
                </div>
                <span className="bubble-time">{msg.timestamp}</span>
              </div>

              {/* Exact Backend Error Display (A3 & B2) */}
              {hasError ? (
                <div className="error-box" role="alert" style={{ marginBottom: '10px' }}>
                  <span>⚠️</span>
                  <span>{data.error}</span>
                </div>
              ) : (
                /* Gemini Summary */
                data.summary && (
                  <div className="bot-summary-text" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '12px', fontWeight: '500' }}>
                    {data.summary}
                  </div>
                )
              )}

              {/* Collapsed "How I got this" SQL Drawer (B7) */}
              {data.sql && (
                <div className="sql-inspection-drawer" style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                    }}
                    onClick={() => toggleSqlExpand(msg.id)}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                      {isSqlExpanded ? '▼ Hide SQL Query' : '▶ How I got this (SQL)'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopySql(data.sql, msg.id);
                      }}
                    >
                      {isCopied ? '✓ Copied' : '📋 Copy SQL'}
                    </button>
                  </div>
                  {isSqlExpanded && (
                    <div style={{ marginTop: '6px', padding: '10px', backgroundColor: '#1E293B', borderRadius: 'var(--radius-sm)', color: '#F8FAFC', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto' }}>
                      <pre style={{ margin: 0 }}>{data.sql}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Query Results Table (Exactly ONE table) (B7) */}
              {hasResults && (
                <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {data.columns.map((col, cIdx) => (
                          <th key={cIdx}>{formatHeader(col)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx}>
                              {typeof cell === 'boolean'
                                ? cell ? 'Yes' : 'No'
                                : (cell !== null && cell !== undefined ? String(cell) : '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Drafted Actions (Approval Items) */}
              {hasPending && (
                <div className="drafted-actions-box" style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--info-border)' }}>
                  <div style={{ fontWeight: '600', color: 'var(--primary-text)', marginBottom: '8px', fontSize: '13px' }}>
                    📝 Drafted Communication ({data.pending.length} message{data.pending.length > 1 ? 's' : ''} awaiting approval):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.pending.map((item) => {
                      const status = pendingStatuses[item.id] || 'pending';
                      return (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{item.student_name} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({item.phone})</span></div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>"{item.message}"</div>
                          </div>
                          <div>
                            {status === 'sent' && (
                              <span className="badge badge-low">✓ Sent (Mock)</span>
                            )}
                            {status === 'rejected' && (
                              <span className="badge badge-high">✕ Rejected</span>
                            )}
                            {status === 'pending' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleApprove(item.id)}
                                >
                                  Approve & Send
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleReject(item.id)}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Role-Appropriate Follow-up Suggestions Chips */}
              {Array.isArray(data.follow_ups) && data.follow_ups.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Suggested Follow-ups:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {data.follow_ups.map((chipText, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        className="chip"
                        onClick={() => handleSendMessage(chipText)}
                        disabled={isProcessing}
                      >
                        {chipText}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="chat-bubble bot-bubble skeleton" style={{ width: '60%', height: '50px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thinking & executing SQL...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips strictly from GET /copilot/suggestions (B2) */}
      {suggestionsConfig?.suggestions && (
        <div style={{ padding: '8px 0', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
            Try asking:
          </span>
          {suggestionsConfig.suggestions.map((suggestionText, sIdx) => (
            <button
              key={sIdx}
              type="button"
              className="chip"
              onClick={() => handleSendMessage(suggestionText)}
              disabled={isProcessing}
            >
              {suggestionText}
            </button>
          ))}
        </div>
      )}

      {/* Input Form with Dynamic Placeholder (B2 & B7) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
      >
        <input
          type="text"
          className="input-text"
          style={{ flex: 1 }}
          placeholder={suggestionsConfig?.placeholder || 'Ask a question in plain English...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isProcessing}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isProcessing || !inputText.trim()}
          style={{ minWidth: '90px' }}
        >
          {isProcessing ? 'Sending...' : 'Send →'}
        </button>
      </form>
    </div>
  );
};
