import React, { useState } from 'react';
import {
  FULL_STACK_DEMAND_BARS,
  ONBOARDING_INTERESTS,
  POSITION_MARKET_DATA,
  SKILL_EDGES,
  SKILL_META,
} from '../lib/catalog';
import type { AppState, SkillKey, TargetRole } from '../types';
import { ProgressBar, Ring } from './UiPrimitives';

const NEED_SCREEN_MAP: Record<string, string> = {
  'Skills roadmap': 'roadmap',
  'Resume and ATS': 'resume',
  'Interview practice': 'interview',
  'Job matching': 'jobs',
  Certifications: 'learn',
};

export function ProgressPathSaga({
  state,
  onCompleteStage,
  onClaimChest,
}: {
  state: AppState;
  onCompleteStage: () => void;
  onClaimChest: () => void;
}) {
  const labels = state.roadmap
    .map((s) => s.title)
    .concat(['Assessment', 'Resume ready', 'Applications', 'Offer']);
  const total = labels.length;
  const pts = labels.map((_, i) => [
    60 + i * (600 / Math.max(1, total - 1)),
    110 + Math.sin(i * 1.3) * 55,
  ]);

  return (
    <div className="pn" id="saga">
      <div className="row" style={{ marginBottom: 8 }}>
        <h2 style={{ flex: 1, margin: 0 }}>
          Progress path · stage{' '}
          <span className="font-mono-num">
            {Math.min(state.user.stage + 1, total)} of {total}
          </span>
        </h2>
        <button onClick={onClaimChest}>
          {state.user.chestClaimedToday ? 'Daily reward claimed' : 'Daily reward'}
        </button>
        <button className="p" onClick={onCompleteStage}>
          Complete stage
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox="0 0 720 220"
          style={{ minWidth: 600, width: '100%', display: 'block' }}
          role="img"
          aria-label="Progress path"
        >
          {pts.map((p, i) => {
            if (i === 0) return null;
            const q = pts[i - 1];
            const mx = (q[0] + p[0]) / 2;
            const active = i <= state.user.stage;
            return (
              <path
                key={`seg-${i}`}
                d={`M${q[0]} ${q[1]}C${mx} ${q[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`}
                fill="none"
                stroke="var(--ink)"
                strokeOpacity={active ? 0.9 : 0.28}
                strokeWidth={active ? 4 : 2}
                strokeDasharray={active ? undefined : '3 8'}
                strokeLinecap="round"
              />
            );
          })}
          {pts.map((p, i) => {
            const done = i < state.user.stage;
            const current = i === state.user.stage;
            const lbl = labels[i];
            const shortLbl = lbl.length > 17 ? `${lbl.slice(0, 16)}…` : lbl;
            return (
              <g
                key={`nd-${i}`}
                style={{ cursor: current ? 'pointer' : 'default' }}
                tabIndex={current ? 0 : undefined}
                role={current ? 'button' : undefined}
                aria-label={current ? 'Complete current stage' : undefined}
                onClick={current ? onCompleteStage : undefined}
                onKeyDown={
                  current
                    ? (e) => {
                        if (e.key === 'Enter') onCompleteStage();
                      }
                    : undefined
                }
              >
                <circle
                  className={current ? 'cur' : undefined}
                  cx={p[0]}
                  cy={p[1]}
                  r="20"
                  fill={done ? 'var(--ink)' : 'var(--glass)'}
                  stroke="var(--ink)"
                  strokeOpacity={done || current ? 1 : 0.35}
                  strokeWidth={current ? 3 : 2}
                />
                <text
                  x={p[0]}
                  y={p[1] + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  fill={done ? 'var(--bg)' : 'var(--ink)'}
                >
                  {done ? '✓' : i + 1}
                </text>
                <text
                  x={p[0]}
                  y={p[1] + 40}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--ink)"
                >
                  {shortLbl}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mute" style={{ marginTop: 4 }}>
        Complete each stage to earn credits and badges.
      </p>
    </div>
  );
}

export function HomeView({
  state,
  onNavigate,
  onCompleteStage,
  onClaimChest,
  onToggleQuest,
  onOpenOnboarding,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
  onCompleteStage: () => void;
  onClaimChest: () => void;
  onToggleQuest: (quest: string, checked: boolean) => void;
  onOpenOnboarding: () => void;
}) {
  const u = state.user;
  const hrs = u.prof?.hrs || 8;
  const totalHours = state.roadmap.reduce((acc, s) => acc + s.hours, 0);
  const weeksToReady = Math.max(1, Math.ceil(totalHours / hrs));
  const nextStep = state.roadmap[0]?.title || 'JavaScript fundamentals';

  const badgesList: Array<[string, boolean]> = [
    ['Profile ready', true],
    ['4-day streak', true],
    ['Quiz passer', (state.skills.js || 0) > 0.3],
    ['First application', state.tracker.length > 0],
  ];

  const quests = [
    'Read the closures chapter',
    'Pass the JavaScript assessment',
    'Add one project bullet',
  ];

  return (
    <div>
      <h1>Welcome back, {u.name}</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Target: {u.role}
      </p>

      <ProgressPathSaga
        state={state}
        onCompleteStage={onCompleteStage}
        onClaimChest={onClaimChest}
      />

      <div className="g2">
        <div className="pn row" id="ring">
          <Ring percent={state.readiness} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2>Readiness</h2>
            <p className="mute">
              Estimated {weeksToReady} weeks to ready at {hrs} hours a week.
            </p>
            <button className="p" onClick={() => onNavigate('learn')}>
              Continue: {nextStep}
            </button>
          </div>
        </div>

        <div className="pn">
          <h2>This week</h2>
          <ProgressBar label="Study hours" value={Math.min(100, 62 + u.focus.sessions * 8)} />
          <ProgressBar label="Weekly goal" value={Math.min(100, 75 + u.weeklyDone.length * 5)} />
          <ProgressBar label="Streak (days)" value={Math.min(100, u.streak.count * 20)} />
          <p className="mute" style={{ marginTop: 8 }}>
            Learn React and Node.js to unlock more full stack jobs.
          </p>
        </div>
      </div>

      <div className="pn">
        <h2>Latest from your agents</h2>
        {state.agentLogs.slice(-3).reverse().map((l) => (
          <p key={l.id}>
            <b>{l.agent}</b>: {l.message}
          </p>
        ))}
        <button onClick={() => onNavigate('agents')}>See agent activity</button>
      </div>

      <div className="g2">
        <div className="pn">
          <h2>Level {u.level}</h2>
          <div className="xp" style={{ marginBottom: 6 }}>
            <b style={{ width: `${(u.xp % 200) / 2}%` }} />
          </div>
          <p className="mute font-mono-num">
            {200 - (u.xp % 200)} XP to next level
          </p>
          <div style={{ marginTop: 8 }}>
            {badgesList.map(([label, ok]) => (
              <span key={label} className={`chip ${ok ? 'o' : ''}`}>
                {ok ? 'Unlocked' : 'Locked'}: {label}
              </span>
            ))}
          </div>
        </div>

        <div className="pn">
          <h2>Cohort ranking</h2>
          {state.leaderboard.map((entry, idx) => (
            <div key={entry.name} className={`lb ${entry.isMe ? 'me' : ''}`}>
              <span>{idx + 1}</span>
              <span className="truncate">{entry.name}</span>
              <span className="font-mono-num" style={{ textAlign: 'right' }}>
                {entry.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pn">
        <h2>Activity, last 12 weeks</h2>
        <div className="hm">
          {Array.from({ length: 84 }, (_, i) => {
            const cls = ['', 'a', 'b', 'c'][((i * 7 + (i % 5) * 3) % 11) % 4];
            return <i key={i} className={cls} />;
          })}
        </div>
      </div>

      <div className="pn">
        <h2>Today’s quests</h2>
        {quests.map((q) => {
          const checked = u.completedQuests.includes(q);
          return (
            <label
              key={q}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={checked}
                onChange={(e) => onToggleQuest(q, e.target.checked)}
              />
              <span>{q}</span>
            </label>
          );
        })}
      </div>

      <div className="pn">
        <div className="row" style={{ marginBottom: 6 }}>
          <h2 style={{ flex: 1, margin: 0 }}>Your profile</h2>
          <button onClick={onOpenOnboarding}>Edit preferences</button>
        </div>
        {u.prof ? (
          <div>
            <p className="mute" style={{ marginTop: 8 }}>
              Interests
            </p>
            <div>
              {u.prof.int.map((key) => {
                const found = ONBOARDING_INTERESTS.find(([k]) => k === key);
                return (
                  <span key={key} className="chip">
                    {found ? found[1] : key}
                  </span>
                );
              })}
            </div>
            <p className="mute" style={{ marginTop: 8 }}>
              {u.prof.lvl} · {u.prof.hrs} hours per week
              {u.prof.goal ? ` · Dream role: ${u.prof.goal}` : ''}
            </p>
            <p className="mute">Focus areas</p>
            <div>
              {u.prof.needs.length > 0 ? (
                u.prof.needs.map((n) => (
                  <button
                    key={n}
                    className="chip"
                    style={{ minHeight: 0, cursor: 'pointer' }}
                    onClick={() => onNavigate(NEED_SCREEN_MAP[n] || 'roadmap')}
                  >
                    {n}
                  </button>
                ))
              ) : (
                <span className="mute">None selected</span>
              )}
            </div>
          </div>
        ) : (
          <p className="mute">
            Tell us your interests and needs to personalise your roadmap.
          </p>
        )}
      </div>
    </div>
  );
}

export function PositionView({
  state,
  onSetGoal,
}: {
  state: AppState;
  onSetGoal: (role: TargetRole) => void;
}) {
  return (
    <div>
      <h1>Position explorer</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Research update, Nov 2026: live posting shares from May to Aug 2026 samples. Pick a goal and every module follows it.
      </p>

      <div className="g2">
        {POSITION_MARKET_DATA.map((item) => {
          const isCurrent = item.role === state.user.role;
          return (
            <div key={item.role} className="pn">
              <h3>{item.role}</h3>
              <p className="mute">{item.tagline}</p>
              <p style={{ margin: '8px 0' }}>
                <span className="chip">Demand: {item.demand}</span>
                <span className="chip">{item.stack}</span>
              </p>
              <p className="mute">{item.insight}</p>
              <div style={{ marginTop: 10 }}>
                {isCurrent ? (
                  <span className="chip o">Current goal</span>
                ) : (
                  <button onClick={() => onSetGoal(item.role)}>Set as my goal</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pn">
        <h2>Full Stack skill demand, June 2026</h2>
        {FULL_STACK_DEMAND_BARS.map(([lbl, val]) => (
          <ProgressBar key={lbl} label={lbl} value={val} />
        ))}
        <p className="mute" style={{ marginTop: 10 }}>
          Share of 7,309 active postings. AI skills appear in 14% and AI coding tools are now routine.
        </p>
      </div>
    </div>
  );
}

export function SkillMapView({
  state,
  onAssessSkill,
}: {
  state: AppState;
  onAssessSkill: (skill: SkillKey) => void;
}) {
  const [selected, setSelected] = useState<SkillKey>('js');
  const keys = Object.keys(SKILL_META) as SkillKey[];
  const selMeta = SKILL_META[selected];
  const selPct = Math.round((state.skills[selected] || 0) * 100);

  return (
    <div>
      <h1>Skill map</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Each node is a skill. Arrows point from prerequisite to next skill.
      </p>

      <div className="pn" id="graph">
        <svg viewBox="0 0 440 280" width="100%" role="img" aria-label="Skill graph">
          {SKILL_EDGES.map(([from, to]) => {
            const a = SKILL_META[from];
            const b = SKILL_META[to];
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x + 36}
                y1={a.y}
                x2={b.x - 36}
                y2={b.y}
                stroke="var(--line)"
                strokeWidth="2"
              />
            );
          })}
          {keys.map((k) => {
            const m = state.skills[k] || 0;
            const strokeColor =
              m >= 0.7 ? 'var(--ok)' : m >= 0.3 ? 'var(--gold)' : 'var(--bad)';
            const s = SKILL_META[k];
            const isGap = m < 0.3;
            return (
              <g
                key={k}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(k)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelected(k);
                }}
              >
                <rect
                  x={s.x - 36}
                  y={s.y - 18}
                  width="72"
                  height="36"
                  rx="10"
                  fill={selected === k ? 'var(--soft)' : 'var(--pan)'}
                  stroke={strokeColor}
                  strokeWidth={m >= 0.7 ? 4 : 3}
                  strokeDasharray={isGap ? '5 4' : undefined}
                />
                <text
                  x={s.x}
                  y={s.y - 3}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--ink)"
                  fontWeight="600"
                >
                  {s.label}
                </text>
                <text
                  x={s.x}
                  y={s.y + 11}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--mute)"
                  className="font-mono-num"
                >
                  {Math.round(m * 100)}%
                </text>
              </g>
            );
          })}
        </svg>

        <p className="mute" style={{ marginTop: 10 }}>
          <span className="chip o">Mastered</span>
          <span className="chip">Learning</span>
          <span className="chip g">Gap</span>
          Select a node for details.
        </p>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <h3>
                {selMeta.label}: <span className="font-mono-num">{selPct}%</span> (BKT mastery)
              </h3>
              <p className="mute" style={{ marginTop: 4, marginBottom: 0 }}>
                Needed for {state.user.role}.{' '}
                {selPct < 50
                  ? 'This is a gap, so it is prioritized on your roadmap.'
                  : 'You are on track here.'}
              </p>
            </div>
            <button className="p" onClick={() => onAssessSkill(selected)}>
              Assess {selMeta.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoadmapView({
  state,
  onNavigate,
  onReorder,
  onCompleteStage,
  onClaimChest,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
  onReorder: (orderedIds: number[]) => void;
  onCompleteStage: () => void;
  onClaimChest: () => void;
}) {
  const [dragId, setDragId] = useState<number | null>(null);
  const hrs = state.user.prof?.hrs || 8;

  let cumulativeHours = 0;

  const handleDrop = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const ids = state.roadmap.map((s) => s.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDragId(null);
    onReorder(next);
  };

  return (
    <div>
      <h1>Roadmap</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Version {state.user.roadmapVersion}
        {state.user.roadmapVersion > 1 ? ' · replanned after your latest update' : ''}
      </p>

      <ProgressPathSaga
        state={state}
        onCompleteStage={onCompleteStage}
        onClaimChest={onClaimChest}
      />

      <p className="mute" style={{ marginBottom: 10 }}>
        Drag a step to reorder. The Critic agent validates prerequisites on the server.
      </p>

      <div className="pn" id="plan">
        {state.roadmap.map((step, i) => {
          cumulativeHours += step.hours;
          const endWeek = Math.ceil(cumulativeHours / hrs);
          return (
            <div
              key={step.id}
              className="step"
              draggable
              onDragStart={() => setDragId(step.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(step.id)}
              style={{
                cursor: 'grab',
                opacity: dragId === step.id ? 0.45 : 1,
              }}
            >
              <div
                className={`dot ${i === 0 ? 'now' : ''} ${
                  step.isRemedial ? 'rem' : ''
                }`}
              />
              <div>
                <h3>{step.title}</h3>
                <span className="mute font-mono-num">
                  {step.hours} hours · ends week {endWeek}
                </span>{' '}
                {step.isRemedial && (
                  <span className="chip g">Added by Evaluator</span>
                )}
              </div>
              <button onClick={() => onNavigate('learn')}>Open</button>
            </div>
          );
        })}
      </div>

      {state.agentDebate.length > 0 && (
        <div className="pn">
          <h2>Planner ⇄ Critic debate · v{state.user.roadmapVersion}</h2>
          <p className="mute" style={{ marginBottom: 10 }}>
            Multi-agent negotiation verifying prerequisite DAG order and weekly study budget.
          </p>
          {state.agentDebate
            .filter((d) => d.roadmapVersion === state.user.roadmapVersion)
            .slice(-6)
            .map((turn) => (
              <div key={turn.id} className="step">
                <span className="chip">{turn.speaker}</span>
                <div>
                  <span className="mute font-mono-num">Round {turn.round}</span>
                  <p style={{ margin: '2px 0 0' }}>{turn.message}</p>
                </div>
                <span />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
