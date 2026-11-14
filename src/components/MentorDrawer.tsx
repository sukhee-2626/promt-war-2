import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatMessage } from '../types';
import { BrandLogo } from './UiPrimitives';

const QUICK_PROMPTS = [
  'Why is JavaScript first?',
  'What is my ATS score & missing keywords?',
  'Show TypeScript market demand',
  'How many weeks is my roadmap?',
];

export function MentorDrawer({
  open,
  messages,
  ragEnabled,
  sending,
  onClose,
  onToggleRag,
  onSend,
}: {
  open: boolean;
  messages: ChatMessage[];
  ragEnabled: boolean;
  sending: boolean;
  onClose: () => void;
  onToggleRag: () => void;
  onSend: (question: string) => void;
}) {
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const submit = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || sending) return;
    if (!text) setInput('');
    onSend(q);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: '100%', opacity: 0.4, scale: 0.96 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: '100%', opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="drawer open"
          aria-label="AI mentor"
          style={{ transform: 'none' }}
        >
          <div className="row" style={{ marginBottom: 6 }}>
            <div style={{ width: 24, height: 24, color: 'var(--ink)' }}>
              <BrandLogo />
            </div>
            <h2 style={{ margin: 0, flex: 1 }}>place1ai Mentor</h2>
            <button onClick={onClose} aria-label="Close mentor">
              Close
            </button>
          </div>

          <div className="mute" style={{ marginBottom: 8 }}>
            Built-in RAG + Gemini AI grounded in your SQLite Skill Twin.
          </div>

          <div className={ragEnabled ? 'rag-scan' : undefined}>
            <div className="row" style={{ gap: 8 }}>
              <button
                className={!ragEnabled ? 'p' : ''}
                onClick={onToggleRag}
                style={{ fontSize: 13, minHeight: 34, padding: '5px 12px' }}
              >
                {ragEnabled ? 'Built-in RAG: ON' : 'Enable Built-in RAG'}
              </button>
              <span className="mute" style={{ fontSize: 12 }}>
                {ragEnabled ? 'Retrieving & citing SQLite context' : 'Quick mentor mode'}
              </span>
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              margin: '8px 0',
              paddingRight: 2,
            }}
          >
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 14, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                className={`m ${m.sender === 'user' ? 'u' : ''}`}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                {m.sender === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {m.sources.map((src) => (
                      <span
                        key={src}
                        className={`chip ${m.ragEnabled ? 'o' : ''}`}
                        style={{ fontSize: 11 }}
                      >
                        Source: {src}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {sending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                className="m"
              >
                <div className="chat-dots" aria-label="Thinking">
                  <i />
                  <i />
                  <i />
                </div>
              </motion.div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                disabled={sending}
                onClick={() => submit(qp)}
                style={{
                  fontSize: 12,
                  minHeight: 30,
                  padding: '4px 10px',
                  flex: 'none',
                }}
              >
                {qp}
              </button>
            ))}
          </div>

          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="Ask why, plan, resume, TypeScript…"
            />
            <button className="p" disabled={sending} onClick={() => submit()}>
              Send
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
