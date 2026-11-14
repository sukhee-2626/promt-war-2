import React, { useEffect, useRef, useState } from 'react';
import liquidGlassMesh from '../assets/images/liquid_glass_mesh_1794642151382.jpg';
import type { AppState, BoostInventory, SkillKey } from '../types';

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

export function SkillRadarChart({
  skills,
  targetSkills,
  size = 240,
}: {
  skills: Record<SkillKey, number>;
  targetSkills?: Record<SkillKey, number>;
  size?: number;
}) {
  const axes: Array<{ key: SkillKey; label: string }> = [
    { key: 'js', label: 'JS/TS' },
    { key: 'react', label: 'React' },
    { key: 'html', label: 'UI/CSS' },
    { key: 'node', label: 'Node' },
    { key: 'sql', label: 'SQL' },
    { key: 'python', label: 'Python' },
  ];
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.34;
  const n = axes.length;

  const pointAt = (idx: number, ratio: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    return [
      cx + Math.cos(angle) * rMax * ratio,
      cy + Math.sin(angle) * rMax * ratio,
    ] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = axes
    .map((a, i) => {
      const val = Math.max(0.12, Math.min(1, skills[a.key] || 0));
      const [x, y] = pointAt(i, val);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const targetPoints = targetSkills
    ? axes
        .map((a, i) => {
          const raw = (targetSkills[a.key] || 75) / 100;
          const val = Math.max(0.15, Math.min(1, raw));
          const [x, y] = pointAt(i, val);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ')
    : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Skill Twin radar graphic"
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
    >
      {rings.map((r) => {
        const pts = axes
          .map((_, i) => pointAt(i, r).map((v) => v.toFixed(1)).join(','))
          .join(' ');
        return (
          <polygon
            key={r}
            points={pts}
            fill="none"
            stroke="var(--line)"
            strokeWidth={1}
          />
        );
      })}
      {axes.map((a, i) => {
        const [x2, y2] = pointAt(i, 1);
        const [lx, ly] = pointAt(i, 1.24);
        return (
          <g key={a.key}>
            <line
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--mute)"
              fontSize="11"
              fontWeight="600"
            >
              {a.label}
            </text>
          </g>
        );
      })}
      {targetPoints && (
        <polygon
          points={targetPoints}
          fill="none"
          stroke="var(--pri)"
          strokeOpacity={0.65}
          strokeWidth={1.75}
          strokeDasharray="4 4"
        />
      )}
      <polygon
        points={dataPoints}
        fill="color-mix(in srgb, var(--gold) 28%, transparent)"
        stroke="var(--gold)"
        strokeWidth={2}
      />
      {axes.map((a, i) => {
        const val = Math.max(0.12, Math.min(1, skills[a.key] || 0));
        const [x, y] = pointAt(i, val);
        return (
          <circle
            key={a.key}
            cx={x}
            cy={y}
            r={3.5}
            fill="var(--pri)"
            stroke="var(--bg)"
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
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
    const nodes = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00032,
      vy: (Math.random() - 0.5) * 0.00032,
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
      const col = theme === 'light' ? '11,79,108' : '125,211,252';
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!rm) {
          a.x = (a.x + a.vx + 1) % 1;
          a.y = (a.y + a.vy + 1) % 1;
        }
        ctx.fillStyle = `rgba(${col}, 0.35)`;
        ctx.beginPath();
        ctx.arc(a.x * w, a.y * h, 1.8, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
          if (dist < 140) {
            ctx.strokeStyle = `rgba(${col}, ${0.15 * (1 - dist / 140)})`;
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
    <div className="liquid-backdrop" aria-hidden="true">
      <img
        src={liquidGlassMesh}
        alt=""
        referrerPolicy="no-referrer"
        className="liquid-backdrop-img"
      />
      <div className={`liquid-backdrop-scrim ${theme === 'light' ? 'is-light' : 'is-dark'}`} />
      <i className="liquid-blob blob-a" />
      <i className="liquid-blob blob-b" />
      <i className="liquid-blob blob-c" />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      />
    </div>
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
      c: ['#ffffff', '#38bdf8', '#2dd4bf', '#94a3b8', '#0b4f6c'][
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
        background: 'rgba(5, 15, 25, 0.56)',
        backdropFilter: 'blur(12px)',
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
        background: 'color-mix(in srgb, var(--bg) 52%, transparent)',
        backdropFilter: 'blur(24px)',
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
    title: '01 · Your Personalized Career Roadmap',
    body: 'Right after onboarding, your custom step-by-step plan appears here. Complete stages to earn XP, reorder steps anytime, or change your goal with voice.',
    screen: 'roadmap',
  },
  {
    title: '02 · Command Centre (Everything Above the Fold)',
    body: 'Jump straight into your top AI tools, view your skill balance graphic, check today’s goals, or edit your display name with zero clutter.',
    screen: 'command',
  },
  {
    title: '03 · Build Your Own AI Agents',
    body: 'Create custom AI helpers tailored to your role — connect your resume or study notes and run personalized checks in one click.',
    screen: 'agents',
  },
  {
    title: '04 · AI Study Mentor & Job Notes',
    body: 'Paste any job description or study note and ask questions in simple English. Every answer highlights the exact note it used.',
    screen: 'rag',
  },
  {
    title: '05 · Live Coding Test Arena',
    body: 'Solve real coding problems right in your browser with a live timer, instant pass/fail test cases, and friendly AI tips.',
    screen: 'dsa-coding',
  },
  {
    title: '06 · Two-Way Spoken Virtual Interview',
    body: 'Talk face-to-face with Hiring Manager Priya. She greets you by name, listens to your microphone, replies out loud, and scores your interview.',
    screen: 'interview',
  },
  {
    title: '07 · AI Resume Builder & Job Match',
    body: 'Generate a clean, honest resume in one click, check missing job keywords, and improve your bullet points for higher shortlist rates.',
    screen: 'resume',
  },
  {
    title: '08 · Learning Analytics & Auto-Apply',
    body: 'See your skill gap radar, 7-day learning velocity trend, interview score breakdown, and 1-click Auto-Apply funnel all in one place.',
    screen: 'analytics',
  },
];

export function GuidedTourOverlay({
  stepIndex,
  onStep,
  onOpenRagMentor,
  onOpenVoiceOnboarding,
  onClose,
}: {
  stepIndex: number | null;
  onStep: (nextIndex: number) => void;
  onOpenRagMentor?: () => void;
  onOpenVoiceOnboarding?: () => void;
  onClose: () => void;
}) {
  const [autoPlaying, setAutoPlaying] = useState(false);

  useEffect(() => {
    if (stepIndex === null || !autoPlaying) return;
    const t = setTimeout(() => {
      if (stepIndex >= TOUR_STEPS.length - 1) {
        setAutoPlaying(false);
        onClose();
      } else {
        onStep(stepIndex + 1);
      }
    }, 2800);
    return () => clearTimeout(t);
  }, [stepIndex, autoPlaying, onStep, onClose]);

  if (stepIndex === null) return null;
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 14, 24, 0.42)',
        zIndex: 70,
        backdropFilter: 'blur(4px)',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="pn glass-hero"
        role="dialog"
        aria-label="Guided platform tour"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '28px',
          transform: 'translateX(-50%)',
          width: 'min(600px, 94%)',
          padding: '22px 24px',
        }}
      >
        <div
          className="row"
          style={{
            marginBottom: 12,
            paddingBottom: 10,
            borderBottom: '1px solid var(--line)',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <div className="row" style={{ gap: 8 }}>
            <div style={{ width: 22, height: 22, color: 'var(--ink)' }}>
              <BrandLogo />
            </div>
            <span style={{ fontWeight: 700, letterSpacing: '0.03em' }}>place1ai</span>
            <span className="mute" style={{ fontSize: 12.5 }}>
              Quick Guided Tour
            </span>
          </div>
          <button
            onClick={() => setAutoPlaying((v) => !v)}
            style={{ minHeight: 32, padding: '4px 14px', fontSize: 12 }}
          >
            {autoPlaying ? 'Pause Auto-Play' : 'Auto-Play Tour'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.title}
              aria-label={`Jump to tour step ${idx + 1}`}
              onClick={() => onStep(idx)}
              style={{
                flex: 1,
                height: 6,
                minHeight: 6,
                padding: 0,
                border: 0,
                borderRadius: 9,
                background: idx <= stepIndex ? 'var(--gold)' : 'var(--line)',
              }}
            />
          ))}
        </div>

        <h3 style={{ marginBottom: 6, fontSize: 16.5 }}>{step.title}</h3>
        <p className="mute" style={{ fontSize: 14, lineHeight: 1.55 }}>{step.body}</p>
        <div className="row" style={{ marginTop: 16 }}>
          <span className="mute font-mono-num">
            {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={() => {
              setAutoPlaying(false);
              onClose();
            }}
          >
            Skip Tour
          </button>
          {stepIndex === 0 && onOpenVoiceOnboarding && (
            <button
              onClick={() => {
                setAutoPlaying(false);
                onClose();
                onOpenVoiceOnboarding();
              }}
            >
              Adjust Goal
            </button>
          )}
          {isLast ? (
            <button
              className="p"
              onClick={() => {
                setAutoPlaying(false);
                onClose();
                onStep(5); // step 5 is interview screen
              }}
            >
              Launch Virtual Interview →
            </button>
          ) : (
            <button
              className="p"
              onClick={() => onStep(stepIndex + 1)}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { TOUR_STEPS };
