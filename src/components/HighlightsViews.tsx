import React, { useState } from 'react';
import {
  Bot,
  Database,
  Flame,
  GitBranch,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { api } from '../lib/api';
import { DAILY_CHALLENGES, SKILL_EDGES, SKILL_META } from '../lib/catalog';
import type { AppState, RagQueryResult, SkillKey } from '../types';
import { ProgressBar, Ring } from './UiPrimitives';

const RAG_PRESETS = [
  'Why is JavaScript first in my roadmap?',
  'What is my ATS score and which keywords are missing?',
  'Show React and TypeScript market demand for Frontend Engineer',
  'Which job postings match my current Skill Twin?',
];

export function RagHubView({
  state,
  onOpenMentorWithRag,
  onStateUpdate,
}: {
  state: AppState;
  onOpenMentorWithRag: () => void;
  onStateUpdate: (s: AppState) => void;
}) {
  const [query, setQuery] = useState(RAG_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagQueryResult | null>(null);
  const [error, setError] = useState('');

  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [ingesting, setIngesting] = useState(false);

  const runSearch = async (qText?: string) => {
    const q = (qText ?? query).trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.queryRag(q);
      setResult(res.result);
      onStateUpdate(res.state);
    } catch (err: any) {
      setError(err.message || 'RAG query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!docTitle.trim() || !docContent.trim() || ingesting) return;
    setIngesting(true);
    setError('');
    try {
      const res = await api.ingestRagDoc(docTitle.trim(), docContent.trim());
      onStateUpdate(res.state);
      setDocTitle('');
      setDocContent('');
    } catch (err: any) {
      setError(err.message || 'Could not index document');
    } finally {
      setIngesting(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    const res = await api.deleteRagDoc(docId);
    onStateUpdate(res.state);
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Built-in RAG Engine</h1>
          <p className="mute" style={{ margin: 0 }}>
            Live BM25/TF-IDF retrieval over your SQLite profile, Skill Twin, ATS score, 2026 hiring data, and custom ingested JDs.
          </p>
        </div>
        <button className="p" onClick={onOpenMentorWithRag}>
          Open Floating RAG Mentor
        </button>
      </div>

      {/* Query Console */}
      <div className="pn">
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <Sparkles size={17} style={{ color: 'var(--gold)' }} />
          <h2 style={{ margin: 0 }}>Test Grounded Retrieval &amp; Synthesis</h2>
        </div>

        <div className="row" style={{ flexWrap: 'nowrap', marginBottom: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            placeholder="Ask anything grounded in your Skill Twin, Resume, Jobs, or Market Data…"
          />
          <button className="p" disabled={loading} onClick={() => runSearch()}>
            <Search size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            {loading ? 'Retrieving…' : 'Run RAG'}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {RAG_PRESETS.map((p) => (
            <button
              key={p}
              className="opt"
              style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
              onClick={() => {
                setQuery(p);
                runSearch(p);
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {error && (
          <p style={{ color: 'var(--bad)', marginTop: 10, marginBottom: 0 }}>{error}</p>
        )}
      </div>

      {/* Live Retrieval Output */}
      {result && (
        <div className="g2">
          <div className="pn">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Synthesized Answer</h2>
              <span className="mute font-mono-num" style={{ fontSize: 12 }}>
                {result.usedGemini ? 'Gemini + RAG' : 'Deterministic RAG'}
              </span>
            </div>
            <p style={{ lineHeight: 1.65 }}>{result.answer}</p>
            <div className="mute" style={{ marginTop: 10, fontSize: 12 }}>
              Cited sources: {result.sources.join(' · ') || 'Profile context'}
            </div>
          </div>

          <div className="pn">
            <h2 style={{ marginBottom: 8 }}>Top Retrieved SQLite Chunks</h2>
            {result.retrieved.length === 0 ? (
              <p className="mute">No lexical match; broad profile summary used.</p>
            ) : (
              result.retrieved.map((chunk) => (
                <div
                  key={chunk.id}
                  style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}
                >
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b>{chunk.id}</b>
                    <span className="mute font-mono-num">Relevance {chunk.score}</span>
                  </div>
                  <p className="mute" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {chunk.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Custom RAG Document Ingestion */}
      <div className="pn">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>Ingest Job Description or Study Notes into RAG</h2>
            <p className="mute" style={{ margin: '2px 0 0' }}>
              Add any company JD, interview rubric, or personal notes — immediately indexed into SQLite chunks (+15 XP).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDocTitle('Stripe Frontend Engineer JD');
              setDocContent(
                'Looking for React, TypeScript, accessible design systems, REST APIs, automated Playwright tests, and Core Web Vitals optimization.'
              );
            }}
          >
            Load Sample JD
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Document title (e.g. Figma Frontend Intern JD or System Design Notes)"
          />
          <textarea
            rows={3}
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Paste job requirements, hiring rubric, or study notes…"
          />
          <div className="row">
            <button
              className="p"
              disabled={ingesting || !docTitle.trim() || !docContent.trim()}
              onClick={handleIngest}
            >
              {ingesting ? 'Indexing…' : 'Index into SQLite RAG (+15 XP)'}
            </button>
          </div>
        </div>
      </div>

      {/* Indexed Knowledge Sources */}
      <div className="pn">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <Database size={16} />
            <h2 style={{ margin: 0 }}>Live Indexed Knowledge Chunks</h2>
          </div>
          <span className="mute font-mono-num">
            {state.ragChunks.reduce((a, b) => a + b.tokens, 0)} total tokens indexed
          </span>
        </div>
        <div className="g2">
          {state.ragChunks.map((chunk) => (
            <div
              key={chunk.id}
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--soft)',
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{chunk.id}</b>
                <div className="row" style={{ gap: 8 }}>
                  <span className="mute font-mono-num">{chunk.tokens} tokens</span>
                  {chunk.customDocId && (
                    <button
                      onClick={() => handleDeleteDoc(chunk.customDocId!)}
                      aria-label={`Delete ${chunk.id}`}
                      style={{ minHeight: 26, padding: '2px 10px', fontSize: 12 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="mute" style={{ margin: '6px 0 0', fontSize: 13 }}>
                {chunk.preview}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TutorTreeView({
  state,
  onAssessSkill,
  onStateUpdate,
}: {
  state: AppState;
  onAssessSkill: (skill: SkillKey) => void;
  onStateUpdate: (s: AppState) => void;
}) {
  const [selected, setSelected] = useState<SkillKey>('js');
  const [ragNote, setRagNote] = useState<RagQueryResult | null>(null);
  const [asking, setAsking] = useState(false);

  const keys = Object.keys(SKILL_META) as SkillKey[];
  const selMeta = SKILL_META[selected];
  const selPct = Math.round((state.skills[selected] || 0) * 100);
  const prereqs = SKILL_EDGES.filter(([, to]) => to === selected).map(
    ([from]) => SKILL_META[from].label
  );
  const unlocks = SKILL_EDGES.filter(([from]) => from === selected).map(
    ([, to]) => SKILL_META[to].label
  );

  const askNodeTutor = async (skill: SkillKey) => {
    setAsking(true);
    try {
      const label = SKILL_META[skill].label;
      const res = await api.queryRag(
        `Explain how ${label} impacts my readiness for ${state.user.role} and what to study next.`
      );
      setRagNote(res.result);
      onStateUpdate(res.state);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>TutorTree</h1>
          <p className="mute" style={{ margin: 0 }}>
            Interactive prerequisite skill graph backed by Bayesian Knowledge Tracing and Built-in RAG coaching.
          </p>
        </div>
        <button className="p" onClick={() => onAssessSkill(selected)}>
          Assess {selMeta.label}
        </button>
      </div>

      <div className="g2">
        <div className="pn" id="graph" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="row" style={{ gap: 6 }}>
              <GitBranch size={16} />
              <h2 style={{ margin: 0 }}>Skill Dependency Graph</h2>
            </div>
            <span className="mute font-mono-num">{state.readiness}% overall</span>
          </div>
          <svg viewBox="0 0 440 280" width="100%" role="img" aria-label="TutorTree skill graph">
            {SKILL_EDGES.map(([from, to]) => {
              const a = SKILL_META[from];
              const b = SKILL_META[to];
              const isHighlighted = from === selected || to === selected;
              return (
                <line
                  key={`${from}-${to}`}
                  x1={a.x + 36}
                  y1={a.y}
                  x2={b.x - 36}
                  y2={b.y}
                  stroke={isHighlighted ? 'var(--gold)' : 'var(--line)'}
                  strokeWidth={isHighlighted ? 2.6 : 2}
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
                  onClick={() => {
                    setSelected(k);
                    setRagNote(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelected(k);
                      setRagNote(null);
                    }
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
                    strokeWidth={selected === k ? 4 : m >= 0.7 ? 3.5 : 2.5}
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
          <p className="mute" style={{ marginTop: 8, marginBottom: 0 }}>
            Solid green ≥70% mastered · Amber 30–69% learning · Dashed red &lt;30% gap
          </p>
        </div>

        <div className="pn" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <span className="mute">Selected Node</span>
              <h2 style={{ margin: 0 }}>{selMeta.label}</h2>
            </div>
            <Ring percent={selPct} size={66} strokeWidth={7} />
          </div>

          <div className="mute" style={{ fontSize: 13 }}>
            Prerequisites: <b>{prereqs.join(', ') || 'Entry skill'}</b> · Unlocks:{' '}
            <b>{unlocks.join(', ') || 'Capstone mastery'}</b>
          </div>

          <p style={{ margin: 0 }}>
            {selPct < 50
              ? `${selMeta.label} is currently prioritized in your ${state.user.role} roadmap because mastery is ${selPct}%.`
              : `Solid foundation in ${selMeta.label} (${selPct}%). Ready for downstream skills and mock interview drills.`}
          </p>

          <div className="row" style={{ gap: 8 }}>
            <button className="p" onClick={() => onAssessSkill(selected)}>
              Take {selMeta.label} BKT Quiz
            </button>
            <button disabled={asking} onClick={() => askNodeTutor(selected)}>
              <Bot size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
              {asking ? 'Querying RAG…' : `Ask RAG Tutor`}
            </button>
          </div>

          {ragNote && (
            <div
              style={{
                marginTop: 4,
                paddingTop: 10,
                borderTop: '1px solid var(--line)',
              }}
            >
              <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>
                TutorTree RAG Response · Sources: {ragNote.sources.join(', ') || 'Skill Twin'}
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>{ragNote.answer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DailyChallengeView({
  state,
  onNavigate,
  onSubmitChallenge,
  onClaimChest,
  onToggleQuest,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
  onSubmitChallenge: (challengeId: string, answerIndex: number) => Promise<{
    correct: boolean;
    explanation: string;
    alreadyDone: boolean;
  }>;
  onClaimChest: () => void;
  onToggleQuest: (quest: string, checked: boolean) => Promise<void>;
}) {
  const defaultIdx = new Date().getDate() % DAILY_CHALLENGES.length;
  const [chIdx, setChIdx] = useState(defaultIdx);
  const challenge = DAILY_CHALLENGES[chIdx];
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmitChallenge(challenge.id, selected);
      setFeedback({ correct: res.correct, explanation: res.explanation });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Daily Challenge</h1>
          <p className="mute" style={{ margin: 0 }}>
            Keep your {state.user.streak.count}-day streak alive with today&apos;s engineering sprint.
          </p>
        </div>
        <button onClick={onClaimChest}>
          <Flame size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
          {state.user.chestClaimedToday ? 'Daily reward claimed' : 'Claim Daily Reward (+25 XP)'}
        </button>
      </div>

      <div className="opts">
        {DAILY_CHALLENGES.map((c, idx) => (
          <button
            key={c.id}
            className={`opt ${chIdx === idx ? 'on' : ''}`}
            onClick={() => {
              setChIdx(idx);
              setSelected(null);
              setFeedback(null);
            }}
          >
            {c.topic}
          </button>
        ))}
      </div>

      <div className="g2">
        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mute">
              {challenge.topic} · <span className="font-mono-num">+{challenge.xp} XP</span>
            </span>
            <span className="mute font-mono-num">
              {state.user.dailyChallengeDone ? 'Completed today' : 'Open'}
            </span>
          </div>
          <h2 style={{ marginBottom: 10 }}>{challenge.title}</h2>
          <p style={{ marginBottom: 14 }}>{challenge.prompt}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {challenge.options.map((opt, idx) => (
              <label
                key={opt}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1px solid ${selected === idx ? 'var(--pri)' : 'var(--line)'}`,
                  background: selected === idx ? 'var(--soft)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="daily-opt"
                  style={{ width: 'auto' }}
                  checked={selected === idx}
                  onChange={() => setSelected(idx)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button
              className="p"
              disabled={selected === null || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Checking…' : 'Submit Answer'}
            </button>
            <button onClick={() => onNavigate('concepts')}>Open Focus Timer</button>
          </div>

          {feedback && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <b style={{ color: feedback.correct ? 'var(--ok)' : 'var(--bad)' }}>
                {feedback.correct ? 'Correct.' : 'Not quite — try again.'}
              </b>
              <p className="mute" style={{ marginTop: 4, marginBottom: 0 }}>
                {feedback.explanation}
              </p>
            </div>
          )}
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <h2>Today&apos;s Calibration Quests</h2>
          {['Read the closures chapter', 'Pass the JavaScript assessment', 'Add one project bullet'].map((q) => {
            const checked = state.user.completedQuests.includes(q);
            return (
              <label
                key={q}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}
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
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <ProgressBar
              label="Tasks today"
              value={Math.round(
                (state.todayTasks.filter((t) => t.done).length /
                  Math.max(1, state.todayTasks.length)) *
                  100
              )}
            />
            <p className="mute font-mono-num" style={{ marginTop: 8, marginBottom: 0 }}>
              Focus sessions: {state.user.focus.sessions} ({state.user.focus.minutes} min)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardView({
  state,
  onNavigate,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
}) {
  const u = state.user;
  const maxScore = Math.max(1, ...state.leaderboard.map((l) => l.score));
  const myRank = state.leaderboard.findIndex((l) => l.isMe) + 1;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Leaderboard</h1>
          <p className="mute" style={{ margin: 0 }}>
            Live cohort standings updated as you solve DSA problems, pass BKT quizzes, and win Prompt Duels.
          </p>
        </div>
        <button className="p" onClick={() => onNavigate('daily')}>
          Earn XP Today
        </button>
      </div>

      <div className="g2">
        <div className="pn row">
          <Trophy size={34} style={{ color: 'var(--gold)' }} />
          <div>
            <span className="mute">Your Cohort Rank</span>
            <h2 className="font-mono-num" style={{ margin: '2px 0' }}>
              #{myRank || 1} of {state.leaderboard.length}
            </h2>
            <span className="mute font-mono-num">
              Lv.{u.level} · {u.xp} XP · {u.streak.count}d streak
            </span>
          </div>
        </div>

        <div className="pn">
          <h2 style={{ marginBottom: 8 }}>This Week&apos;s Output</h2>
          <ProgressBar
            label="Weekly XP"
            value={Math.min(100, Math.round((state.xpVelocity.totalWeek / 300) * 100))}
          />
          <ProgressBar label="Readiness" value={state.readiness} />
        </div>
      </div>

      <div className="pn">
        <h2 style={{ marginBottom: 10 }}>Cohort Rankings</h2>
        {state.leaderboard.map((entry, idx) => (
          <div key={entry.name} className={`lb ${entry.isMe ? 'me' : ''}`} style={{ padding: '10px 12px' }}>
            <span className="font-mono-num">#{idx + 1}</span>
            <div>
              <div>{entry.name}</div>
              <div className="xp" style={{ marginTop: 4, height: 6 }}>
                <b style={{ width: `${Math.round((entry.score / maxScore) * 100)}%` }} />
              </div>
            </div>
            <span className="font-mono-num" style={{ textAlign: 'right', fontWeight: 700 }}>
              {entry.score} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
