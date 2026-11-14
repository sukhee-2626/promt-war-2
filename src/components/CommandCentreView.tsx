import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  Briefcase,
  Code2,
  Compass,
  Database,
  Flame,
  Layers,
  Map,
  MessageSquare,
  Mic,
  Pencil,
  Check,
  Play,
  Rocket,
  Sparkles,
  Trophy,
  Volume2,
  Wand2,
  Zap,
} from 'lucide-react';
import { CALIBRATION_QUOTES } from '../lib/catalog';
import type { AgentAuditResult, AppState, AutoApplyResult, TargetRole } from '../types';
import { ProgressBar, Ring, SkillRadarChart } from './UiPrimitives';

const TARGET_ROLES: TargetRole[] = [
  'Frontend Engineer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'ML Engineer',
  'Backend Developer',
];

function getGreetingPrefix(): string {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

export function CommandCentreView({
  state,
  onNavigate,
  onSetGoal,
  onUpdateName,
  onOpenMentorWithRag,
  onOpenVoiceOnboarding,
  onReplanAgents,
  onRunAgentAudit,
  onAutoApplyJobs,
  onStartFastTour,
  onToggleQuest,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
  onSetGoal: (role: TargetRole) => Promise<void>;
  onUpdateName: (name: string) => Promise<void>;
  onOpenMentorWithRag: () => void;
  onOpenVoiceOnboarding: () => void;
  onReplanAgents: () => Promise<void>;
  onRunAgentAudit: () => Promise<AgentAuditResult | null>;
  onAutoApplyJobs: () => Promise<AutoApplyResult | null>;
  onStartFastTour: () => void;
  onToggleQuest: (quest: string, checked: boolean) => Promise<void>;
}) {
  const [auditing, setAuditing] = useState(false);
  const [auditSummary, setAuditSummary] = useState<AgentAuditResult | null>(null);
  const [autoApplying, setAutoApplying] = useState(false);
  const [autoApplyResult, setAutoApplyResult] = useState<AutoApplyResult | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.user.name);

  const u = state.user;
  const xpInLevel = u.xp % 200;
  const levelPct = Math.round((xpInLevel / 200) * 100);
  const doneTasks = state.todayTasks.filter((t) => t.done).length;
  const maxDayXp = Math.max(40, ...state.xpVelocity.days.map((d) => d.xp));
  const quoteIdx = new Date().getDate() % CALIBRATION_QUOTES.length;
  const focusQuote = CALIBRATION_QUOTES[quoteIdx];
  const unappliedCount = state.jobs.filter((j) => !j.applied).length;
  const totalRoadmapHours = state.roadmap.reduce((acc, r) => acc + r.hours, 0);
  const completedStagesCount = Math.min(state.user.stage, state.roadmap.length);

  const handleAudit = async () => {
    if (auditing) return;
    setAuditing(true);
    try {
      const res = await onRunAgentAudit();
      if (res) setAuditSummary(res);
    } finally {
      setAuditing(false);
    }
  };

  const handleAutoApply = async () => {
    if (autoApplying) return;
    setAutoApplying(true);
    try {
      const res = await onAutoApplyJobs();
      if (res) setAutoApplyResult(res);
    } finally {
      setAutoApplying(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameDraft.trim()) return;
    await onUpdateName(nameDraft.trim());
    setEditingName(false);
  };

  const quickShortcuts = [
    { label: 'Analytics Hub', screen: 'analytics', icon: BarChart3 },
    { label: 'Skill Map', screen: 'tutortree', icon: Compass },
    { label: 'Core Lessons', screen: 'concepts', icon: Layers },
    { label: 'Aptitude & Quizzes', screen: 'aptitude', icon: Sparkles },
    { label: 'Daily Practice', screen: 'daily', icon: Flame },
    { label: 'Leaderboard', screen: 'leaderboard', icon: Trophy },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Clean Greeting & Personal Goal Header */}
      <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="row" style={{ gap: 10, marginBottom: 6 }}>
            {editingName ? (
              <div className="row" style={{ gap: 8 }}>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                  }}
                  aria-label="Your name"
                  style={{ width: 210, minHeight: 38 }}
                />
                <button className="p" onClick={handleSaveName} style={{ minHeight: 38 }}>
                  <Check size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Save
                </button>
              </div>
            ) : (
              <>
                <h1 style={{ margin: 0 }}>
                  {getGreetingPrefix()}, {u.name}
                </h1>
                <button
                  onClick={() => {
                    setNameDraft(u.name === 'Guest' ? '' : u.name);
                    setEditingName(true);
                  }}
                  title="Set your name so AI greets you personally"
                  style={{ minHeight: 32, padding: '3px 12px', fontSize: 12.5 }}
                >
                  <Pencil size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }} />
                  {u.name === 'Guest' ? 'Add Your Name' : 'Edit'}
                </button>
              </>
            )}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="mute">Target role</span>
            <select
              aria-label="Target job role"
              value={u.role}
              onChange={(e) => onSetGoal(e.target.value as TargetRole)}
              style={{
                width: 'auto',
                padding: '5px 14px',
                borderRadius: 99,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              {TARGET_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <button onClick={onOpenVoiceOnboarding}>
            <Volume2
              size={15}
              style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px', color: 'var(--gold)' }}
            />
            Voice Roadmap Finder
          </button>
          <button onClick={onStartFastTour}>
            <Zap
              size={15}
              style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px', color: 'var(--gold)' }}
            />
            Quick Tour
          </button>
          <button className="p" onClick={onOpenMentorWithRag}>
            <MessageSquare size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            Ask AI Mentor
          </button>
        </div>
      </div>

      {/* Post-Onboarding Personalized Roadmap Strip */}
      <div className="pn glass-hero" style={{ marginBottom: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="row" style={{ gap: 12 }}>
            <Map size={20} style={{ color: 'var(--gold)' }} />
            <div>
              <h2 style={{ margin: 0 }}>Your {u.role} Roadmap</h2>
              <span className="mute" style={{ fontSize: 13.5 }}>
                Step {Math.min(completedStagesCount + 1, Math.max(1, state.roadmap.length))} of {state.roadmap.length} ·{' '}
                <span className="font-mono-num">{totalRoadmapHours}</span> hours total
              </span>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button onClick={onOpenVoiceOnboarding}>Update with Voice</button>
            <button className="p" onClick={() => onNavigate('roadmap')}>
              Open Full Roadmap →
            </button>
          </div>
        </div>
        <div className="agent-flow" style={{ gap: 14 }}>
          {state.roadmap.slice(0, 4).map((step, idx) => {
            const done = idx < completedStagesCount;
            const current = idx === completedStagesCount;
            return (
              <div
                key={step.id}
                className="agent-node"
                style={{
                  padding: '14px 16px',
                  borderColor: current ? 'var(--gold)' : undefined,
                  opacity: done ? 0.85 : 1,
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="font-mono-num" style={{ fontSize: 11.5, color: 'var(--gold)', fontWeight: 700 }}>
                    STEP {idx + 1}
                  </span>
                  <span className="mute font-mono-num" style={{ fontSize: 11.5 }}>
                    {done ? 'Done' : current ? 'Up Next' : `${step.hours}h`}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{step.title}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Core AI Workspace Deck — Spacious & Easy to Scan */}
      <div className="ai-deck">
        {/* 1. BUILD AI AGENTS FIRST */}
        <div className="pn glass-hero" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Bot size={18} style={{ color: 'var(--gold)' }} />
                <h2 style={{ margin: 0 }}>Build AI Agents</h2>
              </div>
              <span className="mute font-mono-num" style={{ fontSize: 12.5 }}>
                {state.customAgents.length} saved
              </span>
            </div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
              {auditSummary?.summary ||
                'Create your own AI helpers in plain English — connect your saved notes and run checks in one click.'}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="p" onClick={() => onNavigate('agents')}>
              Make an Agent
            </button>
            <button disabled={auditing} onClick={handleAudit}>
              {auditing ? 'Checking…' : 'Health Check'}
            </button>
          </div>
        </div>

        {/* 2. AI STUDY MENTOR */}
        <div className="pn glass-hero" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Database size={18} style={{ color: 'var(--gold)' }} />
                <h2 style={{ margin: 0 }}>AI Study Mentor</h2>
              </div>
              <span className="mute font-mono-num" style={{ fontSize: 12.5 }}>
                {state.ragChunks.length} notes
              </span>
            </div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
              Ask questions in simple English using your resume, roadmap, and any job description you paste.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="p" onClick={onOpenMentorWithRag}>
              Chat with Mentor
            </button>
            <button onClick={() => onNavigate('rag')}>Add Job Notes</button>
          </div>
        </div>

        {/* 3. TWO-WAY SPEAKING VIRTUAL INTERVIEW */}
        <div className="pn glass-hero" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Mic size={18} style={{ color: 'var(--gold)' }} />
                <h2 style={{ margin: 0 }}>Virtual Interview</h2>
              </div>
              <span className="mute font-mono-num" style={{ fontSize: 12.5 }}>
                Two-way voice
              </span>
            </div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
              Talk with Hiring Manager Priya. She greets you by name, listens to your mic, and replies naturally.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="p" onClick={() => onNavigate('interview')}>
              Start Voice Call
            </button>
            <button onClick={() => onNavigate('dsa-com')}>Speaking Prep</button>
          </div>
        </div>

        {/* 4. LIVE CODING TEST */}
        <div className="pn glass-hero" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Code2 size={18} style={{ color: 'var(--gold)' }} />
                <h2 style={{ margin: 0 }}>Live Coding Test</h2>
              </div>
              <span className="mute font-mono-num" style={{ fontSize: 12.5 }}>
                {state.dsaSolved.length}/21 done
              </span>
            </div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
              Write JavaScript with a timer, run real pass/fail tests in-browser, and get clear AI code feedback.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="p" onClick={() => onNavigate('dsa-coding')}>
              Open Coding Test
            </button>
            <button onClick={() => onNavigate('dsa-solver')}>Code Helper</button>
          </div>
        </div>

        {/* 5. AI RESUME BUILDER */}
        <div className="pn glass-hero" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Wand2 size={18} style={{ color: 'var(--gold)' }} />
                <h2 style={{ margin: 0 }}>AI Resume Builder</h2>
              </div>
              <span className="mute font-mono-num" style={{ fontSize: 12.5 }}>
                Score {state.ats.score}/100
              </span>
            </div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
              Build a clean, honest resume in 1 click, spot missing job keywords, and strengthen bullet points.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="p" onClick={() => onNavigate('resume')}>
              Build My Resume
            </button>
            <button onClick={() => onNavigate('tutortree')}>Skill Map</button>
          </div>
        </div>

        {/* 6. AUTO-APPLY JOBS */}
        <div className="pn glass-hero" style={{ marginBottom: 0 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                <Rocket size={18} style={{ color: 'var(--gold)' }} />
                <h2 style={{ margin: 0 }}>Auto-Apply Jobs</h2>
              </div>
              <span className="mute font-mono-num" style={{ fontSize: 12.5 }}>
                {unappliedCount} open
              </span>
            </div>
            <p className="mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>
              Matches your skills to open jobs, tailors your summary, and adds applications to your tracker.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="p"
              disabled={autoApplying || unappliedCount === 0}
              onClick={handleAutoApply}
            >
              {autoApplying ? 'Applying…' : unappliedCount > 0 ? 'Apply to Top 3' : 'All Applied'}
            </button>
            <button onClick={() => onNavigate('progress-jobs')}>Browse Jobs</button>
          </div>
        </div>
      </div>

      {autoApplyResult && autoApplyResult.appliedCount > 0 && (
        <div className="pn" style={{ marginBottom: 0 }}>
          <b>Auto-Apply Done:</b> Prepared your resume and applied to{' '}
          <span className="font-mono-num">{autoApplyResult.appliedCount}</span> jobs (
          {autoApplyResult.appliedJobs.map((j) => `${j.company} ${j.fit}%`).join(', ')}).
        </div>
      )}

      {/* Clean Single-Row Shortcuts */}
      <div className="row" style={{ justifyContent: 'space-between', padding: '4px 2px' }}>
        <span className="mute" style={{ fontWeight: 600, fontSize: 13 }}>
          More Workspaces
        </span>
        <div className="quick-bar">
          {quickShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="quick-pill"
                onClick={() => onNavigate(item.screen)}
              >
                <Icon size={14} style={{ color: 'var(--gold)' }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Clean Progress Metrics */}
      <div className="kpi-grid">
        <div className="pn" style={{ marginBottom: 0 }}>
          <span className="mute">Your Level</span>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="font-mono-num" style={{ fontSize: 28, fontWeight: 700 }}>
              Lv.{u.level}
            </span>
            <span className="mute font-mono-num">{levelPct}%</span>
          </div>
          <div className="xp" style={{ marginTop: 12 }}>
            <b style={{ width: `${levelPct}%` }} />
          </div>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <span className="mute">Points Earned</span>
          <div className="font-mono-num" style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {u.xp} XP
          </div>
          <p className="mute font-mono-num" style={{ marginTop: 8, marginBottom: 0 }}>
            {200 - xpInLevel} XP to Level {u.level + 1}
          </p>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <span className="mute">Daily Streak</span>
          <div className="font-mono-num" style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {u.streak.count}d
          </div>
          <button
            onClick={() => onNavigate('daily')}
            style={{
              border: 0,
              padding: 0,
              minHeight: 0,
              marginTop: 8,
              color: 'var(--gold)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Do today&apos;s quiz →
          </button>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <span className="mute">Today&apos;s Goals</span>
          <div className="font-mono-num" style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {doneTasks} / {state.todayTasks.length}
          </div>
          <p className="mute" style={{ marginTop: 8, marginBottom: 0 }}>
            {u.dailyChallengeDone ? 'Daily quiz finished' : 'Daily quiz ready'}
          </p>
        </div>
      </div>

      {/* Analytics Snapshot: Skill Balance Radar + Weekly Velocity */}
      <div className="g2">
        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Skill Balance Graphic</h2>
            <button onClick={() => onNavigate('analytics')}>Full Analytics →</button>
          </div>
          <div className="g2" style={{ alignItems: 'center', marginBottom: 0 }}>
            <SkillRadarChart skills={state.skills} size={215} />
            <div>
              <ProgressBar label="JavaScript" value={Math.round((state.skills.js || 0) * 100)} />
              <ProgressBar label="React" value={Math.round((state.skills.react || 0) * 100)} />
              <ProgressBar label="HTML & CSS" value={Math.round((state.skills.html || 0) * 100)} />
              <ProgressBar label="Node.js" value={Math.round((state.skills.node || 0) * 100)} />
              <ProgressBar label="SQL" value={Math.round((state.skills.sql || 0) * 100)} />
              <ProgressBar label="Python" value={Math.round((state.skills.python || 0) * 100)} />
            </div>
          </div>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Weekly Practice Points</h2>
            <span className="mute font-mono-num">
              {state.xpVelocity.totalWeek} XP this week
            </span>
          </div>

          <div className="velocity-chart" role="img" aria-label="7-Day XP Velocity bar chart">
            {state.xpVelocity.days.map((d) => {
              const pct = Math.max(6, Math.round((d.xp / maxDayXp) * 100));
              return (
                <div key={d.date} className="velocity-col">
                  <span className="mute font-mono-num" style={{ fontSize: 11 }}>
                    {d.xp > 0 ? d.xp : ''}
                  </span>
                  <div className="velocity-track">
                    <div
                      className="velocity-bar"
                      style={{
                        height: `${d.xp > 0 ? pct : 6}%`,
                        opacity: d.xp > 0 ? 1 : 0.28,
                      }}
                      title={`${d.day} (${d.date}): ${d.xp} XP`}
                    />
                  </div>
                  <span className="mute" style={{ fontSize: 12 }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="row"
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              justifyContent: 'space-between',
            }}
          >
            <div className="row" style={{ gap: 12 }}>
              <Ring percent={state.readiness} size={52} strokeWidth={6} />
              <div>
                <div style={{ fontWeight: 600 }}>{state.readiness}% job ready</div>
                <span className="mute" style={{ fontSize: 12.5 }}>
                  “{focusQuote.quote.slice(0, 62)}…”
                </span>
              </div>
            </div>
            <button onClick={onReplanAgents}>Refresh Plan</button>
          </div>
        </div>
      </div>

      {/* Today's Checklist */}
      <div className="pn" style={{ marginBottom: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Today&apos;s Checklist</h2>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => onNavigate('daily')}>
              <Flame size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
              Daily Practice
            </button>
            <button onClick={() => onNavigate('progress-jobs')}>
              <Briefcase size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
              Job Tracker
            </button>
          </div>
        </div>
        <div className="g2">
          <div>
            {state.todayTasks.map((t) => (
              <div key={t.id} className="step">
                <div className={`dot ${t.done ? 'now' : ''}`} />
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <span className="mute">{t.done ? 'Completed' : 'Ready for you'}</span>
                </div>
                <button onClick={() => onNavigate(t.screen)}>{t.done ? 'View' : 'Start'}</button>
              </div>
            ))}
          </div>
          <div>
            {['Read the closures lesson', 'Pass the JavaScript skill check', 'Add one project bullet to resume'].map((q) => {
              const checked = u.completedQuests.includes(q);
              return (
                <label
                  key={q}
                  className="step"
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={checked}
                    onChange={(e) => onToggleQuest(q, e.target.checked)}
                  />
                  <span>{q}</span>
                  <span className="mute font-mono-num">+20 XP</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Compass, Layers, Play, Sparkles };
