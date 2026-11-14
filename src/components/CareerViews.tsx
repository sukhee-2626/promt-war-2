import React, { useEffect, useRef, useState } from 'react';
import { Bot, Check, Code2, Mic, MicOff, Send, Sparkles, Trash2, Volume2, VolumeX, Wand2 } from 'lucide-react';
import interviewStageBanner from '../assets/images/interview_stage_banner_1794642150580.jpg';
import priyaAvatar from '../assets/images/interviewer_priya_avatar_1794642150720.jpg';
import { api } from '../lib/api';
import {
  CERTIFICATIONS,
  INTERVIEW_QUESTIONS,
  PORTFOLIO_PROJECTS,
  SKILL_META,
  TRACKER_STAGES,
} from '../lib/catalog';
import type {
  AgentAuditResult,
  AppState,
  AtsAiAudit,
  AutoApplyResult,
  CustomAgentRunResult,
  InterviewScore,
  InterviewSessionRecord,
  InterviewType,
  PivotDiff,
  SkillKey,
  TargetRole,
  TrackerStage,
} from '../types';
import { ProgressBar, Ring } from './UiPrimitives';

export function ResumeView({
  state,
  onSaveResume,
  onStateUpdate,
  onNavigate,
  onToast,
}: {
  state: AppState;
  onSaveResume: (resume: {
    name: string;
    summary: string;
    skills: string;
    experience: string;
  }) => Promise<void>;
  onStateUpdate?: (s: AppState) => void;
  onNavigate: (screen: string) => void;
  onToast?: (msg: string) => void;
}) {
  const [form, setForm] = useState(state.resume);
  const [highlightNote, setHighlightNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setForm(state.resume);
  }, [state.resume]);

  const handleChange = (
    field: keyof typeof form,
    value: string
  ) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onSaveResume(next);
    }, 350);
  };

  const handleGenerateDraft = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await api.generateResumeDraft(highlightNote);
      onStateUpdate?.(res.state);
      onToast?.('AI Resume Maker draft saved (+20 XP)');
    } catch (err: any) {
      onToast?.(err.message || 'Resume Maker failed');
    } finally {
      setGenerating(false);
    }
  };

  const bullets = form.experience.split('\n').filter(Boolean);
  const markdownResume = `# ${form.name}\n\n${form.summary}\n\n## Skills\n${form.skills}\n\n## Experience\n${bullets.map((b) => `- ${b}`).join('\n')}`;

  return (
    <div>
      <h1>AI Resume Maker &amp; Studio</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Generate an ATS-verified resume from your Skill Twin in 1 click, or edit live — saved to SQLite as you type.
      </p>

      <div className="pn" style={{ marginBottom: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0 }}>1-Click AI Resume Maker (Gemini)</h2>
            <span className="mute">
              Auto-writes summary, truthful skills tags, and quantified XYZ bullets from your SQLite mastery.
            </span>
          </div>
          <span className="pill" id="pill">
            ATS {state.ats.score}
          </span>
        </div>
        <div className="row" style={{ flexWrap: 'nowrap', marginBottom: 8 }}>
          <input
            value={highlightNote}
            onChange={(e) => setHighlightNote(e.target.value)}
            placeholder="Optional project or achievement to weave in (e.g. built Next.js dashboard for 200 users)"
          />
          <button className="p" disabled={generating} onClick={handleGenerateDraft}>
            {generating ? 'Building Resume…' : 'AI Build Resume (+20 XP)'}
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button onClick={() => onNavigate('ats')}>Open Gemini ATS Lab</button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(markdownResume);
              onToast?.('Copied Markdown resume');
            }}
          >
            Copy Markdown
          </button>
          <button onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <div className="split">
        <div className="pn">
          <label style={{ display: 'block', marginBottom: 10 }}>
            <span className="mute">Name</span>
            <input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <span className="mute">Summary</span>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => handleChange('summary', e.target.value)}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <span className="mute">Skills</span>
            <input
              value={form.skills}
              onChange={(e) => handleChange('skills', e.target.value)}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 10 }}>
            <span className="mute">Experience, one bullet per line</span>
            <textarea
              rows={5}
              value={form.experience}
              onChange={(e) => handleChange('experience', e.target.value)}
            />
          </label>
          <p className="mute" style={{ marginTop: 6 }}>
            Skills you are still learning stay marked “learning”. The verifier checks claims against
            your skill twin.
          </p>
        </div>

        <div className="paper">
          <h3>{form.name}</h3>
          <p>{form.summary}</p>
          <hr />
          <b>Skills</b>
          <p style={{ marginTop: 4 }}>{form.skills}</p>
          <hr />
          <b>Experience</b>
          <ul style={{ paddingLeft: 18, marginTop: 6 }}>
            {bullets.map((b, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AtsLabView({
  state,
  onAddKeyword,
  onSaveResume,
  onStateUpdate,
  onToast,
}: {
  state: AppState;
  onAddKeyword: (kw: string) => Promise<void>;
  onSaveResume?: (resume: {
    name: string;
    summary: string;
    skills: string;
    experience: string;
  }) => Promise<void>;
  onStateUpdate?: (s: AppState) => void;
  onToast?: (msg: string) => void;
}) {
  const { ats } = state;
  const [jdText, setJdText] = useState(
    'Seeking Frontend / Full Stack Engineer skilled in React, TypeScript, REST APIs, SQL, automated testing, accessibility, and Docker CI/CD.'
  );
  const [auditing, setAuditing] = useState(false);
  const [aiAudit, setAiAudit] = useState<AtsAiAudit | null>(null);

  const runAtsAudit = async () => {
    if (auditing) return;
    setAuditing(true);
    try {
      const res = await api.analyzeAts(jdText);
      setAiAudit(res.audit);
      onStateUpdate?.(res.state);
      onToast?.('Gemini ATS audit ready');
    } catch (err: any) {
      onToast?.(err.message || 'ATS audit failed');
    } finally {
      setAuditing(false);
    }
  };

  const appendBulletToResume = async (bullet: string) => {
    const clean = bullet.trim();
    if (!clean) return;
    const nextExp = state.resume.experience
      ? `${state.resume.experience.trim()}\n${clean}`
      : clean;
    if (onSaveResume) {
      await onSaveResume({ ...state.resume, experience: nextExp });
    } else {
      const res = await api.updateResume({ ...state.resume, experience: nextExp });
      onStateUpdate?.(res.state);
    }
    onToast?.('Impact bullet appended to Resume Studio');
  };

  return (
    <div>
      <h1>ATS Lab &amp; Gemini JD Audit</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Keywords come from 7,309 Full Stack postings (June 2026) plus live Gemini semantic matching against any Job Description you paste.
      </p>

      <div className="g2">
        <div className="pn row">
          <Ring percent={ats.score} size={130} />
          <div>
            <h2>Baseline Score</h2>
            <p className="mute">{ats.score >= 75 ? 'Strong match' : 'Needs work'}</p>
          </div>
        </div>

        <div className="pn">
          <h2>Breakdown</h2>
          <ProgressBar label="Keywords" value={Math.round((ats.kwScore / 45) * 100)} />
          <ProgressBar label="Sections" value={100} />
          <ProgressBar label="Parse quality" value={100} />
          <ProgressBar label="Impact" value={Math.round((ats.impactScore / 15) * 100)} />
          <ProgressBar label="Format" value={100} />
        </div>
      </div>

      {/* Gemini JD Match & XYZ Bullet Rewriter */}
      <div className="pn">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Gemini JD Match &amp; XYZ Bullet Rewriter</h2>
          <div className="row" style={{ gap: 6 }}>
            <button
              onClick={() =>
                setJdText(
                  'Senior Frontend Engineer: React 19, TypeScript, Tailwind CSS, Core Web Vitals, Accessibility WCAG AA, REST & GraphQL, Playwright tests.'
                )
              }
            >
              Frontend JD
            </button>
            <button
              onClick={() =>
                setJdText(
                  'Full Stack AI Engineer: TypeScript, Node.js, React, SQL databases, Docker, AWS cloud, RAG retrieval pipelines, automated CI/CD.'
                )
              }
            >
              Full Stack AI JD
            </button>
          </div>
        </div>
        <textarea
          rows={3}
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste a target job description to score keyword coverage and rewrite experience bullets…"
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="p" disabled={auditing} onClick={runAtsAudit}>
            {auditing ? 'Auditing with Gemini…' : 'Run Gemini ATS Audit'}
          </button>
        </div>

        {aiAudit && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div className="row" style={{ gap: 16, marginBottom: 12 }}>
              <Ring percent={aiAudit.matchScore} size={86} strokeWidth={8} />
              <div style={{ flex: 1 }}>
                <div className="mute font-mono-num" style={{ fontSize: 12 }}>
                  {aiAudit.usedGemini ? 'Gemini ATS Recruiter Audit' : 'Deterministic JD Audit'}
                </div>
                <p style={{ margin: '4px 0 6px', fontWeight: 500 }}>{aiAudit.verdict}</p>
                <div className="mute" style={{ fontSize: 12.5 }}>
                  Matched: <b>{aiAudit.matchedKeywords.join(', ') || 'none'}</b> · Missing:{' '}
                  <b style={{ color: 'var(--bad)' }}>{aiAudit.missingKeywords.join(', ') || 'none'}</b>
                </div>
              </div>
            </div>

            <h3>Rewritten XYZ / STAR Impact Bullets</h3>
            {aiAudit.rewrittenBullets.map((b, idx) => (
              <div key={idx} className="rr">
                <span style={{ fontSize: 13.5 }}>{b}</span>
                <button onClick={() => appendBulletToResume(b)}>Append to Resume</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pn">
        <h2>Missing keywords</h2>
        {ats.miss.length > 0 ? (
          <div style={{ marginBottom: 8 }}>
            {ats.miss.map((kw) => (
              <button
                key={kw}
                className="chip g"
                style={{ minHeight: 0 }}
                onClick={() => onAddKeyword(kw)}
              >
                {kw} +
              </button>
            ))}
          </div>
        ) : (
          <p>All keywords found.</p>
        )}
        <p className="mute">
          Adding a keyword marks it as learning, so the resume stays truthful.
        </p>
      </div>
    </div>
  );
}

export function JobsView({
  state,
  onTailorResume,
  onApplyJob,
  onStateUpdate,
  onToast,
}: {
  state: AppState;
  onTailorResume: (jobId: string) => Promise<void>;
  onApplyJob: (jobId: string) => Promise<void>;
  onStateUpdate?: (s: AppState) => void;
  onToast?: (msg: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoResult, setAutoResult] = useState<AutoApplyResult | null>(null);

  const openJobs = state.jobs.filter((j) => !j.applied);

  const runAutoApply = async () => {
    if (autoBusy || openJobs.length === 0) return;
    setAutoBusy(true);
    try {
      const res = await api.autoApplyJobs(0, 3);
      setAutoResult(res.result);
      onStateUpdate?.(res.state);
      onToast?.(
        res.result.appliedCount > 0
          ? `Auto-applied to ${res.result.appliedCount} best-fit roles (+${res.result.appliedCount * 40} XP)`
          : 'All open jobs already applied'
      );
    } catch (err: any) {
      onToast?.(err.message || 'Auto-apply failed');
    } finally {
      setAutoBusy(false);
    }
  };

  return (
    <div>
      <h1>Job Matches &amp; Auto-Apply Agent</h1>
      <p className="mute" style={{ marginBottom: 14 }}>
        Fit is calculated live from your SQLite Skill Twin. Let the Autonomous Auto-Apply Agent tailor your resume and apply to top matches in 1 click.
      </p>

      <div className="pn" style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0 }}>Autonomous Batch Auto-Apply Engine</h2>
            <p className="mute" style={{ margin: '2px 0 0' }}>
              Tailors your resume summary for top roles, verifies truthful skills, logs into SQLite Tracker, and awards XP.
            </p>
          </div>
          <button
            className="p"
            disabled={autoBusy || openJobs.length === 0}
            onClick={runAutoApply}
          >
            {autoBusy
              ? 'Tailoring & Applying…'
              : openJobs.length > 0
                ? `AI Auto-Apply Top ${Math.min(3, openJobs.length)} Matches`
                : 'All Matching Roles Applied'}
          </button>
        </div>

        {autoResult && autoResult.appliedCount > 0 && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--line)',
            }}
          >
            <b>Auto-Applied ({autoResult.appliedCount} roles):</b>{' '}
            <span className="mute">
              {autoResult.appliedJobs.map((j) => `${j.title} at ${j.company} (${j.fit}%)`).join(' · ')}
            </span>
          </div>
        )}
      </div>

      {state.jobs.map((job) => (
        <div key={job.id} className="pn row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3>{job.title}</h3>
            <p className="mute">{job.company}</p>
            <div>
              {job.missing.map((k) => (
                <span key={k} className="chip g">
                  Missing: {SKILL_META[k].label}
                </span>
              ))}
            </div>
          </div>
          <Ring percent={job.fit} size={76} strokeWidth={8} />
          <button
            disabled={busyId === job.id}
            onClick={async () => {
              setBusyId(job.id);
              try {
                await onTailorResume(job.id);
              } finally {
                setBusyId(null);
              }
            }}
          >
            {busyId === job.id ? 'Tailoring…' : 'Tailor resume'}
          </button>
          <button
            className="p"
            disabled={job.applied || busyId === job.id}
            onClick={() => onApplyJob(job.id)}
          >
            {job.applied ? 'Applied' : 'Apply'}
          </button>
        </div>
      ))}

      {state.tracker.filter((t) => t.stage === 'Applied').length > 0 && (
        <div className="pn">
          <h2>Your applications</h2>
          {state.tracker
            .filter((t) => t.stage === 'Applied')
            .map((a) => (
              <div key={a.id} className="step">
                <div className="dot now" />
                <div>
                  <h3>
                    {a.role} · {a.company}
                  </h3>
                  <span className="mute">Applied, screening, interview, offer</span>
                  <div className="xp" style={{ marginTop: 6 }}>
                    <b style={{ width: '25%' }} />
                  </div>
                </div>
                <span className="chip">{a.stage}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function TrackerView({
  state,
  onAdd,
  onMove,
  onDelete,
  onToast,
}: {
  state: AppState;
  onAdd: (company: string, role?: string) => Promise<void>;
  onMove: (id: number, stage: TrackerStage) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToast: (msg: string) => void;
}) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');

  const add = async () => {
    if (!company.trim()) {
      onToast('Enter a company');
      return;
    }
    await onAdd(company.trim(), role.trim() || undefined);
    setCompany('');
    setRole('');
  };

  const countStage = (s: TrackerStage) =>
    state.tracker.filter((j) => j.stage === s).length;
  const appliedCount = state.tracker.length - countStage('Saved');
  const interviewOrOffer = countStage('Interview') + countStage('Offer');
  const interviewRate = appliedCount
    ? Math.round((interviewOrOffer / appliedCount) * 100)
    : 0;

  return (
    <div>
      <h1>Application tracker</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Track every application from saved to offer in SQLite.
      </p>

      <div className="pn">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            placeholder="Company"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            placeholder={`Role (default: ${state.user.role})`}
          />
          <button className="p" onClick={add}>
            Add
          </button>
        </div>
      </div>

      <div className="g2">
        <div className="pn row">
          <Ring percent={interviewRate} size={100} />
          <div>
            <h2>Interview rate</h2>
            <p className="mute font-mono-num">
              {appliedCount} applied · {interviewOrOffer} reached interview or offer
            </p>
          </div>
        </div>
        <div className="pn">
          <h2>Pipeline</h2>
          {TRACKER_STAGES.map((s) => (
            <ProgressBar
              key={s}
              label={s}
              value={
                state.tracker.length
                  ? Math.round((countStage(s) / state.tracker.length) * 100)
                  : 0
              }
            />
          ))}
        </div>
      </div>

      <div className="g2">
        {TRACKER_STAGES.map((stage) => {
          const items = state.tracker.filter((t) => t.stage === stage);
          return (
            <div key={stage} className="pn">
              <h3>
                {stage} · <span className="font-mono-num">{items.length}</span>
              </h3>
              {items.length === 0 ? (
                <p className="mute" style={{ marginTop: 8 }}>
                  Empty
                </p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rr">
                    <div>
                      <b>{item.company}</b>
                      <br />
                      <span className="mute">{item.role}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <select
                        aria-label="Move stage"
                        style={{ width: 'auto' }}
                        value={item.stage}
                        onChange={(e) =>
                          onMove(item.id, e.target.value as TrackerStage)
                        }
                      >
                        {TRACKER_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label="Remove"
                        onClick={() => onDelete(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CareerKitView({
  state,
  onToggleProject,
  onGenerateCoverLetter,
  onToast,
}: {
  state: AppState;
  onToggleProject: (title: string, checked: boolean) => void;
  onGenerateCoverLetter: (payload: {
    company: string;
    role: string;
    skills: string;
    achievement: string;
    whyCompany: string;
  }) => Promise<string>;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'prj' | 'cv' | 'li' | 'ce'>('prj');

  const top3 = (Object.keys(state.skills) as SkillKey[])
    .sort((a, b) => (state.skills[b] || 0) - (state.skills[a] || 0))
    .slice(0, 3)
    .map((k) => SKILL_META[k].label);

  // Cover letter state
  const [cc, setCc] = useState('');
  const [cr, setCr] = useState<string>(state.user.role);
  const [cs, setCs] = useState(top3.join(', '));
  const [ca, setCa] = useState('');
  const [cw, setCw] = useState('');
  const [letter, setLetter] = useState('');
  const [generating, setGenerating] = useState(false);

  const projects =
    PORTFOLIO_PROJECTS[state.user.role] || PORTFOLIO_PROJECTS['Full Stack Developer'];
  const certs =
    CERTIFICATIONS[state.user.role] || CERTIFICATIONS['Full Stack Developer'];

  const headlines = [
    `${state.user.role} | ${top3.join(', ')} | Building projects and learning in public`,
    `Aspiring ${state.user.role} | ${top3[0]} · ${top3[1]} | Open to opportunities`,
    `${top3[0]} and ${top3[1]} learner targeting ${state.user.role} roles`,
  ];
  const aboutText = `I am a ${(state.user.prof?.lvl || 'motivated').toLowerCase()} learner working towards a career as a ${state.user.role}. I build projects with ${top3.join(', ')} and practise problem solving and communication every week. I am looking for an opportunity to contribute, learn from a strong team and grow.`;
  const outreachMsg = `Hi, I’m ${state.user.name}, preparing for ${state.user.role} roles. I admire your work in this field and would value 10 minutes of advice on how to start. Thank you for considering it.`;

  const copyText = (text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => onToast('Copied'))
      .catch(() => onToast('Copy not available'));
  };

  return (
    <div>
      <h1>Career kit</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Projects, AI cover letter, LinkedIn profile text and certifications for {state.user.role}.
      </p>

      <div className="opts">
        {(
          [
            ['prj', 'Projects'],
            ['cv', 'Cover letter'],
            ['li', 'LinkedIn'],
            ['ce', 'Certifications'],
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

      {tab === 'prj' && (
        <div className="pn">
          <h2>Portfolio projects for {state.user.role}</h2>
          {projects.map(([title, level, stack, desc]) => {
            const checked = state.user.completedProjects.includes(title);
            return (
              <label key={title} className="step" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={checked}
                  onChange={(e) => onToggleProject(title, e.target.checked)}
                />
                <span>
                  <b>{title}</b> <span className="chip">{level}</span>
                  <br />
                  <span className="mute">
                    {stack} · {desc}
                  </span>
                </span>
                <span />
              </label>
            );
          })}
          <p className="mute" style={{ marginTop: 10 }}>
            Publish each project on GitHub with a clear README and a screenshot.
          </p>
          <a
            className="lnk"
            href="https://github.com/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create a GitHub repository
          </a>
        </div>
      )}

      {tab === 'cv' && (
        <div className="pn">
          <h2>Cover letter generator (Gemini AI)</h2>
          <div className="g2">
            <label>
              <span className="mute">Company</span>
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Brightwave"
              />
            </label>
            <label>
              <span className="mute">Role</span>
              <input value={cr} onChange={(e) => setCr(e.target.value)} />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 8 }}>
            <span className="mute">Key skills</span>
            <input value={cs} onChange={(e) => setCs(e.target.value)} />
          </label>
          <label style={{ display: 'block', marginTop: 8 }}>
            <span className="mute">A recent achievement</span>
            <input
              value={ca}
              onChange={(e) => setCa(e.target.value)}
              placeholder="built a library tracker used by 40 students"
            />
          </label>
          <label style={{ display: 'block', marginTop: 8 }}>
            <span className="mute">Why this company</span>
            <input
              value={cw}
              onChange={(e) => setCw(e.target.value)}
              placeholder="it builds products that students rely on"
            />
          </label>
          <div className="row" style={{ margin: '12px 0' }}>
            <button
              className="p"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  const res = await onGenerateCoverLetter({
                    company: cc,
                    role: cr,
                    skills: cs,
                    achievement: ca,
                    whyCompany: cw,
                  });
                  setLetter(res);
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
            <button onClick={() => copyText(letter)}>Copy</button>
          </div>
          <textarea
            rows={11}
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            aria-label="Cover letter"
          />
        </div>
      )}

      {tab === 'li' && (
        <div>
          <div className="pn">
            <h2>LinkedIn headline options</h2>
            {headlines.map((h, idx) => (
              <div key={idx} className="rr">
                <textarea rows={2} readOnly value={h} />
                <button onClick={() => copyText(h)}>Copy</button>
              </div>
            ))}
          </div>
          <div className="pn">
            <h2>About section</h2>
            <textarea rows={5} readOnly value={aboutText} />
            <button style={{ marginTop: 10 }} onClick={() => copyText(aboutText)}>
              Copy
            </button>
          </div>
          <div className="pn">
            <h3>Networking message</h3>
            <textarea rows={4} readOnly value={outreachMsg} style={{ marginTop: 8 }} />
            <button style={{ marginTop: 10 }} onClick={() => copyText(outreachMsg)}>
              Copy
            </button>
          </div>
        </div>
      )}

      {tab === 'ce' && (
        <div className="pn">
          <h2>Certifications for {state.user.role}</h2>
          {certs.map(([title, provider, url, note]) => (
            <div key={title} className="rr">
              <div>
                <h3>{title}</h3>
                <span className="mute">
                  {note} · {provider}
                </span>
              </div>
              <a
                className="lnk"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ margin: 0 }}
              >
                Open
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InterviewView({
  state,
  initialType,
  onEvaluateInterview,
  onNavigate,
  onToast,
}: {
  state: AppState;
  initialType: InterviewType;
  onEvaluateInterview: (
    type: InterviewType,
    qaPairs: Array<{ q: string; a: string }>
  ) => Promise<InterviewSessionRecord | null>;
  onNavigate: (screen: string) => void;
  onToast: (msg: string) => void;
}) {
  const [phase, setPhase] = useState<'setup' | 'live' | 'report'>('setup');
  const [type, setType] = useState<InterviewType>(initialType);
  const [persona, setPersona] = useState('Friendly Startup Team');
  const [length, setLength] = useState(3);
  const [voiceOn, setVoiceOn] = useState(true);
  const [autoListen, setAutoListen] = useState(true);

  const [questions, setQuestions] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0); // 0 = Greeting icebreaker, 1..N = core questions
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [dialogue, setDialogue] = useState<Array<{ speaker: 'ai' | 'you'; text: string }>>([]);
  const [answer, setAnswer] = useState('');
  const [scratchpad, setScratchpad] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [followUpProbe, setFollowUpProbe] = useState<string | null>(null);
  const [coachHint, setCoachHint] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [probing, setProbing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [qaPairs, setQaPairs] = useState<Array<{ q: string; a: string }>>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [camActive, setCamActive] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [report, setReport] = useState<InterviewSessionRecord | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const srRef = useRef<any>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoListenRef = useRef(autoListen);
  autoListenRef.current = autoListen;

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const stopSpeechRecognition = () => {
    if (srRef.current) {
      try {
        srRef.current.stop();
      } catch {
        // ignore
      }
      srRef.current = null;
    }
    setDictating(false);
  };

  const stopMedia = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    stopSpeechRecognition();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamActive(false);
    setSpeaking(false);
  };

  useEffect(() => {
    return () => stopMedia();
  }, []);

  useEffect(() => {
    if (phase !== 'live') return;
    const iv = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const startMicQuietly = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR || srRef.current || phaseRef.current !== 'live') return;
    const r = new SR();
    r.continuous = true;
    r.lang = 'en-US';
    r.onresult = (e: any) => {
      let chunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += `${e.results[i][0].transcript} `;
      }
      setAnswer((prev) => `${prev}${prev ? ' ' : ''}${chunk.trim()}`);
    };
    r.onend = () => {
      srRef.current = null;
      setDictating(false);
    };
    r.onerror = () => {
      srRef.current = null;
      setDictating(false);
    };
    srRef.current = r;
    setDictating(true);
    try {
      r.start();
    } catch {
      srRef.current = null;
      setDictating(false);
    }
  };

  const speakUtterance = (text: string, enabled = voiceOn, autoStartMicAfter = true) => {
    stopSpeechRecognition();
    setSpeaking(true);
    try {
      window.speechSynthesis.cancel();
      if (!enabled) throw new Error('voice off');
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.96;
      u.onend = () => {
        setSpeaking(false);
        if (autoStartMicAfter && autoListenRef.current && phaseRef.current === 'live') {
          startMicQuietly();
        }
      };
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setTimeout(() => {
        setSpeaking(false);
        if (autoStartMicAfter && autoListenRef.current && phaseRef.current === 'live') {
          startMicQuietly();
        }
      }, 1200);
    }
  };

  const firstName = (state.user.name || 'Friend').trim().split(/\s+/)[0];

  const startSession = () => {
    const coreQuestions = INTERVIEW_QUESTIONS[type].slice(0, length);
    const greeting = `Hello ${firstName}! Nice to meet you today. How are you doing? To start, tell me a little about yourself and what excites you about ${state.user.role} work.`;
    setQuestions([greeting, ...coreQuestions]);
    setQIndex(0);
    setCurrentPrompt(greeting);
    setDialogue([{ speaker: 'ai', text: greeting }]);
    setAnswer('');
    setQaPairs([]);
    setFollowUpProbe(null);
    setCoachHint(null);
    setElapsedSec(0);
    setPhase('live');
    speakUtterance(greeting, voiceOn, true);
  };

  const toggleCamera = () => {
    if (!navigator.mediaDevices) {
      onToast('Camera is not available in this browser');
      return;
    }
    if (camActive && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamActive(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        streamRef.current = s;
        setCamActive(true);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => onToast('Camera blocked or unavailable'));
  };

  const toggleDictation = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      onToast('Voice mic is not supported here — you can type your reply below.');
      return;
    }
    if (srRef.current) {
      stopSpeechRecognition();
      return;
    }
    startMicQuietly();
  };

  const finishAndEvaluate = async (pairs: Array<{ q: string; a: string }>) => {
    stopMedia();
    if (pairs.length === 0) {
      setPhase('setup');
      return;
    }
    setEvaluating(true);
    try {
      const rec = await onEvaluateInterview(type, pairs);
      if (rec) {
        setReport(rec);
        setPhase('report');
      }
    } finally {
      setEvaluating(false);
    }
  };

  const submitAnswer = async (overrideText?: string) => {
    const combined = (overrideText ?? answer).trim();
    const withBoard =
      scratchpad.trim() && !combined.includes(scratchpad.trim())
        ? `${combined}\n[Whiteboard]: ${scratchpad.trim()}`.trim()
        : combined;
    const words = withBoard.split(/\s+/).filter(Boolean).length;
    if (words < 3) {
      onToast('Say or type a short answer first (at least 3 words)');
      return;
    }

    stopSpeechRecognition();
    const spokenSoFar = currentPrompt || questions[qIndex];
    const nextPairs =
      qIndex === 0
        ? qaPairs // greeting icebreaker warms up conversation cleanly; core questions go to scoring
        : [...qaPairs, { q: spokenSoFar, a: withBoard }];

    if (qIndex === 0 && questions.length === 1) {
      nextPairs.push({ q: spokenSoFar, a: withBoard });
    }

    setQaPairs(nextPairs);
    setDialogue((prev) => [...prev, { speaker: 'you', text: combined }]);
    setAnswer('');
    setScratchpad('');
    setFollowUpProbe(null);
    setCoachHint(null);

    const nextIdx = qIndex + 1;
    const upcomingQuestion = nextIdx < questions.length ? questions[nextIdx] : null;

    setReplying(true);
    try {
      const turn = await api.converseInterviewTurn({
        type,
        persona,
        currentPrompt: spokenSoFar,
        userUtterance: combined,
        nextQuestion: upcomingQuestion,
        turnIndex: qIndex,
      });

      setDialogue((prev) => [...prev, { speaker: 'ai', text: turn.replyText }]);
      if (turn.done || !upcomingQuestion) {
        speakUtterance(turn.replyText, voiceOn, false);
        await finishAndEvaluate(nextPairs.length > 0 ? nextPairs : [{ q: spokenSoFar, a: withBoard }]);
      } else {
        setQIndex(nextIdx);
        setCurrentPrompt(turn.nextPrompt || upcomingQuestion);
        speakUtterance(turn.replyText, voiceOn, true);
      }
    } catch {
      if (!upcomingQuestion) {
        await finishAndEvaluate(nextPairs.length > 0 ? nextPairs : [{ q: spokenSoFar, a: withBoard }]);
      } else {
        setQIndex(nextIdx);
        setCurrentPrompt(upcomingQuestion);
        setDialogue((prev) => [...prev, { speaker: 'ai', text: upcomingQuestion }]);
        speakUtterance(upcomingQuestion, voiceOn, true);
      }
    } finally {
      setReplying(false);
    }
  };

  const initials = state.user.name
    .split(/\s+/)
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(
      2,
      '0'
    )}`;

  const lowerAns = answer.toLowerCase();
  const starChecks = {
    Context: /situation|context|when|project|team|sprint|during|am|working|built/.test(lowerAns),
    Goal: /task|goal|owned|needed|problem|role|want|looking/.test(lowerAns),
    Action: /built|implemented|designed|created|fixed|tested|deployed|made/.test(lowerAns),
    Result: /\d|%|fast|better|improved|reduced|increased|helped|learned/.test(lowerAns),
  };

  return (
    <div>
      {/* Image Header Banner */}
      <div className="hero-media-banner">
        <img
          src={interviewStageBanner}
          alt="Virtual Interview Studio"
          referrerPolicy="no-referrer"
          className="hero-bg"
        />
        <div className="hero-media-scrim" />
        <div className="hero-media-content">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="mute font-mono-num" style={{ fontSize: 12, marginBottom: 4 }}>
                VIRTUAL INTERVIEW · TWO-WAY VOICE CALL
              </div>
              <h1 style={{ margin: 0, color: '#ffffff' }}>Virtual Interview Studio</h1>
              <p className="mute" style={{ margin: '4px 0 0', maxWidth: 620 }}>
                Talk naturally with Priya Menon. She greets you by name (&ldquo;Hello {firstName}, how are you?&rdquo;), listens to your voice, replies like a real person, and scores your answers in simple English.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <div
                className="font-mono-num"
                style={{
                  padding: '8px 14px',
                  borderRadius: 14,
                  background: 'rgba(10, 22, 38, 0.72)',
                  border: '1px solid rgba(186, 226, 255, 0.28)',
                  backdropFilter: 'blur(14px)',
                  fontSize: 13,
                }}
              >
                {state.interviews.length} interviews done · {state.readiness}% ready
              </div>
            </div>
          </div>
        </div>
      </div>

      {phase === 'setup' && (
        <div>
          <div className="pn">
            <h2>Start a Virtual Interview</h2>
            <p className="mute" style={{ marginBottom: 12 }}>
              Practice talking aloud like a real video call. Priya greets you warmly first, then asks {length} friendly questions for {state.user.role}.
            </p>
            <div className="g2">
              <label>
                <span className="mute">Interview style</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as InterviewType)}
                >
                  {(Object.keys(INTERVIEW_QUESTIONS) as InterviewType[]).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mute">Job you are practicing for</span>
                <input value={state.user.role} disabled />
              </label>
              <label>
                <span className="mute">Interviewer tone</span>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                >
                  <option value="Friendly Startup Team">Friendly Startup Team (Warm &amp; Practical)</option>
                  <option value="Big Tech Team">Big Tech Team (Clear &amp; Structured)</option>
                  <option value="Product Company">Product Company (Real-world Scenarios)</option>
                </select>
              </label>
              <label>
                <span className="mute">How many questions</span>
                <select
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                >
                  <option value={3}>Greeting + 3 questions (about 8 min)</option>
                  <option value={5}>Greeting + 5 questions (about 15 min)</option>
                </select>
              </label>
              <label>
                <span className="mute">AI voice (Priya speaks aloud)</span>
                <select
                  value={voiceOn ? '1' : '0'}
                  onChange={(e) => setVoiceOn(e.target.value === '1')}
                >
                  <option value="1">On — Both sides speak aloud</option>
                  <option value="0">Off — Text only</option>
                </select>
              </label>
              <label>
                <span className="mute">Hands-free mic after AI speaks</span>
                <select
                  value={autoListen ? '1' : '0'}
                  onChange={(e) => setAutoListen(e.target.value === '1')}
                >
                  <option value="1">On — Automatically turn on my mic</option>
                  <option value="0">Manual — I will click Speak</option>
                </select>
              </label>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 10 }}>
              <button className="p" onClick={startSession}>
                <Mic size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                Start Two-Way Voice Call
              </button>
            </div>
          </div>

          {state.interviews.length > 0 && (
            <div className="pn">
              <h2>Your past interview scores</h2>
              {state.interviews.slice(-8).map((iv) => (
                <ProgressBar
                  key={iv.id}
                  label={iv.type.slice(0, 11)}
                  value={iv.overallScore}
                />
              ))}
              <p className="mute font-mono-num" style={{ marginTop: 8 }}>
                Average{' '}
                {Math.round(
                  state.interviews.reduce((a, b) => a + b.overallScore, 0) /
                    state.interviews.length
                )}{' '}
                out of 100 across {state.interviews.length} session
                {state.interviews.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {phase === 'live' && (
        <div className="pn">
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="chip font-mono-num">
              {qIndex === 0 ? 'Warm Greeting' : `Question ${qIndex} of ${Math.max(1, questions.length - 1)}`}
            </span>
            <span className="chip font-mono-num">{fmtTime(elapsedSec)}</span>
            <button
              onClick={() => {
                const next = !voiceOn;
                setVoiceOn(next);
                if (!next) {
                  window.speechSynthesis?.cancel();
                  setSpeaking(false);
                }
              }}
              style={{ minHeight: 32, padding: '2px 10px', fontSize: 12 }}
            >
              {voiceOn ? (
                <>
                  <Volume2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                  Voice On
                </>
              ) : (
                <>
                  <VolumeX size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
                  Muted
                </>
              )}
            </button>
            <span style={{ flex: 1 }} />
            <button onClick={() => setShowScratchpad((v) => !v)}>
              <Code2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
              {showScratchpad ? 'Hide Notes' : 'Code / Notes Pad'}
            </button>
            <button
              disabled={evaluating}
              onClick={() => finishAndEvaluate(qaPairs)}
            >
              Finish Early
            </button>
          </div>

          <div className="stage">
            <div className="tile" style={{ minHeight: 220 }}>
              <img
                src={priyaAvatar}
                alt="Interviewer Priya Menon"
                referrerPolicy="no-referrer"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: speaking ? '3px solid var(--gold)' : '2px solid var(--gline)',
                  boxShadow: speaking ? '0 0 0 6px color-mix(in srgb, var(--gold) 24%, transparent)' : undefined,
                }}
              />
              {speaking ? (
                <div className="wv">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              ) : (
                <span className="mute" style={{ fontSize: 12 }}>
                  {replying ? 'Priya is thinking…' : 'Listening for your reply'}
                </span>
              )}
              <span className="tag">Priya Menon · Interviewer</span>
            </div>

            <div className="tile" style={{ minHeight: 220 }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                hidden={!camActive}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
              />
              {!camActive && <div className="av">{initials}</div>}
              {dictating && (
                <div className="wv" style={{ position: 'relative', zIndex: 2 }}>
                  {Array.from({ length: 14 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              )}
              <span className="tag">
                {firstName} {dictating ? '· Mic Listening' : ''}
              </span>
            </div>
          </div>

          {/* Live Two-Way Conversation Feed */}
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 16,
              border: '1px solid var(--gline)',
              background: 'var(--soft)',
              maxHeight: 220,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {dialogue.map((turn, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: turn.speaker === 'you' ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  padding: '8px 12px',
                  borderRadius: 14,
                  background:
                    turn.speaker === 'you'
                      ? 'var(--pri)'
                      : 'var(--glass)',
                  color: turn.speaker === 'you' ? 'var(--onpri)' : 'var(--ink)',
                  border: '1px solid var(--line)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginBottom: 2 }}>
                  {turn.speaker === 'ai' ? 'Priya Menon' : firstName}
                </div>
                {turn.text}
              </div>
            ))}
          </div>

          {followUpProbe && (
            <div className="qc" style={{ marginBottom: 10 }}>
              <b style={{ color: 'var(--gold)' }}>Quick Follow-Up:</b> {followUpProbe}
            </div>
          )}
          {coachHint && (
            <div className="qc" style={{ marginBottom: 10 }}>
              <b style={{ color: 'var(--ok)' }}>Simple Tip:</b> {coachHint}
            </div>
          )}

          {/* Friendly 4-part answer checklist */}
          <div className="star-meter" aria-label="Answer checklist">
            {(Object.keys(starChecks) as Array<keyof typeof starChecks>).map((k) => {
              const hit = starChecks[k];
              return (
                <div key={k} className={`star-box ${hit ? 'hit' : ''}`}>
                  <span>{k}</span>
                  <span>{hit ? <Check size={14} /> : 'Waiting'}</span>
                </div>
              );
            })}
          </div>

          {qIndex === 0 && (
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              <span className="mute" style={{ fontSize: 12 }}>Quick replies:</span>
              {[
                `Hi Priya! I'm doing great, thank you. I'm ${firstName} and I am preparing for ${state.user.role} roles.`,
                `Hello! I am doing well today. I have been building projects and practicing coding for interviews.`,
              ].map((quick) => (
                <button
                  key={quick}
                  onClick={() => setAnswer(quick)}
                  style={{ minHeight: 28, padding: '2px 10px', fontSize: 12 }}
                >
                  {quick.slice(0, 48)}…
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                submitAnswer();
              }
            }}
            placeholder={
              qIndex === 0
                ? 'Speak or type your greeting — e.g. "Hi Priya, I am doing well! I am studying..."'
                : 'Speak into your mic or type your answer naturally in simple words…'
            }
          />

          {showScratchpad && (
            <div style={{ marginTop: 10 }}>
              <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>
                Code or Notes Pad (saved with your answer)
              </div>
              <textarea
                className="code-editor"
                style={{ minHeight: 110 }}
                value={scratchpad}
                onChange={(e) => setScratchpad(e.target.value)}
                placeholder="// Write notes, code, or steps here..."
              />
            </div>
          )}

          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={toggleDictation}>
              {dictating ? (
                <>
                  <MicOff size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                  Stop Mic
                </>
              ) : (
                <>
                  <Mic size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                  Speak Answer
                </>
              )}
            </button>
            <button onClick={toggleCamera}>
              {camActive ? 'Camera off' : 'Camera on'}
            </button>
            <button onClick={() => speakUtterance(currentPrompt, true, false)}>
              Hear Again
            </button>
            <button
              disabled={probing}
              onClick={async () => {
                if (answer.trim().split(/\s+/).length < 4) {
                  onToast('Say or write a sentence first to get a follow-up question');
                  return;
                }
                setProbing(true);
                try {
                  const res = await api.getInterviewFollowUp({
                    type,
                    question: currentPrompt,
                    answer: answer.trim(),
                  });
                  setFollowUpProbe(res.followUp);
                  if (voiceOn) speakUtterance(res.followUp, true, true);
                } catch (err: any) {
                  onToast(err.message || 'Follow-up unavailable');
                } finally {
                  setProbing(false);
                }
              }}
            >
              {probing ? 'Thinking…' : 'Ask Follow-up'}
            </button>
            <button
              disabled={hintBusy}
              onClick={async () => {
                setHintBusy(true);
                try {
                  const res = await api.getInterviewCoachHint({
                    type,
                    persona,
                    question: currentPrompt,
                    currentAnswer: answer,
                  });
                  setCoachHint(res.hint);
                  if (!answer.trim()) {
                    setAnswer(res.starDraft);
                  }
                } catch (err: any) {
                  onToast(err.message || 'Tip unavailable');
                } finally {
                  setHintBusy(false);
                }
              }}
            >
              <Sparkles size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
              {hintBusy ? 'Helping…' : 'Help Me Answer'}
            </button>
            <span style={{ flex: 1 }} />
            <button
              className="p"
              disabled={evaluating || replying}
              onClick={() => submitAnswer()}
            >
              <Send size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
              {replying
                ? 'Priya is replying…'
                : evaluating
                  ? 'Creating report…'
                  : qIndex + 1 >= questions.length
                    ? 'Send & Finish Interview'
                    : 'Send & Hear Priya Reply'}
            </button>
          </div>
        </div>
      )}

      {phase === 'report' && report && (
        <div>
          <div className="g2">
            <div className="pn row">
              <Ring percent={report.overallScore} size={130} />
              <div>
                <h2>Interview report</h2>
                <p className="mute">
                  {report.overallScore >= 75
                    ? 'Strong, interview-ready performance'
                    : report.overallScore >= 55
                      ? 'Solid base with clear improvements available'
                      : 'Keep practising. Focus on one area at a time'}
                </p>
              </div>
            </div>
            <div className="pn">
              <h2>Competencies</h2>
              {(Object.keys(report.breakdown) as Array<keyof InterviewScore>).map(
                (k) => (
                  <ProgressBar
                    key={k}
                    label={k.split(' ')[0]}
                    value={report.breakdown[k]}
                  />
                )
              )}
            </div>
          </div>

          {report.summaryFeedback && (
            <div className="pn">
              <h2>Summary</h2>
              <p>{report.summaryFeedback}</p>
            </div>
          )}

          <div className="pn">
            <h2>Question review</h2>
            {report.reviews.map((r, i) => {
              const avg = Math.round(
                (r.s.Communication +
                  r.s.Structure +
                  r.s['Relevance and depth'] +
                  r.s.Confidence) /
                  4
              );
              return (
                <div key={i} className="step">
                  <div className="dot" />
                  <div>
                    <h3>
                      {i + 1}. {r.q}
                    </h3>
                    <span className="mute">
                      {r.w} words · {r.tip}
                    </span>
                  </div>
                  <span className="chip font-mono-num">{avg}</span>
                </div>
              );
            })}
          </div>

          <div className="row">
            <button className="p" onClick={() => setPhase('setup')}>
              New session
            </button>
            <button onClick={() => onNavigate('roadmap')}>Back to roadmap</button>
          </div>
        </div>
      )}
    </div>
  );
}

const ALL_ROLES: TargetRole[] = [
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'ML Engineer',
  'Backend Developer',
];

export function PivotView({
  state,
  onSetGoal,
}: {
  state: AppState;
  onSetGoal: (role: TargetRole) => void;
}) {
  const defaultTarget =
    state.user.role === 'Data Analyst' ? 'Full Stack Developer' : 'Data Analyst';
  const [targetRole, setTargetRole] = useState<TargetRole>(defaultTarget);
  const [diff, setDiff] = useState<PivotDiff | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPivotDiff(targetRole)
      .then((res) => {
        if (!cancelled) setDiff(res.diff);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, [targetRole, state.user.role, state.readiness]);

  return (
    <div>
      <h1>Career pivot</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Compare {state.user.role} with any target path using your live SQLite Skill Twin.
      </p>

      <div className="opts">
        {ALL_ROLES.filter((r) => r !== state.user.role).map((r) => (
          <button
            key={r}
            className={`opt ${targetRole === r ? 'on' : ''}`}
            onClick={() => setTargetRole(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {diff && (
        <>
          <div className="g2">
            <div className="pn">
              <h3>Transfers</h3>
              <div style={{ marginTop: 8 }}>
                {diff.transfers.length > 0 ? (
                  diff.transfers.map((x) => (
                    <span key={x} className="chip o">
                      {x}
                    </span>
                  ))
                ) : (
                  <span className="mute">None yet</span>
                )}
              </div>
            </div>
            <div className="pn">
              <h3>Partly useful</h3>
              <div style={{ marginTop: 8 }}>
                {diff.partlyUseful.length > 0 ? (
                  diff.partlyUseful.map((x) => (
                    <span key={x} className="chip">
                      {x}
                    </span>
                  ))
                ) : (
                  <span className="mute">None</span>
                )}
              </div>
            </div>
            <div className="pn">
              <h3>New skills</h3>
              <div style={{ marginTop: 8 }}>
                {diff.newSkills.length > 0 ? (
                  diff.newSkills.map((x) => (
                    <span key={x} className="chip g">
                      {x}
                    </span>
                  ))
                ) : (
                  <span className="mute">None</span>
                )}
              </div>
            </div>
            <div className="pn">
              <h3>No longer needed</h3>
              <div style={{ marginTop: 8 }}>
                {diff.noLongerNeeded.length > 0 ? (
                  diff.noLongerNeeded.map((x) => (
                    <span key={x} className="chip">
                      {x}
                    </span>
                  ))
                ) : (
                  <span className="mute">None</span>
                )}
              </div>
            </div>
          </div>

          <div className="pn">
            <p className="mute">{diff.insight}</p>
            <p className="font-mono-num">
              Estimated <b>{diff.overlapPercent}%</b> of the {diff.toRole} path is already
              covered, saving about <b>{diff.hoursSaved} hours</b>.
            </p>
            <button className="p" onClick={() => onSetGoal(diff.toRole)}>
              Switch to {diff.toRole}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AchievementsView({ state }: { state: AppState }) {
  const u = state.user;
  const dsaCount = state.dsaSolved.length;

  const badgeCatalog: Array<[string, string, boolean]> = [
    ['First steps', 'Complete your profile', !!u.prof],
    ['Problem solver', 'Solve 5 DSA problems', dsaCount >= 5],
    ['DSA grinder', 'Solve 15 DSA problems', dsaCount >= 15],
    ['Aptitude ace', 'Score 8 or more on the aptitude test', u.aptitudeBest >= 8],
    ['Interview ready', 'Finish a mock interview', state.interviews.length >= 1],
    ['Deep focus', 'Complete 5 focus sessions', u.focus.sessions >= 5],
    ['Stage clearer', 'Clear 3 stages on the path', u.stage >= 3],
    ['Builder', 'Finish a portfolio project', u.completedProjects.length >= 1],
    ['Connector', 'Schedule a mock meeting', state.meetings.length > 0],
    ['Level 3', 'Reach level 3', u.level >= 3],
    ['Consistent', 'Visit 3 days in a row', u.streak.count >= 3],
  ];

  const unlockedCount = badgeCatalog.filter(([, , ok]) => ok).length;

  return (
    <div>
      <h1>Achievements</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Unlock badges as you practise.
      </p>

      <div className="g2">
        <div className="pn row">
          <Ring
            percent={Math.round((unlockedCount / badgeCatalog.length) * 100)}
            size={110}
          />
          <div>
            <h2>
              {unlockedCount} of {badgeCatalog.length} unlocked
            </h2>
            <p className="mute font-mono-num">
              Streak: {u.streak.count} day{u.streak.count > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="pn">
          <h2>Your stats</h2>
          <ProgressBar label="DSA" value={Math.round((dsaCount / 21) * 100)} />
          <ProgressBar label="Aptitude" value={u.aptitudeBest * 10} />
          <ProgressBar
            label="Focus"
            value={Math.min(100, u.focus.sessions * 10)}
          />
        </div>
      </div>

      <div className="g2">
        {badgeCatalog.map(([name, desc, ok]) => (
          <div key={name} className="pn" style={{ opacity: ok ? 1 : 0.52 }}>
            <h3>
              {ok ? '✓ ' : ''}
              {name}
            </h3>
            <p className="mute" style={{ marginTop: 4, marginBottom: 0 }}>
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const AGENT_TOOLS = ['SQLite RAG', 'Skill Twin BKT', 'Resume & ATS', 'Open Jobs'];

export function AgentsView({
  state,
  onReplan,
  onStateUpdate,
  onToast,
}: {
  state: AppState;
  onReplan: () => Promise<void>;
  onStateUpdate?: (s: AppState) => void;
  onToast?: (msg: string) => void;
}) {
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState<AgentAuditResult | null>(null);

  const [agentName, setAgentName] = useState('FAANG Readiness Strategist');
  const [roleFocus, setRoleFocus] = useState<string>(state.user.role);
  const [mission, setMission] = useState(
    'Audit my weakest BKT skill, missing ATS keywords, and rank 3 weekly drills to maximize job fit.'
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(['SQLite RAG', 'Skill Twin BKT', 'Resume & ATS']);
  const [runningCustom, setRunningCustom] = useState(false);
  const [customResult, setCustomResult] = useState<CustomAgentRunResult | null>(null);

  const runAudit = async () => {
    if (auditing) return;
    setAuditing(true);
    try {
      const res = await api.runAgentAudit();
      setAudit(res.audit);
      onStateUpdate?.(res.state);
      onToast?.('Multi-Agent Audit complete (+15 XP)');
    } catch (err: any) {
      onToast?.(err.message || 'Multi-Agent Audit failed');
    } finally {
      setAuditing(false);
    }
  };

  const handleBuildAndRun = async () => {
    if (!agentName.trim() || !mission.trim() || runningCustom) return;
    setRunningCustom(true);
    try {
      const res = await api.runCustomAgent({
        name: agentName.trim(),
        roleFocus,
        mission: mission.trim(),
        tools: selectedTools,
      });
      setCustomResult(res.result);
      onStateUpdate?.(res.state);
      onToast?.(`Built & executed ${agentName.trim()} (+25 XP)`);
    } catch (err: any) {
      onToast?.(err.message || 'Custom agent failed');
    } finally {
      setRunningCustom(false);
    }
  };

  const pipelineNodes = [
    { step: '01', name: 'Profiler', desc: 'Voice & goal intake' },
    { step: '02', name: 'Gap Analyst', desc: 'BKT skill deficit map' },
    { step: '03', name: 'Planner ⇄ Critic', desc: 'DAG prerequisite guard' },
    { step: '04', name: 'Curator', desc: 'Grounded study links' },
    { step: '05', name: 'Resume Verifier', desc: 'Honest (learning) tags' },
    { step: '06', name: 'Auto-Applier', desc: 'Tailors & submits jobs' },
  ];

  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <h1 style={{ flex: 1 }}>Build AI Agents &amp; Orchestration Studio</h1>
        <button disabled={auditing} onClick={runAudit}>
          {auditing ? 'Running 3-Agent Audit…' : 'Run 3-Agent Audit (+15 XP)'}
        </button>
        <button className="p" onClick={onReplan}>
          Run Replan Debate
        </button>
      </div>
      <p className="mute" style={{ marginBottom: 16 }}>
        Positioned above AI Mentor — inspect the 6-agent pipeline graphic, run Gemini audits, or build and execute your own SQLite-persisted AI Agents grounded in RAG.
      </p>

      {/* Full Graphic 6-Agent Workflow */}
      <div className="pn">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>6-Agent Orchestration Graph</h2>
          <span className="mute font-mono-num">
            Roadmap v{state.user.roadmapVersion} · {state.agentDebate.length} debate turns
          </span>
        </div>
        <div className="agent-flow">
          {pipelineNodes.map((n) => (
            <div key={n.name} className="agent-node">
              <div className="mute font-mono-num" style={{ fontSize: 11, color: 'var(--gold)' }}>
                {n.step} · AGENT
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{n.name}</div>
              <div className="mute" style={{ fontSize: 12 }}>{n.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom AI Agent Builder ("Make Agents") */}
      <div className="pn glass-hero">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <Bot size={18} style={{ color: 'var(--gold)' }} />
            <h2 style={{ margin: 0 }}>Make Your Own AI Agent (Gemini + SQLite)</h2>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {[
              ['FAANG Readiness Strategist', 'Rank missing ATS & DSA gaps against FAANG benchmarks.'],
              ['Portfolio & GitHub Critic', 'Critique resume experience bullets into high-impact XYZ metrics.'],
              ['System Design Mentor', 'Design a 7-day SQL + React architecture study plan grounded in RAG.'],
            ].map(([presetName, presetMission]) => (
              <button
                key={presetName}
                onClick={() => {
                  setAgentName(presetName);
                  setMission(presetMission);
                }}
                style={{ minHeight: 30, padding: '2px 10px', fontSize: 12 }}
              >
                {presetName.split(' ')[0]} Preset
              </button>
            ))}
          </div>
        </div>

        <div className="g2" style={{ marginBottom: 10 }}>
          <label>
            <span className="mute">Agent Name</span>
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Frontend Interview Sniper"
            />
          </label>
          <label>
            <span className="mute">Target Role Focus</span>
            <input
              value={roleFocus}
              onChange={(e) => setRoleFocus(e.target.value)}
              placeholder="Frontend Engineer"
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <span className="mute">Agent Mission &amp; Reasoning Goal</span>
          <textarea
            rows={2}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Describe what this agent should inspect, verify, and synthesize for you…"
          />
        </label>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="mute" style={{ fontSize: 12.5 }}>Connected Tools:</span>
            {AGENT_TOOLS.map((tool) => {
              const on = selectedTools.includes(tool);
              return (
                <button
                  key={tool}
                  className={`opt ${on ? 'on' : ''}`}
                  onClick={() =>
                    setSelectedTools((prev) =>
                      on ? prev.filter((x) => x !== tool) : [...prev, tool]
                    )
                  }
                  style={{ minHeight: 30, padding: '2px 12px', fontSize: 12 }}
                >
                  {tool}
                </button>
              );
            })}
          </div>
          <button className="p" disabled={runningCustom} onClick={handleBuildAndRun}>
            <Wand2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            {runningCustom ? 'Running Agent…' : 'Create & Run Agent (+25 XP)'}
          </button>
        </div>

        {customResult && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--line)',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <b style={{ color: 'var(--gold)' }}>{customResult.agent.name} Output</b>
              <span className="mute font-mono-num" style={{ fontSize: 12 }}>
                Sources: {customResult.ragSourcesUsed.join(', ')}
              </span>
            </div>
            <p style={{ marginBottom: 8 }}>{customResult.verdict}</p>
            {customResult.actions.map((act, i) => (
              <div key={i} className="step" style={{ padding: '6px 4px' }}>
                <span className="font-mono-num" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                  0{i + 1}
                </span>
                <span>{act}</span>
                <span />
              </div>
            ))}
          </div>
        )}

        {state.customAgents.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 8 }}>Your Saved AI Agents ({state.customAgents.length})</h3>
            {state.customAgents.map((a) => (
              <div key={a.id} className="rr">
                <div>
                  <b>{a.name}</b> <span className="mute">· {a.roleFocus} · {a.tools.join(', ')}</span>
                  <div className="mute" style={{ fontSize: 12.5, marginTop: 2 }}>{a.lastOutput}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    onClick={() => {
                      setAgentName(a.name);
                      setRoleFocus(a.roleFocus);
                      setMission(a.mission);
                      setSelectedTools(a.tools);
                    }}
                  >
                    Load
                  </button>
                  <button
                    aria-label="Delete agent"
                    onClick={async () => {
                      const res = await api.deleteCustomAgent(a.id);
                      onStateUpdate?.(res.state);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {audit && (
        <div className="pn">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Latest Multi-Agent Workspace Audit</h2>
            <span className="mute font-mono-num">
              {audit.usedGemini ? 'Gemini 3-Agent Audit' : 'Deterministic Audit'}
            </span>
          </div>
          <p style={{ marginBottom: 10 }}>{audit.summary}</p>
          {audit.findings.map((f, i) => (
            <div key={i} className="step">
              <span className={`chip ${f.status === 'pass' ? 'o' : 'g'}`}>{f.agent}</span>
              <div>
                <p style={{ margin: 0 }}>{f.detail}</p>
              </div>
              <span className="mute font-mono-num">{f.status.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {state.agentDebate.length > 0 && (
        <div className="pn">
          <h2>Planner ⇄ Critic debate transcript</h2>
          {state.agentDebate
            .slice()
            .reverse()
            .slice(0, 12)
            .map((turn) => (
              <div key={turn.id} className="step">
                <span className="chip">{turn.speaker}</span>
                <div>
                  <span className="mute font-mono-num">
                    Roadmap v{turn.roadmapVersion} · Round {turn.round}
                  </span>
                  <p style={{ margin: '2px 0 0' }}>{turn.message}</p>
                </div>
                <span />
              </div>
            ))}
        </div>
      )}

      <div className="pn">
        <h2>Decision log</h2>
        {state.agentLogs
          .slice()
          .reverse()
          .map((log) => (
            <p key={log.id}>
              <b>{log.agent}</b>: {log.message}
            </p>
          ))}
      </div>
    </div>
  );
}

