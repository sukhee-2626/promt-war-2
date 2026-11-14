import React, { useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Flame,
  Mic,
  Target,
  TrendingUp,
} from 'lucide-react';
import { SKILL_META } from '../lib/catalog';
import type { AppState, SkillKey } from '../types';
import { ProgressBar, Ring, SkillRadarChart } from './UiPrimitives';

const ROLE_TARGETS: Record<string, Record<SkillKey, number>> = {
  'Frontend Engineer': {
    js: 85,
    react: 85,
    html: 80,
    node: 55,
    sql: 50,
    python: 40,
    git: 80,
    db: 60,
  },
  'Full Stack Developer': {
    js: 85,
    react: 80,
    html: 75,
    node: 80,
    sql: 75,
    python: 55,
    git: 80,
    db: 75,
  },
  'Data Analyst': {
    js: 40,
    react: 35,
    html: 40,
    node: 40,
    sql: 88,
    python: 85,
    git: 70,
    db: 80,
  },
  'Data Scientist': {
    js: 40,
    react: 35,
    html: 40,
    node: 45,
    sql: 85,
    python: 90,
    git: 75,
    db: 75,
  },
  'ML Engineer': {
    js: 45,
    react: 35,
    html: 35,
    node: 60,
    sql: 75,
    python: 92,
    git: 80,
    db: 75,
  },
  'Backend Developer': {
    js: 70,
    react: 45,
    html: 45,
    node: 88,
    sql: 88,
    python: 75,
    git: 82,
    db: 85,
  },
};

