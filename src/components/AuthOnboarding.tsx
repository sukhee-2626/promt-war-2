import React, { useState } from 'react';
import { ONBOARDING_INTERESTS } from '../lib/catalog';
import type { UserProfile } from '../types';
import { BrandLogo } from './UiPrimitives';

export function SignInModal({
  loading,
  onSignIn,
}: {
  loading: boolean;
  onSignIn: (name?: string, email?: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (fallbackName?: string) => {
    if (loading) return;
    onSignIn(name.trim() || fallbackName, email.trim() || undefined);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--bg) 55%, transparent)',
        backdropFilter: 'blur(24px)',
        padding: 12,
      }}
    >
      <div
        className="pn login-card"
        onPointerMove={handlePointerMove}
        style={{
          width: 'min(430px, 100%)',
          margin: 0,
          textAlign: 'center',
          maxHeight: '94vh',
          overflowY: 'auto',
          padding: 26,
        }}
      >
        <div className="login-orbit">
          <span className="login-orbit-ring" aria-hidden="true" />
          <span className="login-orbit-ring inner" aria-hidden="true" />
          <div style={{ width: 52, height: 52, color: 'var(--ink)' }}>
            <BrandLogo />
          </div>
        </div>

        <h1 style={{ marginBottom: 4 }}>place1ai</h1>
        <p className="mute" style={{ marginBottom: 14 }}>
          Your placement partner, powered by AI.
        </p>

        <p
          className="mute"
          style={{
            fontSize: 12,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--line)',
          }}
        >
          BKT Skill Twin · Planner ⇄ Critic · Built-in RAG · Mock Interviews
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Full name"
          autoComplete="name"
          aria-label="Full name"
          style={{ marginBottom: 8 }}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Email (optional, restores saved SQLite progress)"
          autoComplete="email"
          aria-label="Email"
          style={{ marginBottom: 12 }}
        />

        <button
          className="p"
          disabled={loading}
          onClick={() => handleSubmit()}
          style={{ width: '100%', minHeight: 46, fontSize: 16 }}
        >
          {loading ? 'Signing in…' : 'Continue'}
        </button>

        <div
          className="mute"
          style={{ margin: '14px 0 10px', fontSize: 12, textAlign: 'center' }}
        >
          or instant demo
        </div>

        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <button disabled={loading} onClick={() => handleSubmit('Alex Rivera')}>
            Alex (Demo)
          </button>
          <button disabled={loading} onClick={() => handleSubmit('Asha Rao')}>
            Asha
          </button>
          <button disabled={loading} onClick={() => handleSubmit('Guest')}>
            Guest
          </button>
        </div>

        <p className="mute" style={{ fontSize: 12, marginTop: 14 }}>
          Persists to SQLite so your roadmap, BKT skills, resume, and interviews stay saved.
        </p>
      </div>
    </div>
  );
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Career switcher'];
const HOURS = [4, 8, 12, 20];
const NEEDS = [
  'Skills roadmap',
  'Resume and ATS',
  'Interview practice',
  'Job matching',
  'Learning resources',
];

export function OnboardingModal({
  initialProfile,
  saving,
  onSave,
  onToast,
}: {
  initialProfile: UserProfile | null;
  saving: boolean;
  onSave: (profile: UserProfile) => void;
  onToast: (msg: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [prof, setProf] = useState<UserProfile>(
    initialProfile || {
      int: [],
      lvl: 'Beginner',
      hrs: 8,
      needs: [],
      goal: '',
    }
  );

  const toggleArr = (key: 'int' | 'needs', val: string) => {
    setProf((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(val) ? list.filter((x) => x !== val) : [...list, val],
      };
    });
  };

  const next = () => {
    if (step === 0 && prof.int.length === 0) {
      onToast('Pick at least one interest');
      return;
    }
    if (step < 2) setStep(step + 1);
    else onSave(prof);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 210,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--bg) 60%, transparent)',
        backdropFilter: 'blur(22px)',
        padding: 12,
      }}
    >
      <div
        className="pn"
        style={{
          width: 'min(560px, 100%)',
          margin: 0,
          maxHeight: '94vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 9,
                background: i <= step ? 'var(--ink)' : 'var(--line)',
                display: 'block',
              }}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h2>What are you interested in?</h2>
            <p className="mute">Pick one or more. We choose a matching career path for you.</p>
            <div className="opts">
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
        )}

        {step === 1 && (
          <div>
            <h2>Where are you today?</h2>
            <p className="mute">Experience level</p>
            <div className="opts">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  className={`opt ${prof.lvl === lvl ? 'on' : ''}`}
                  onClick={() => setProf((p) => ({ ...p, lvl }))}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <p className="mute">Study time per week</p>
            <div className="opts">
              {HOURS.map((hrs) => (
                <button
                  key={hrs}
                  className={`opt ${prof.hrs === hrs ? 'on' : ''}`}
                  onClick={() => setProf((p) => ({ ...p, hrs }))}
                >
                  {hrs} h
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>What do you need help with?</h2>
            <div className="opts">
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
            <label style={{ display: 'block', marginTop: 8 }}>
              <span className="mute" style={{ display: 'block', marginBottom: 4 }}>
                Dream role or company (optional)
              </span>
              <input
                value={prof.goal}
                onChange={(e) => setProf((p) => ({ ...p, goal: e.target.value }))}
                placeholder="e.g. Frontend Engineer at a fintech"
              />
            </label>
          </div>
        )}

        <div
          className="row"
          style={{ marginTop: 18, justifyContent: 'space-between' }}
        >
          <button
            onClick={() => setStep(step - 1)}
            style={{ visibility: step > 0 ? 'visible' : 'hidden' }}
          >
            Back
          </button>
          <button className="p" disabled={saving} onClick={next}>
            {step === 2 ? (saving ? 'Building roadmap…' : 'Build my roadmap') : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
