import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Database,
  Map,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../lib/api';
import { ONBOARDING_INTERESTS } from '../lib/catalog';
import type { OnboardingRecommendation, UserProfile } from '../types';
import { BrandLogo, ProgressBar } from './UiPrimitives';

type PreviewTab = 'roadmap' | 'agents' | 'interview' | 'mentor';

const SHOWCASE_TABS: Array<{
  id: PreviewTab;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  kicker: string;
  title: string;
  summary: string;
  bullets: string[];
  previewTitle: string;
  previewLine1: string;
  previewLine2: string;
}> = [
  {
    id: 'roadmap',
    label: 'My Roadmap',
    icon: Map,
    kicker: 'Voice Onboarding → Personalized Plan',
    title: 'A step-by-step career plan built around your schedule',
    summary:
      'Speak or pick your goals once. place1ai compares top tech paths, recommends your strongest match, and lays out clear weekly milestones.',
    bullets: [
      'Voice onboarding listens and finds your best-fit role',
      'Weekly hours paced realistically around your life',
      'Interactive guided tour walks you through every tool',
    ],
    previewTitle: 'Sample Week 1–4 Plan',
    previewLine1: '01 · JavaScript & DOM Foundations (8h)',
    previewLine2: '02 · React Components & Hooks Project (12h)',
  },
  {
    id: 'agents',
    label: 'Build Agents',
    icon: Bot,
    kicker: 'Custom Helpers in Plain English',
    title: 'Create your own AI career helpers in one click',
    summary:
      'Build custom AI agents for interview prep, project ideas, or resume checks — each connected to your saved skills and notes.',
    bullets: [
      'Choose a role focus and describe what you want checked',
      'Runs personalized checks using your saved notes and skills',
      'Save unlimited helpers and re-run anytime',
    ],
    previewTitle: 'Active Custom Agent',
    previewLine1: 'Frontend Coach · Reviews my weak React & CSS topics',
    previewLine2: 'Next Step · Complete 2 React hooks coding challenges',
  },
  {
    id: 'interview',
    label: 'Voice Interview',
    icon: Mic,
    kicker: 'Two-Way Human Conversation',
    title: 'Practice speaking face-to-face with Hiring Manager Priya',
    summary:
      'Priya greets you by name, asks how you are doing, listens to your microphone, and replies out loud with helpful feedback.',
    bullets: [
      'Natural warm conversation — not robotic Q&A cards',
      'Live tips and sample answers whenever you get stuck',
      'Clear 4-part score report on Clarity, Depth, Structure & Confidence',
    ],
    previewTitle: 'Live Call Preview · Priya Menon',
    previewLine1: '“Hello Alex! Nice to meet you today. How are you doing?”',
    previewLine2: 'Two-way voice loop · Camera preview · Instant feedback',
  },
  {
    id: 'mentor',
    label: 'AI Mentor',
    icon: Database,
    kicker: 'Answers Grounded in Your Notes',
    title: 'Ask questions anytime and attach real job descriptions',
    summary:
      'Paste job postings or study notes so your AI Study Mentor answers with exact citations instead of generic guesses.',
    bullets: [
      'Paste any job description to tailor study advice',
      'See exactly which saved note or resume section was used',
      'Available from the corner button in every screen',
    ],
    previewTitle: 'Grounded Answer Example',
    previewLine1: 'Used: Your Frontend Resume + Target JD (Relevance 96%)',
    previewLine2: '“Focus on TypeScript interfaces and React state first.”',
  },
];