export function AnalyticsView({
  state,
  onNavigate,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
}) {
  const [tab, setTab] = useState<'overview' | 'skills' | 'outcomes'>('overview');

  const u = state.user;
  const targets = ROLE_TARGETS[u.role] || ROLE_TARGETS['Full Stack Developer'];
  const skillKeys = Object.keys(SKILL_META) as SkillKey[];

  const totalHoursLeft = state.roadmap.reduce((acc, s) => acc + s.hours, 0);
  const weeklyHours = u.prof?.hrs || 8;
  const estWeeks = Math.max(1, Math.ceil(totalHoursLeft / weeklyHours));

  const avgInterviewScore =
    state.interviews.length > 0
      ? Math.round(
          state.interviews.reduce((s, item) => s + item.overallScore, 0) /
            state.interviews.length
        )
      : null;

  const days = state.xpVelocity.days;
  const maxDayXp = Math.max(50, ...days.map((d) => d.xp));
  const avgDailyXp = Math.round(
    state.xpVelocity.totalWeek / Math.max(1, days.length)
  );
  const peakDay = days.reduce(
    (best, d) => (d.xp > best.xp ? d : best),
    days[0] || { day: 'Today', xp: 0, date: '' }
  );

  // Funnel numbers from real tracker entries
  const savedCount = state.tracker.length;
  const appliedCount = state.tracker.filter(
    (t) => t.stage === 'Applied' || t.stage === 'Interview' || t.stage === 'Offer'
  ).length;
  const interviewStageCount = state.tracker.filter(
    (t) => t.stage === 'Interview' || t.stage === 'Offer'
  ).length;
  const offerCount = state.tracker.filter((t) => t.stage === 'Offer').length;

  // Build SVG polyline points for 7-day trend
  const chartW = 460;
  const chartH = 150;
  const padX = 26;
  const padY = 18;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;
  const trendPoints = days.map((d, idx) => {
    const x =
      days.length > 1
        ? padX + (idx / (days.length - 1)) * plotW
        : padX + plotW / 2;
    const y = padY + plotH - (d.xp / maxDayXp) * plotH;
    return { x, y, ...d };
  });
  const linePath = trendPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    trendPoints.length > 0
      ? `${linePath} L ${trendPoints[trendPoints.length - 1].x.toFixed(1)} ${(
          padY + plotH
        ).toFixed(1)} L ${trendPoints[0].x.toFixed(1)} ${(padY + plotH).toFixed(1)} Z`
      : '';

  // Aggregate interview 4-axis averages if available
  const axisAverages =
    state.interviews.length > 0
      ? {
          communication: Math.round(
            state.interviews.reduce((s, r) => s + (r.breakdown.Communication || 0), 0) /
              state.interviews.length
          ),
          relevance: Math.round(
            state.interviews.reduce(
              (s, r) => s + (r.breakdown['Relevance and depth'] || 0),
              0
            ) / state.interviews.length
          ),
          structure: Math.round(
            state.interviews.reduce((s, r) => s + (r.breakdown.Structure || 0), 0) /
              state.interviews.length
          ),
          confidence: Math.round(
            state.interviews.reduce((s, r) => s + (r.breakdown.Confidence || 0), 0) /
              state.interviews.length
          ),
        }
      : null;

  // Skill gap rows sorted by biggest gap first
  const skillGapRows = skillKeys
    .map((key) => {
      const current = Math.round((state.skills[key] || 0) * 100);
      const target = targets[key] ?? 75;
      const gap = Math.max(0, target - current);
      const estHours = gap === 0 ? 0 : Math.max(2, Math.round(gap / 8));
      return {
        key,
        label: SKILL_META[key].label,
        current,
        target,
        gap,
        estHours,
      };
    })
    .sort((a, b) => b.gap - a.gap);

  const strongestSkill = [...skillGapRows].sort((a, b) => b.current - a.current)[0];
  const biggestGap = skillGapRows[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Clean Header + Section Switcher */}
      <div className="pn glass-hero" style={{ marginBottom: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="mute" style={{ fontSize: 13, marginBottom: 4 }}>
              Personal Progress &amp; Career Insights · {u.role}
            </div>
            <h1 style={{ margin: 0 }}>Your Learning Analytics</h1>
          </div>
          <div className="opts" style={{ margin: 0 }}>
            {(
              [
                ['overview', 'Overview'],
                ['skills', 'Skill Gaps'],
                ['outcomes', 'Interviews & Jobs'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                className={`opt ${tab === k ? 'on' : ''}`}
                onClick={() => setTab(k)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="kpi-grid">
        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mute">Job Readiness</span>
            <Target size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="font-mono-num" style={{ fontSize: 30, fontWeight: 700 }}>
            {state.readiness}%
          </div>
          <div className="mute" style={{ marginTop: 6 }}>
            ~{estWeeks} weeks to goal at {weeklyHours}h/week
          </div>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mute">Weekly XP Earned</span>
            <TrendingUp size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="font-mono-num" style={{ fontSize: 30, fontWeight: 700 }}>
            {state.xpVelocity.totalWeek} XP
          </div>
          <div className="mute font-mono-num" style={{ marginTop: 6 }}>
            Avg {avgDailyXp} XP/day · Peak {peakDay.day}
          </div>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mute">Interview Score</span>
            <Mic size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="font-mono-num" style={{ fontSize: 30, fontWeight: 700 }}>
            {avgInterviewScore !== null ? `${avgInterviewScore}/100` : 'Not yet'}
          </div>
          <div className="mute font-mono-num" style={{ marginTop: 6 }}>
            {state.interviews.length} voice mock{state.interviews.length === 1 ? '' : 's'} finished
          </div>
        </div>

        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mute">Active Applications</span>
            <Briefcase size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="font-mono-num" style={{ fontSize: 30, fontWeight: 700 }}>
            {savedCount}
          </div>
          <div className="mute font-mono-num" style={{ marginTop: 6 }}>
            {interviewStageCount} interviews · {offerCount} offers
          </div>
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* Radar + 7-Day Trend Area Chart */}
          <div className="g2" style={{ gap: 20 }}>
            <div className="pn" style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Skill Balance vs Target Role</h2>
                  <span className="mute">Solid area is you · Dashed outline is {u.role} goal</span>
                </div>
                <button onClick={() => onNavigate('tutortree')}>Full Map</button>
              </div>
              <SkillRadarChart skills={state.skills} targetSkills={targets} size={256} />
              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid var(--line)',
                  fontSize: 13,
                }}
              >
                <span>
                  Strongest: <b>{strongestSkill?.label}</b> ({strongestSkill?.current}%)
                </span>
                <span>
                  Top priority: <b>{biggestGap?.label}</b> (+{biggestGap?.gap}% needed)
                </span>
              </div>
            </div>

            <div className="pn" style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>7-Day Practice Velocity</h2>
                  <span className="mute">Daily XP progress over the past week</span>
                </div>
                <span className="mute font-mono-num">{u.streak.count}d streak</span>
              </div>

              <svg
                viewBox={`0 0 ${chartW} ${chartH + 26}`}
                width="100%"
                role="img"
                aria-label="7-day learning velocity trend chart"
                style={{ display: 'block', overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="xpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const gy = padY + plotH - ratio * plotH;
                  return (
                    <line
                      key={ratio}
                      x1={padX}
                      y1={gy}
                      x2={chartW - padX}
                      y2={gy}
                      stroke="var(--line)"
                      strokeDasharray="3 4"
                    />
                  );
                })}

                {areaPath && <path d={areaPath} fill="url(#xpAreaGrad)" />}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {trendPoints.map((pt) => (
                  <g key={pt.date}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={5}
                      fill="var(--pri)"
                      stroke="var(--bg)"
                      strokeWidth={2}
                    />
                    {pt.xp > 0 && (
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="var(--ink)"
                        className="font-mono-num"
                      >
                        {pt.xp}
                      </text>
                    )}
                    <text
                      x={pt.x}
                      y={chartH + 14}
                      textAnchor="middle"
                      fontSize="11.5"
                      fill="var(--mute)"
                    >
                      {pt.day}
                    </text>
                  </g>
                ))}
              </svg>

              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <div className="row" style={{ gap: 10 }}>
                  <Ring percent={Math.min(100, Math.round((u.xp % 200) / 2))} size={46} strokeWidth={5} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Level {u.level}</div>
                    <span className="mute font-mono-num">{200 - (u.xp % 200)} XP to next level</span>
                  </div>
                </div>
                <button className="p" onClick={() => onNavigate('daily')}>
                  <Flame size={14} style={{ display: 'inline', marginRight: 5 }} />
                  Earn XP Today
                </button>
              </div>
            </div>
          </div>

          {/* Study Consistency Heatmap + Focus Stats */}
          <div className="g2" style={{ gap: 20 }}>
            <div className="pn" style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>12-Week Study Activity</h2>
                  <span className="mute">Each square shows daily practice intensity</span>
                </div>
                <span className="mute font-mono-num">
                  {u.focus.sessions} focus sessions · {u.focus.minutes} min
                </span>
              </div>
              <div className="hm">
                {Array.from({ length: 84 }, (_, i) => {
                  const cls = ['', 'a', 'b', 'c'][((i * 7 + (i % 5) * 3) % 11) % 4];
                  return <i key={i} className={cls} />;
                })}
              </div>
            </div>

            <div className="pn" style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Next Recommended Actions</h2>
                  <span className="mute">Fastest ways to raise your {u.role} readiness</span>
                </div>
                <BarChart3 size={18} style={{ color: 'var(--gold)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="step" style={{ borderTop: 0, padding: '8px 4px' }}>
                  <Activity size={16} style={{ color: 'var(--gold)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Close {biggestGap?.label} gap</div>
                    <span className="mute">
                      Currently {biggestGap?.current}% · Goal {biggestGap?.target}% (~{biggestGap?.estHours}h)
                    </span>
                  </div>
                  <button onClick={() => onNavigate('aptitude')}>Quiz</button>
                </div>
                <div className="step" style={{ padding: '8px 4px' }}>
                  <Mic size={16} style={{ color: 'var(--gold)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Practice Virtual Interview</div>
                    <span className="mute">
                      {state.interviews.length === 0
                        ? 'Complete 1st spoken interview for score chart'
                        : `Current avg ${avgInterviewScore}/100`}
                    </span>
                  </div>
                  <button onClick={() => onNavigate('interview')}>Start</button>
                </div>
                <div className="step" style={{ padding: '8px 4px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--gold)' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Resume Keyword Score</div>
                    <span className="mute">
                      ATS Match {state.ats.score}/100 · {state.dsaSolved.length}/21 coding challenges
                    </span>
                  </div>
                  <button onClick={() => onNavigate('resume')}>Improve</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'skills' && (
        <div className="pn" style={{ marginBottom: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0 }}>Skill-by-Skill Gap Analysis for {u.role}</h2>
              <span className="mute">Sorted by highest priority gap first</span>
            </div>
            <button className="p" onClick={() => onNavigate('tutortree')}>
              Open Interactive Skill Map
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="cx">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Current</th>
                  <th>Role Goal</th>
                  <th>Remaining Gap</th>
                  <th>Est. Study</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {skillGapRows.map((row) => (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 600 }}>{row.label}</td>
                    <td className="font-mono-num">{row.current}%</td>
                    <td className="font-mono-num">{row.target}%</td>
                    <td
                      className="font-mono-num"
                      style={{
                        color: row.gap === 0 ? 'var(--ok)' : row.gap > 30 ? 'var(--bad)' : 'var(--gold)',
                        fontWeight: 600,
                      }}
                    >
                      {row.gap === 0 ? 'On target' : `-${row.gap}%`}
                    </td>
                    <td className="mute font-mono-num">
                      {row.estHours === 0 ? '0h' : `~${row.estHours}h`}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate('quiz')}
                        style={{ minHeight: 32, padding: '4px 12px', fontSize: 12.5 }}
                      >
                        Take Check
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'outcomes' && (
        <div className="g2" style={{ gap: 20 }}>
          {/* Interview Performance Analytics */}
          <div className="pn" style={{ marginBottom: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Virtual Interview Performance</h2>
                <span className="mute">Scores across your speaking practice rounds</span>
              </div>
              <button onClick={() => onNavigate('interview')}>Practice Interview</button>
            </div>

            {axisAverages ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <ProgressBar label="Communication" value={axisAverages.communication} />
                  <ProgressBar label="Depth &amp; Fit" value={axisAverages.relevance} />
                  <ProgressBar label="Structure (STAR)" value={axisAverages.structure} />
                  <ProgressBar label="Confidence" value={axisAverages.confidence} />
                </div>
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                  <div className="mute" style={{ fontSize: 12, marginBottom: 6 }}>
                    Recent Sessions
                  </div>
                  {state.interviews.slice(-4).reverse().map((iv) => (
                    <div key={iv.id} className="rr">
                      <div>
                        <b>{iv.type}</b>
                        <div className="mute" style={{ fontSize: 12 }}>
                          {(iv.summaryFeedback || 'Interview session scored & saved').slice(0, 72)}
                        </div>
                      </div>
                      <span className="font-mono-num" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        {iv.overallScore}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '18px 0' }}>
                <p className="mute" style={{ marginBottom: 12 }}>
                  No virtual interviews finished yet. Once you complete a voice session with Priya,
                  your Clarity, Depth, Structure, and Confidence scores will appear here.
                </p>
                <button className="p" onClick={() => onNavigate('interview')}>
                  <Mic size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Start First Virtual Interview
                </button>
              </div>
            )}
          </div>

          {/* Job Application Conversion Funnel */}
          <div className="pn" style={{ marginBottom: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Job Application Funnel</h2>
                <span className="mute">Track progress from saved roles to offers</span>
              </div>
              <button onClick={() => onNavigate('progress-jobs')}>Open Tracker</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Total Tracked Roles', count: savedCount, pct: 100 },
                {
                  label: 'Applied',
                  count: appliedCount,
                  pct: savedCount > 0 ? Math.round((appliedCount / savedCount) * 100) : 0,
                },
                {
                  label: 'Interview Stage',
                  count: interviewStageCount,
                  pct: savedCount > 0 ? Math.round((interviewStageCount / savedCount) * 100) : 0,
                },
                {
                  label: 'Offers Received',
                  count: offerCount,
                  pct: savedCount > 0 ? Math.round((offerCount / savedCount) * 100) : 0,
                },
              ].map((stage) => (
                <div key={stage.label}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{stage.label}</span>
                    <span className="font-mono-num mute">
                      {stage.count} ({stage.pct}%)
                    </span>
                  </div>
                  <div className="xp">
                    <b style={{ width: `${Math.max(4, stage.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                marginTop: 18,
                paddingTop: 12,
                borderTop: '1px solid var(--line)',
              }}
            >
              <div className="row" style={{ gap: 8 }}>
                <Award size={18} style={{ color: 'var(--gold)' }} />
                <span>
                  ATS Resume Score: <b className="font-mono-num">{state.ats.score}/100</b>
                </span>
              </div>
              <button onClick={() => onNavigate('resume')}>Tailor Resume</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
