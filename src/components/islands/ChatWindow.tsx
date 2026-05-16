'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'expert' | 'system';
  timestamp: string;
}

interface ChatWindowProps {
  sessionId: string;
  initialCredits: number;
}

export default function ChatWindow({ sessionId, initialCredits }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Session started. You are now connected with the expert.", sender: 'system', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    { id: '2', text: "Hi there! How can I help you today?", sender: 'expert', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [inputText, setInputText] = useState('');
  const [credits, setCredits] = useState(initialCredits);
  const [isWarning, setIsWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Demo credit burn simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCredits(prev => {
        const next = prev - 1;
        if (next <= 10 && next > 0) setIsWarning(true);
        if (next <= 0) {
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, 10000); // Burn 1 credit every 10 seconds for demo purposes
    
    return () => clearInterval(timer);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || credits <= 0) return;

    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      text: inputText, 
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    
    setInputText('');

    // Mock expert reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: "That's an interesting point. Let me analyze that for you.",
        sender: "expert",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 2000);
  };

  return (
    <div className="chat-island-container glass-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="header-info">
          <div className="status-indicator">
            <span className="dot pulse"></span>
            <span className="status-text">Live Session #{sessionId}</span>
          </div>
        </div>
        
        <div className={`credit-display ${isWarning ? 'warning' : ''} ${credits === 0 ? 'danger' : ''}`}>
          <span className="credit-icon">💎</span>
          <span className="credit-value">{credits}</span>
          <span className="credit-label">Credits left</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
            {msg.sender === 'system' ? (
              <div className="system-message">{msg.text}</div>
            ) : (
              <div className={`message-bubble ${msg.sender}`}>
                <div className="message-text">{msg.text}</div>
                <div className="message-time">{msg.timestamp}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-container">
        {credits > 0 ? (
          <form onSubmit={handleSend} className="input-form">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..." 
              className="chat-input"
              autoComplete="off"
            />
            <button type="submit" className="send-btn hover-lift" disabled={!inputText.trim()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        ) : (
          <div className="out-of-credits">
            <p>Session ended. You have run out of credits.</p>
            <button className="btn-primary" onClick={() => window.location.href = '/pricing'}>
              Top Up Credits
            </button>
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
