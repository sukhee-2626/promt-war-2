import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  CERTIFICATIONS,
  INTERVIEW_QUESTIONS,
  PORTFOLIO_PROJECTS,
  SKILL_META,
  TRACKER_STAGES,
} from '../lib/catalog';
import type {
  AppState,
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
  onNavigate,
}: {
  state: AppState;
  onSaveResume: (resume: {
    name: string;
    summary: string;
    skills: string;
    experience: string;
  }) => Promise<void>;
  onNavigate: (screen: string) => void;
}) {
  const [form, setForm] = useState(state.resume);
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

  const bullets = form.experience.split('\n').filter(Boolean);

  return (
    <div>
      <h1>Resume studio</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Edit on the left. Saved to SQLite and scored against ATS keywords as you type.
      </p>

      <div className="row" style={{ marginBottom: 14 }}>
        <span className="pill" id="pill">
          ATS {state.ats.score}
        </span>
        <button onClick={() => onNavigate('ats')}>Open ATS lab</button>
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
}: {
  state: AppState;
  onAddKeyword: (kw: string) => Promise<void>;
}) {
  const { ats } = state;
  return (
    <div>
      <h1>ATS lab</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Keywords come from 7,309 Full Stack postings (June 2026): TypeScript, Docker and AWS added.
        Real systems vary.
      </p>

      <div className="g2">
        <div className="pn row">
          <Ring percent={ats.score} size={130} />
          <div>
            <h2>Score</h2>
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
}: {
  state: AppState;
  onTailorResume: (jobId: string) => Promise<void>;
  onApplyJob: (jobId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <div>
      <h1>Job matches</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Fit is calculated from your SQLite skill twin.
      </p>

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
  const [length, setLength] = useState(3);
  const [voiceOn, setVoiceOn] = useState(true);

  const [questions, setQuestions] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
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

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const stopMedia = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    if (srRef.current) {
      try {
        srRef.current.stop();
      } catch {
        // ignore
      }
      srRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamActive(false);
    setDictating(false);
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

  const speakQuestion = (qText: string, enabled = voiceOn) => {
    setSpeaking(true);
    try {
      window.speechSynthesis.cancel();
      if (!enabled) throw new Error('voice off');
      const u = new SpeechSynthesisUtterance(qText);
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setTimeout(() => setSpeaking(false), 1800);
    }
  };

  const startSession = () => {
    const qs = INTERVIEW_QUESTIONS[type].slice(0, length);
    setQuestions(qs);
    setQIndex(0);
    setAnswer('');
    setQaPairs([]);
    setElapsedSec(0);
    setPhase('live');
    speakQuestion(qs[0], voiceOn);
  };

  const toggleCamera = () => {
    if (!navigator.mediaDevices) {
      onToast('Camera not supported here');
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
      .catch(() => onToast('Camera unavailable or blocked'));
  };

  const toggleDictation = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      onToast('Dictation isn’t supported in this browser. Please type your answer.');
      return;
    }
    if (srRef.current) {
      srRef.current.stop();
      srRef.current = null;
      setDictating(false);
      return;
    }
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
      onToast('Microphone unavailable or blocked');
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

  const submitAnswer = async () => {
    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    if (words < 8) {
      onToast('Add a little more detail first');
      return;
    }
    const nextPairs = [...qaPairs, { q: questions[qIndex], a: answer.trim() }];
    setQaPairs(nextPairs);
    setAnswer('');

    if (qIndex + 1 >= questions.length) {
      await finishAndEvaluate(nextPairs);
    } else {
      const nextIdx = qIndex + 1;
      setQIndex(nextIdx);
      speakQuestion(questions[nextIdx], voiceOn);
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

  return (
    <div>
      <h1>Virtual interview</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        A realistic mock session with AI Hiring Manager Priya Menon. Gemini evaluates your answers
        and saves your progress.
      </p>

      {phase === 'setup' && (
        <div>
          <div className="pn">
            <h2>Session setup</h2>
            <div className="g2">
              <label>
                <span className="mute">Interview type</span>
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
                <span className="mute">Target role</span>
                <input value={state.user.role} disabled />
              </label>
              <label>
                <span className="mute">Length</span>
                <select
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                >
                  <option value={3}>3 questions · about 10 min</option>
                  <option value={5}>5 questions · about 20 min</option>
                </select>
              </label>
              <label>
                <span className="mute">Interviewer voice</span>
                <select
                  value={voiceOn ? '1' : '0'}
                  onChange={(e) => setVoiceOn(e.target.value === '1')}
                >
                  <option value="1">On</option>
                  <option value="0">Off</option>
                </select>
              </label>
            </div>
            <p className="mute" style={{ marginTop: 10 }}>
              You will be scored on communication, structure, relevance and confidence. Camera and
              microphone are optional.
            </p>
            <button className="p" onClick={startSession}>
              Start session
            </button>
          </div>

          {state.interviews.length > 0 && (
            <div className="pn">
              <h2>Your progress</h2>
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
                across {state.interviews.length} session
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
              Question {qIndex + 1} of {questions.length}
            </span>
            <span className="chip font-mono-num">{fmtTime(elapsedSec)}</span>
            <span style={{ flex: 1 }} />
            <button
              disabled={evaluating}
              onClick={() => finishAndEvaluate(qaPairs)}
            >
              End session
            </button>
          </div>

          <div className="stage">
            <div className="tile">
              <div className="av">PM</div>
              {speaking && (
                <div className="wv">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              )}
              <span className="tag">Priya Menon · Hiring Manager, Brightwave</span>
            </div>

            <div className="tile">
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
              <span className="tag">You</span>
            </div>
          </div>

          <div className="qc">
            <span className="mute">{type} question</span>
            <h3 style={{ marginTop: 4 }}>{questions[qIndex]}</h3>
          </div>

          <textarea
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer, or use dictation…"
          />

          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={toggleDictation}>
              {dictating ? 'Stop dictation' : 'Dictate answer'}
            </button>
            <button onClick={toggleCamera}>
              {camActive ? 'Camera off' : 'Camera'}
            </button>
            <button onClick={() => speakQuestion(questions[qIndex], voiceOn)}>
              Repeat question
            </button>
            <span style={{ flex: 1 }} />
            <button className="p" disabled={evaluating} onClick={submitAnswer}>
              {evaluating ? 'Scoring with Gemini…' : 'Submit answer'}
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

export function AgentsView({
  state,
  onReplan,
}: {
  state: AppState;
  onReplan: () => Promise<void>;
}) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <h1 style={{ flex: 1 }}>Agent activity</h1>
        <button className="p" onClick={onReplan}>
          Run agents: refresh roadmap
        </button>
      </div>
      <p className="mute" style={{ marginBottom: 16 }}>
        Transparent SQLite-persisted log of Planner ⇄ Critic debates and agent decisions.
      </p>

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
