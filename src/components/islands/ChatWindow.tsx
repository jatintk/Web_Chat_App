'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionState } from '@/lib/sessionRules';
import { getPusherClient } from '@/lib/pusherClient';

interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string | null;
  senderRole: 'user' | 'expert';
  body: string;
  createdAt: string;
}

interface ChatWindowProps {
  sessionId: string;
  initialState: SessionState;
  initialMessages: ChatMessage[];
  viewerId: string;
  isViewerExpert: boolean;
}

const TICK_INTERVAL_MS = 5000;

export default function ChatWindow({ sessionId, initialState, initialMessages, viewerId, isViewerExpert }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>(initialState);
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Restores focus to the message input once it's re-enabled after a send --
  // toggling `disabled` doesn't auto-restore focus in the browser.
  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  // Real-time messaging: subscribe to this session's private Pusher channel.
  // The server broadcasts every message (including the sender's own) after
  // persisting it, so we dedupe by id rather than appending optimistically.
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-session-${sessionId}`);

    channel.bind('new-message', (message: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return () => {
      channel.unbind('new-message');
      pusher.unsubscribe(`private-session-${sessionId}`);
    };
  }, [sessionId]);

  // Server-authoritative billing: poll the tick endpoint so overage/grace/hard-stop
  // are driven by wall-clock time on the server, not a client-side interval.
  useEffect(() => {
    if (state.status === 'ended') return;

    const timer = setInterval(async () => {
      const res = await fetch(`/api/sessions/${sessionId}/tick`, { method: 'POST' });
      if (res.ok) {
        setState(await res.json());
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [sessionId, state.status]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || state.status === 'ended' || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSendError(data?.error || 'Could not send message.');
        return;
      }
      setInputText('');
    } finally {
      setSending(false);
    }
  }

  // Just navigate away -- no server call, session/booking state is untouched
  // so either party can Join again from the dashboard to resume exactly where
  // they left off. This is what makes accidental disconnects recoverable.
  function handleLeaveSoft() {
    router.push('/app/dashboard');
  }

  // Permanently ends the session for both parties -- unlike Leave, this is a
  // deliberate, confirmed action (marks the booking 'completed').
  async function handleEndSession() {
    const confirmed = window.confirm('End this session? This closes it permanently for both you and the other party.');
    if (!confirmed) return;

    setEnding(true);
    try {
      await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
      router.push('/app/dashboard');
    } finally {
      setEnding(false);
    }
  }

  const isWarning = state.isLowBalance || state.status === 'grace';
  const isDanger = state.status !== 'active';

  return (
    <div className="chat-island-container glass-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="header-info">
          <div className="status-indicator">
            <span className="dot pulse"></span>
            <span className="status-text">
              {state.status === 'grace'
                ? isViewerExpert
                  ? 'Grace period'
                  : `Grace period — top up now (${state.graceSecondsRemaining}s left)`
                : state.status === 'ended'
                ? 'Session ended'
                : `Live Session #${sessionId}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href={`/api/sessions/${sessionId}/export`} className="btn-ghost">
            Export Chat
          </a>
          <div className={`credit-display ${isWarning ? 'warning' : ''} ${isDanger ? 'danger' : ''}`}>
            <span className="credit-icon">💎</span>
            <span className="credit-value">{state.balance}</span>
            <span className="credit-label">Credits left</span>
          </div>
          {state.status !== 'ended' && (
            <>
              <button className="btn-ghost" onClick={handleLeaveSoft}>
                Leave
              </button>
              <button className="btn-ghost" onClick={handleEndSession} disabled={ending}>
                {ending ? 'Ending…' : 'End Session'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.length === 0 && <div className="system-message">Say hello to get started.</div>}
        {messages.map((msg) => {
          const isOwn = msg.senderId === viewerId;
          const bubbleClass = isOwn ? 'user' : 'expert';
          return (
            <div key={msg.id} className={`message-wrapper ${bubbleClass}`}>
              <div className={`message-bubble ${bubbleClass}`}>
                <div className="message-text">{msg.body}</div>
                <div className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-container">
        {state.status !== 'ended' ? (
          <form onSubmit={handleSend} className="input-form">
            {sendError && <p style={{ color: '#ef4444', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>{sendError}</p>}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
              autoComplete="off"
              disabled={sending}
            />
            <button type="submit" className="send-btn hover-lift" disabled={!inputText.trim() || sending}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        ) : (
          <div className="out-of-credits">
            <p>
              {isViewerExpert
                ? 'This session has ended.'
                : `Session ended. ${state.balance <= 0 ? 'You ran out of credits.' : ''}`}
            </p>
            {!isViewerExpert && (
              <button className="btn-primary" onClick={() => (window.location.href = '/pricing')}>
                Top Up Credits
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .chat-island-container {
          display: flex;
          flex-direction: column;
          height: 70vh;
          min-height: 500px;
          max-height: 800px;
          width: 100%;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--surface-border);
          background: var(--surface-secondary);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dot {
          width: 10px;
          height: 10px;
          background-color: var(--primary-accent);
          border-radius: 50%;
          display: inline-block;
        }

        .dot.pulse {
          box-shadow: 0 0 0 0 var(--primary-accent-glow);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 var(--primary-accent-glow); }
          70% { box-shadow: 0 0 0 10px rgba(255, 136, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 136, 0, 0); }
        }

        .status-text {
          font-weight: 500;
          color: var(--text-primary);
        }

        .credit-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #FFFFFF;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-pill);
          border: 1px solid var(--primary-accent);
          color: var(--primary-accent);
          transition: all 0.3s ease;
        }

        .credit-display.warning {
          border-color: #f59e0b;
          color: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);
        }

        .credit-display.danger {
          border-color: #ef4444;
          color: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }

        .credit-value {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .credit-label {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: #FFFBF5;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: var(--surface-border);
          border-radius: 3px;
        }

        .message-wrapper {
          display: flex;
          width: 100%;
        }

        .message-wrapper.user {
          justify-content: flex-end;
        }

        .message-wrapper.expert {
          justify-content: flex-start;
        }

        .message-wrapper.system {
          justify-content: center;
          margin: 0.5rem 0;
        }

        .system-message {
          background: var(--surface-color);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          align-self: center;
        }

        .message-bubble {
          max-width: 75%;
          padding: 1rem;
          border-radius: 16px;
          position: relative;
        }

        .message-bubble.user {
          background: linear-gradient(135deg, var(--primary-accent), var(--primary-accent-hover));
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message-bubble.expert {
          background: #FFFFFF;
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
          border-bottom-left-radius: 4px;
        }

        .message-text {
          line-height: 1.5;
          word-break: break-word;
        }

        .message-time {
          font-size: 0.75rem;
          opacity: 0.7;
          margin-top: 0.5rem;
          text-align: right;
        }

        .input-container {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--surface-border);
          background: var(--surface-secondary);
        }

        .input-form {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .chat-input {
          flex: 1;
          background: #FFFFFF;
          border: 1px solid var(--surface-border);
          padding: 1rem 1.5rem;
          border-radius: var(--radius-pill);
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .chat-input::placeholder {
          color: var(--text-muted);
        }

        .chat-input:focus {
          outline: none;
          border-color: var(--primary-accent);
          box-shadow: 0 0 15px var(--primary-accent-glow);
        }

        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: var(--primary-accent);
          color: white;
          border: none;
          cursor: pointer;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .out-of-credits {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 1rem 1.5rem;
          border-radius: 16px;
        }

        .out-of-credits p {
          color: #ef4444;
          margin: 0;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
