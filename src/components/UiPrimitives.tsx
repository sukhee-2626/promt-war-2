import React, { useEffect, useRef, useState } from 'react';
import type { AppState, BoostInventory } from '../types';

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="11"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M14.5 16.5L21 12v17"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 29.5h14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M29 6.5l1.1 3 3 1.1-3 1.1L29 14.7l-1.1-3-3-1.1 3-1.1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Ring({
  percent,
  size = 120,
  strokeWidth = 12,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const half = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${clamped} percent`}
      className="shrink-0"
    >
      <circle
        cx={half}
        cy={half}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={half}
        cy={half}
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${(c * clamped) / 100} ${c}`}
        transform={`rotate(-90 ${half} ${half})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--ink)"
        fontSize={size / 4}
        fontWeight="700"
        className="font-mono-num"
      >
        {clamped}%
      </text>
    </svg>
  );
}

export function ProgressBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="bar">
      <span className="truncate">{label}</span>
      <i>
        <b style={{ width: `${clamped}%` }} />
      </i>
      <em className="font-mono-num">{clamped}</em>
    </div>
  );
}

export function NeuralBackground({ theme }: { theme: 'dark' | 'light' }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = Array.from({ length: 44 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
    }));

    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const col = theme === 'light' ? '10,12,14' : '255,255,255';
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!rm) {
          a.x = (a.x + a.vx + 1) % 1;
          a.y = (a.y + a.vy + 1) % 1;
        }
        ctx.fillStyle = `rgba(${col}, 0.42)`;
        ctx.beginPath();
        ctx.arc(a.x * w, a.y * h, 1.8, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          if (dist < 145) {
            ctx.strokeStyle = `rgba(${col}, ${0.18 * (1 - dist / 145)})`;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      if (!rm) {
        raf = requestAnimationFrame(tick);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
      <i
        className="orb"
        style={{ left: '38%', top: '8%', width: 320, height: 320 }}
      />
      <i
        className="orb"
        style={{ left: '78%', top: '58%', width: 400, height: 400 }}
      />
      <i
        className="orb"
        style={{ left: '16%', top: '76%', width: 280, height: 280 }}
      />
    </>
  );
}

export function ConfettiBurst({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 90 }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.58,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * 5 + 3,
      c: ['#ffffff', '#cbd5e1', '#94a3b8', '#4fc1c4', '#0f172a'][
        Math.floor(Math.random() * 5)
      ],
      a: 1,
    }));

    let frame = 0;
    let raf = 0;
    const step = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.a -= 0.014;
        ctx.globalAlpha = Math.max(p.a, 0);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.r, p.r * 1.5);
      });
      if (++frame < 90) {
        raf = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99,
      }}
    />
  );
}

export function AgentRunnerOverlay({
  agents,
  activeIndex,
}: {
  agents: string[] | null;
  activeIndex: number;
}) {
  if (!agents || agents.length === 0) return null;
  return (
    <div
      className="pn"
      role="status"
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        width: 'min(300px, calc(100% - 32px))',
        zIndex: 85,
        padding: '14px',
      }}
    >
      <h3 style={{ marginBottom: 8 }}>Agents working</h3>
      {agents.map((name, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div
            key={name}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              padding: '4px 0',
              opacity: done || active ? 1 : 0.45,
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: `2px solid ${done ? 'var(--ok)' : 'var(--line)'}`,
                borderTopColor: active ? 'var(--pri)' : done ? 'var(--ok)' : 'var(--line)',
                background: done ? 'var(--ok)' : 'transparent',
                animation: active ? 'spin 0.7s linear infinite' : undefined,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 14 }}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Array<{ label: string; action: () => void }>;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'rgba(5, 15, 20, 0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div
        className="pn"
        role="dialog"
        aria-label="Command palette"
        style={{ width: 'min(520px, 92%)', padding: 12 }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && filtered[0]) {
              onClose();
              filtered[0].action();
            }
          }}
          placeholder="Type a command or screen…"
          style={{ marginBottom: 8 }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {filtered.length > 0 ? (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.label}
                onClick={() => {
                  onClose();
                  cmd.action();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  borderRadius: 10,
                  background: idx === 0 ? 'var(--soft)' : 'transparent',
                }}
              >
                {cmd.label}
              </button>
            ))
          ) : (
            <p className="mute" style={{ padding: 8 }}>
              No matching command.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RewardsModal({
  open,
  state,
  onClose,
  onUseBoost,
  onBuyBoost,
  onSignOut,
}: {
  open: boolean;
  state: AppState;
  onClose: () => void;
  onUseBoost: (key: keyof BoostInventory) => void;
  onBuyBoost: () => void;
  onSignOut: () => void;
}) {
  if (!open) return null;
  const u = state.user;
  const xpProgress = (u.xp % 200) / 2;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        background: 'color-mix(in srgb, var(--bg) 60%, transparent)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="pn" style={{ width: 'min(410px, 100%)', margin: 0 }}>
        <h2>Rewards · {u.name}</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            margin: '10px 0',
          }}
        >
          <div
            className="font-mono-num"
            style={{
              padding: 12,
              borderRadius: 14,
              background: 'var(--soft)',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            ◆ {u.coin} credits
          </div>
          <div
            className="font-mono-num"
            style={{
              padding: 12,
              borderRadius: 14,
              background: 'var(--soft)',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            ★ {u.star} badges
          </div>
        </div>
        <div className="xp" style={{ marginBottom: 6 }}>
          <b style={{ width: `${xpProgress}%` }} />
        </div>
        <p className="mute font-mono-num">
          Level {u.level} · {200 - (u.xp % 200)} XP to next level
        </p>

        <div style={{ marginTop: 12 }}>
          {(
            [
              ['hint', 'Hint'],
              ['xp', 'XP booster'],
              ['shield', 'Streak shield'],
            ] as Array<[keyof BoostInventory, string]>
          ).map(([key, label]) => (
            <div
              key={key}
              className="row"
              style={{ justifyContent: 'space-between', margin: '6px 0' }}
            >
              <span>
                {label} × <span className="font-mono-num">{u.boost[key]}</span>
              </span>
              <button onClick={() => onUseBoost(key)}>Use</button>
            </div>
          ))}
        </div>

        <button onClick={onBuyBoost} style={{ width: '100%', marginTop: 10 }}>
          Buy XP booster · 60 credits
        </button>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="p" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
          <button onClick={onSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

const TOUR_STEPS = [
  {
    title: 'place1ai · Built-in RAG & Skill Twin',
    body: 'Welcome to place1ai. Every module connects to a live SQLite Skill Digital Twin, Bayesian Knowledge Tracing, and an in-built RAG engine.',
    screen: 'home',
  },
  {
    title: 'Your readiness & progress path',
    body: 'This ring and curved path track your live readiness and stage-by-stage progression toward your target role.',
    screen: 'home',
  },
  {
    title: 'Skill map & BKT assessments',
    body: 'Green skills are mastered, dashed nodes are gaps. Click any node to run a targeted BKT assessment.',
    screen: 'map',
  },
  {
    title: 'Planner ⇄ Critic debate',
    body: 'Multi-agent negotiation verifies prerequisites and weekly study hours. Drag steps or watch remedial replanning in real time.',
    screen: 'roadmap',
  },
  {
    title: 'Resume studio & ATS lab',
    body: 'Your resume scores against real posting keywords as you type while keeping learning skills truthfully verified.',
    screen: 'resume',
  },
  {
    title: 'Built-in RAG Mentor',
    body: 'Ask why any step was chosen. Built-in RAG retrieves chunks directly from your Skill Twin, Resume, ATS, and 2026 Market Research with source citations.',
    screen: 'home',
  },
];

export function GuidedTourOverlay({
  stepIndex,
  onStep,
  onOpenRagMentor,
  onClose,
}: {
  stepIndex: number | null;
  onStep: (nextIndex: number) => void;
  onOpenRagMentor?: () => void;
  onClose: () => void;
}) {
  if (stepIndex === null) return null;
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 15, 20, 0.58)',
        zIndex: 70,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="pn"
        role="dialog"
        aria-label="Guided tour"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '24px',
          transform: 'translateX(-50%)',
          width: 'min(480px, 92%)',
        }}
      >
        <div
          className="row"
          style={{
            marginBottom: 10,
            paddingBottom: 10,
            borderBottom: '1px solid var(--line)',
            gap: 8,
          }}
        >
          <div style={{ width: 22, height: 22, color: 'var(--ink)' }}>
            <BrandLogo />
          </div>
          <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>place1ai</span>
          <span className="mute" style={{ fontSize: 12 }}>
            Built-in RAG · BKT Twin · Tour
          </span>
        </div>

        <h3 style={{ marginBottom: 6 }}>{step.title}</h3>
        <p className="mute">{step.body}</p>
        <div className="row" style={{ marginTop: 14 }}>
          <span className="mute font-mono-num">
            {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose}>Skip tour</button>
          {isLast && onOpenRagMentor && (
            <button
              className="p"
              onClick={() => {
                onClose();
                onOpenRagMentor();
              }}
            >
              Try Built-in RAG
            </button>
          )}
          <button
            className={isLast && onOpenRagMentor ? '' : 'p'}
            onClick={() => {
              if (isLast) onClose();
              else onStep(stepIndex + 1);
            }}
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