export function SignInModal({
  loading,
  onSignIn,
}: {
  loading: boolean;
  onSignIn: (name?: string, email?: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [activePreview, setActivePreview] = useState<PreviewTab>('roadmap');

  const handleSubmit = (fallbackName?: string, fallbackEmail?: string) => {
    if (loading) return;
    onSignIn(
      name.trim() || fallbackName,
      email.trim() || fallbackEmail || undefined
    );
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const activeTab =
    SHOWCASE_TABS.find((t) => t.id === activePreview) || SHOWCASE_TABS[0];

  return (
    <div className="entry-shell">
      <div className="entry-grid">
        {/* Left Column: Clean Spacious Sign-In */}
        <div
          className="pn login-card"
          onPointerMove={handlePointerMove}
          style={{
            margin: 0,
            padding: '32px 30px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 18,
          }}
        >
          <div>
            <div className="login-orbit">
              <span className="login-orbit-ring" aria-hidden="true" />
              <span className="login-orbit-ring inner" aria-hidden="true" />
              <div style={{ width: 44, height: 44, color: 'var(--ink)' }}>
                <BrandLogo />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h1 style={{ margin: '0 0 6px', fontSize: 30, lineHeight: 1.15 }}>
                place1ai
              </h1>
              <p className="mute" style={{ fontSize: 15, margin: 0, lineHeight: 1.5 }}>
                Land your next tech role with a personal AI career coach, voice interview studio, and live coding practice.
              </p>
            </div>

            <button
              className="p"
              disabled={loading}
              onClick={() => handleSubmit('Alex Rivera', 'alex@place1ai.demo')}
              style={{ width: '100%', minHeight: 50, fontSize: 15.5, marginBottom: 14 }}
            >
              <Sparkles
                size={16}
                style={{ display: 'inline', marginRight: 8, verticalAlign: '-2px' }}
              />
              {loading ? 'Opening Workspace…' : 'Try Live Demo Workspace'}
            </button>

            <div
              className="mute"
              style={{
                fontSize: 12.5,
                textAlign: 'center',
                margin: '14px 0',
                borderTop: '1px solid var(--line)',
                paddingTop: 14,
              }}
            >
              Or enter your name to personalize your workspace
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="Your first & last name"
                autoComplete="name"
                aria-label="Full name"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="Email (optional, saves your progress)"
                autoComplete="email"
                aria-label="Email"
              />
              <button
                disabled={loading}
                onClick={() => handleSubmit()}
                style={{ width: '100%', minHeight: 46, fontWeight: 600 }}
              >
                {loading ? 'Starting…' : 'Continue & Build My Roadmap'}
              </button>
            </div>
          </div>

          <div
            className="row"
            style={{
              gap: 10,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              justifyContent: 'space-between',
            }}
          >
            <button
              disabled={loading}
              onClick={() => handleSubmit('Alex Rivera', 'alex@place1ai.demo')}
              style={{ flex: 1, fontSize: 13 }}
            >
              Demo: Alex (Frontend)
            </button>
            <button
              disabled={loading}
              onClick={() => handleSubmit('Asha Rao', 'asha@place1ai.demo')}
              style={{ flex: 1, fontSize: 13 }}
            >
              Demo: Asha (Full Stack)
            </button>
          </div>
        </div>

        {/* Right Column: Clean Interactive Feature Showcase */}
        <div
          className="pn"
          onPointerMove={handlePointerMove}
          style={{
            margin: 0,
            padding: '32px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
              Inside Your Workspace
            </span>
            <span className="mute" style={{ fontSize: 12.5 }}>
              Simple · Interactive · Saves Automatically
            </span>
          </div>

          <div className="preview-tabs">
            {SHOWCASE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isOn = activePreview === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`opt ${isOn ? 'on' : ''}`}
                  onClick={() => setActivePreview(tab.id)}
                  style={{ minHeight: 38, padding: '6px 14px', fontSize: 13.5 }}
                >
                  <Icon
                    size={15}
                    style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              padding: '22px',
              borderRadius: 18,
              border: '1px solid var(--gline)',
              background: 'var(--soft)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div className="mute" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gold)' }}>
              {activeTab.kicker}
            </div>
            <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.25 }}>{activeTab.title}</h2>
            <p className="mute" style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
              {activeTab.summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
              {activeTab.bullets.map((item) => (
                <div key={item} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--ok)', flex: 'none' }} />
                  <span style={{ fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--pan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div>
                <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>
                  {activeTab.previewTitle}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>
                  {activeTab.previewLine1}
                </div>
                <div className="mute" style={{ fontSize: 12.5 }}>
                  {activeTab.previewLine2}
                </div>
              </div>
              {activePreview === 'interview' && (
                <div className="wv" aria-hidden="true" style={{ flex: 'none' }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              fontSize: 12.5,
              paddingTop: 10,
              borderTop: '1px solid var(--line)',
            }}
          >
            <span>Personal Roadmap</span>
            <span>Two-Way Voice Interview</span>
            <span>Skill &amp; Progress Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LEVELS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'Beginner', label: 'Just Starting', desc: 'Learning fundamentals' },
  { key: 'Intermediate', label: 'Some Experience', desc: 'Built a few projects' },
  { key: 'Advanced', label: 'Experienced', desc: 'Ready for interview polish' },
  { key: 'Switcher', label: 'Changing Careers', desc: 'Moving into tech' },
];
const HOURS = [4, 8, 12, 20];
const NEEDS = [
  'Skills roadmap',
  'Resume and ATS',
  'Interview practice',
  'Job matching',
  'Learning resources',
];

export function OnboardingModal({
  initialName,
  initialProfile,
  saving,
  onSave,
  onCancel,
  onToast,
}: {
  initialName?: string;
  initialProfile: UserProfile | null;
  saving: boolean;
  onSave: (profile: UserProfile, updatedName?: string) => void;
  onCancel?: () => void;
  onToast: (msg: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<OnboardingRecommendation | null>(null);
  const [displayName, setDisplayName] = useState(
    initialName && initialName !== 'Guest' ? initialName : ''
  );
  const srRef = useRef<any>(null);

  const [prof, setProf] = useState<UserProfile>(
    initialProfile || {
      int: [],
      lvl: 'Beginner',
      hrs: 8,
      needs: [],
      goal: '',
    }
  );

  const speakPrompt = (text: string, force = false) => {
    if (!voiceOn && !force) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  };

  useEffect(() => {
    const first = displayName.trim().split(/\s+/)[0] || 'there';
    const stepPrompts = [
      `Hi ${first}! Welcome to place1ai. Tell me or speak your background and dream job, and I will find your best roadmap.`,
      'Got it. Now choose your experience level and how many hours a week you want to study.',
      'Here is your personalized roadmap match. Click Launch My Roadmap to view your plan and start a quick guided tour.',
    ];
    speakPrompt(stepPrompts[step]);
    return () => {
      try {
        window.speechSynthesis.cancel();
        srRef.current?.stop();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggleVoiceListen = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      onToast('Microphone voice input is unavailable here — please type or click a preset below.');
      return;
    }
    if (srRef.current) {
      srRef.current.stop();
      srRef.current = null;
      setListening(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.lang = 'en-US';
    r.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      if (text) {
        setProf((p) => ({ ...p, goal: `${p.goal ? p.goal + ' ' : ''}${text}`.trim() }));
      }
    };
    r.onend = () => {
      srRef.current = null;
      setListening(false);
    };
    r.onerror = () => {
      srRef.current = null;
      setListening(false);
      onToast('Microphone unavailable');
    };
    srRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      srRef.current = null;
      setListening(false);
    }
  };

  const toggleArr = (key: 'int' | 'needs', val: string) => {
    setProf((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(val) ? list.filter((x) => x !== val) : [...list, val],
      };
    });
  };

  const findBestRoadmap = async () => {
    if (recommending) return;
    setRecommending(true);
    try {
      const res = await api.recommendOnboardingRoadmap({
        transcript: prof.goal,
        interests: prof.int,
        level: prof.lvl,
        hours: prof.hrs,
      });
      setRecommendation(res.recommendation);
      speakPrompt(res.recommendation.spokenPitch);
    } catch (err: any) {
      onToast(err.message || 'Could not compute roadmap recommendation');
    } finally {
      setRecommending(false);
    }
  };

  const next = async () => {
    if (step === 0 && prof.int.length === 0 && !prof.goal.trim()) {
      onToast('Pick at least one area or tell us your goal');
      return;
    }
    if (step < 2) {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep === 2 && !recommendation) {
        await findBestRoadmap();
      }
    } else {
      onSave(
        {
          ...prof,
          int: prof.int.length > 0 ? prof.int : ['fe'],
        },
        displayName.trim() || undefined
      );
    }
  };

  const stepLabels = ['1. Your Goal', '2. Pace & Focus', '3. Best Roadmap'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--bg) 52%, transparent)',
        backdropFilter: 'blur(26px)',
        padding: 20,
      }}
    >
      <div
        className="pn glass-hero"
        style={{
          width: 'min(740px, 100%)',
          margin: 0,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px 30px',
          gap: 18,
        }}
      >
        {/* Header */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            paddingBottom: 14,
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className="row" style={{ gap: 12 }}>
            <div style={{ width: 30, height: 30, color: 'var(--gold)' }}>
              <BrandLogo />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                Voice Onboarding &amp; Roadmap Finder
              </div>
              <div className="mute" style={{ fontSize: 12.5 }}>
                {speaking
                  ? 'Speaking instructions aloud…'
                  : '3 quick steps to build your roadmap and tour'}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {speaking && (
              <div className="wv" aria-hidden="true" style={{ height: 20 }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            )}
            <button
              onClick={() => {
                const nextV = !voiceOn;
                setVoiceOn(nextV);
                if (!nextV) {
                  window.speechSynthesis.cancel();
                  setSpeaking(false);
                } else {
                  speakPrompt(
                    recommendation?.spokenPitch ||
                      'Voice guidance turned on. Tell me your dream job or pick your interests.',
                    true
                  );
                }
              }}
              style={{ minHeight: 36, padding: '4px 14px', fontSize: 12.5 }}
            >
              {voiceOn ? (
                <>
                  <Volume2 size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                  Voice On
                </>
              ) : (
                <>
                  <VolumeX size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                  Muted
                </>
              )}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                style={{ minHeight: 36, padding: '4px 14px', fontSize: 12.5 }}
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Clean 3-Step Indicator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {stepLabels.map((lbl, i) => (
            <div key={lbl}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: i === step ? 700 : 500,
                  color: i <= step ? 'var(--ink)' : 'var(--mute)',
                  marginBottom: 5,
                }}
              >
                {lbl}
              </div>
              <i
                style={{
                  height: 5,
                  borderRadius: 9,
                  background: i <= step ? 'var(--gold)' : 'var(--line)',
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Tell us about your goal</h2>
              <p className="mute" style={{ margin: 0 }}>
                Speak or type what role you want, and pick any areas that sound interesting.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Your first name (so your AI coach greets you personally)
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Priya, Alex, Sam"
              />
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                border: '1px solid var(--gline)',
                background: 'var(--soft)',
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                  Describe your dream role (Voice or Text)
                </span>
                <button
                  onClick={toggleVoiceListen}
                  style={{ minHeight: 34, padding: '4px 14px', fontSize: 12.5 }}
                >
                  {listening ? (
                    <>
                      <MicOff size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                      Stop Mic
                    </>
                  ) : (
                    <>
                      <Mic size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                      Speak Goal
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={2}
                value={prof.goal}
                onChange={(e) => setProf((p) => ({ ...p, goal: e.target.value }))}
                placeholder="e.g. I know basic HTML and JavaScript and want to get a Frontend React job in 8 weeks…"
              />
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                {[
                  'Frontend React + TypeScript job in 8 weeks',
                  'Full Stack Developer with Node & SQL',
                  'Data Analyst or AI Engineer with Python',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setProf((p) => ({ ...p, goal: preset }))}
                    style={{ minHeight: 30, padding: '3px 12px', fontSize: 12 }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Pick areas you like (choose 1 or more)
              </div>
              <div className="opts" style={{ margin: 0 }}>
                {ONBOARDING_INTERESTS.map(([key, label]) => (
                  <button
                    key={key}
                    className={`opt ${prof.int.includes(key) ? 'on' : ''}`}
                    onClick={() => toggleArr('int', key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Set your pace &amp; focus</h2>
              <p className="mute" style={{ margin: 0 }}>
                We adjust your weekly roadmap timeline so it fits your schedule.
              </p>
            </div>

            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                Your experience level
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {LEVELS.map((item) => (
                  <button
                    key={item.key}
                    className={`opt ${prof.lvl === item.key ? 'on' : ''}`}
                    onClick={() => setProf((p) => ({ ...p, lvl: item.key }))}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 16,
                      minHeight: 62,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{item.label}</span>
                    <span style={{ fontSize: 11.5, opacity: 0.78 }}>{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                Study hours per week
              </div>
              <div className="opts" style={{ margin: 0 }}>
                {HOURS.map((hrs) => (
                  <button
                    key={hrs}
                    className={`opt ${prof.hrs === hrs ? 'on' : ''}`}
                    onClick={() => setProf((p) => ({ ...p, hrs }))}
                  >
                    {hrs} hours / week
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                What do you want help with first?
              </div>
              <div className="opts" style={{ margin: 0 }}>
                {NEEDS.map((need) => (
                  <button
                    key={need}
                    className={`opt ${prof.needs.includes(need) ? 'on' : ''}`}
                    onClick={() => toggleArr('needs', need)}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Your Best Career Roadmap</h2>
                <span className="mute">Compared across top tech tracks for your background</span>
              </div>
              <button
                disabled={recommending}
                onClick={findBestRoadmap}
                style={{ minHeight: 36, padding: '4px 14px', fontSize: 12.5 }}
              >
                <Sparkles size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                {recommending ? 'Comparing…' : 'Refresh Match'}
              </button>
            </div>

            {recommending && !recommendation && (
              <p className="mute" style={{ padding: '16px 0' }}>
                Finding the highest-fit roadmap for your goals…
              </p>
            )}

            {recommendation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    border: '1px solid var(--gold)',
                    background: 'var(--soft)',
                  }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16.5 }}>
                      Best Match: {recommendation.recommendedRole}
                    </span>
                    <button
                      onClick={() => speakPrompt(recommendation.spokenPitch, true)}
                      style={{ minHeight: 32, padding: '2px 12px', fontSize: 12 }}
                    >
                      <Volume2 size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                      Listen Again
                    </button>
                  </div>
                  <p className="mute" style={{ marginBottom: 6 }}>{recommendation.reason}</p>
                  <div style={{ fontSize: 13.5 }}>{recommendation.spokenPitch}</div>
                </div>

                <div>
                  <div className="mute" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    How Other Tracks Compare
                  </div>
                  {recommendation.alternatives.map((alt) => (
                    <div key={alt.role} style={{ marginBottom: 8 }}>
                      <ProgressBar label={alt.role.slice(0, 16)} value={alt.fit} />
                      <div className="mute" style={{ fontSize: 12, paddingLeft: 122 }}>
                        {alt.summary}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="mute" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    First Steps in Your Roadmap
                  </div>
                  {recommendation.previewSteps.map((st, idx) => (
                    <div key={st.title} className="step" style={{ padding: '9px 6px' }}>
                      <span className="font-mono-num" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        0{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{st.title}</div>
                        <div className="mute" style={{ fontSize: 12.5 }}>{st.why}</div>
                      </div>
                      <span className="mute font-mono-num">{st.hours}h</span>
                    </div>
                  ))}
                </div>

                <div className="mute" style={{ fontSize: 12.5 }}>
                  Next: Launching saves your roadmap and automatically starts a quick interactive tour of the workspace.
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className="row"
          style={{
            marginTop: 6,
            paddingTop: 14,
            borderTop: '1px solid var(--line)',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => setStep(step - 1)}
            style={{ visibility: step > 0 ? 'visible' : 'hidden' }}
          >
            ← Back
          </button>
          <button className="p" disabled={saving || recommending} onClick={next}>
            {step === 2
              ? saving
                ? 'Creating Roadmap…'
                : 'Launch My Roadmap & Tour →'
              : step === 1
                ? 'Find My Best Roadmap →'
                : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
}
