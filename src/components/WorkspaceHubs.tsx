import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { CORE_CONCEPTS, SKILL_META } from '../lib/catalog';
import type {
  AppState,
  InterviewSessionRecord,
  InterviewType,
  PromptDuelResult,
  SkillKey,
  TargetRole,
  TrackerStage,
} from '../types';
import {
  AchievementsView,
  AtsLabView,
  CareerKitView,
  InterviewView,
  JobsView,
  PivotView,
  ResumeView,
  TrackerView,
} from './CareerViews';
import {
  LearnView,
  MeetView,
  PracticeView,
  QuizView,
  ResourcesView,
  StudyView,
} from './LearnViews';
import { PositionView, ProgressPathSaga, RoadmapView } from './PlanViews';
import { Ring } from './UiPrimitives';

export function ResumeAnalyzerView({
  state,
  initialTab = 'editor',
  onNavigate,
  onSaveResume,
  onAddKeyword,
  onTailorResume,
  onApplyJob,
  onStateUpdate,
  onToast,
}: {
  state: AppState;
  initialTab?: 'editor' | 'ats' | 'jobs';
  onNavigate: (screen: string) => void;
  onSaveResume: (resume: {
    name: string;
    summary: string;
    skills: string;
    experience: string;
  }) => Promise<void>;
  onAddKeyword: (kw: string) => Promise<void>;
  onTailorResume: (jobId: string) => Promise<void>;
  onApplyJob: (jobId: string) => Promise<void>;
  onStateUpdate?: (s: AppState) => void;
  onToast?: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'editor' | 'ats' | 'jobs'>(initialTab);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="opts" style={{ margin: 0 }}>
          {(
            [
              ['editor', 'AI Resume Maker'],
              ['ats', `ATS Lab (${state.ats.score}/100)`],
              ['jobs', 'Job Tailor & Auto-Apply'],
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
        <button onClick={() => onNavigate('rag')}>Ask RAG about Resume</button>
      </div>

      {tab === 'editor' && (
        <ResumeView
          state={state}
          onNavigate={(s) => (s === 'ats' ? setTab('ats') : onNavigate(s))}
          onSaveResume={onSaveResume}
          onStateUpdate={onStateUpdate}
          onToast={onToast}
        />
      )}
      {tab === 'ats' && (
        <AtsLabView
          state={state}
          onAddKeyword={onAddKeyword}
          onSaveResume={onSaveResume}
          onStateUpdate={onStateUpdate}
          onToast={onToast}
        />
      )}
      {tab === 'jobs' && (
        <JobsView
          state={state}
          onTailorResume={async (id) => {
            await onTailorResume(id);
            setTab('editor');
          }}
          onApplyJob={onApplyJob}
          onStateUpdate={onStateUpdate}
          onToast={onToast}
        />
      )}
    </div>
  );
}

export function CoreConceptsView({
  state,
  onNavigate,
  onToggleResource,
  onCompleteFocus,
  onToggleWeekly,
  onCardMastered,
  onToast,
  onStateUpdate,
}: {
  state: AppState;
  onNavigate: (screen: string) => void;
  onToggleResource: (id: string, checked: boolean) => void;
  onCompleteFocus: (minutes: number) => Promise<void>;
  onToggleWeekly: (dayKey: string, checked: boolean) => void;
  onCardMastered: () => void;
  onToast: (msg: string) => void;
  onStateUpdate: (s: AppState) => void;
}) {
  const [tab, setTab] = useState<'concepts' | 'modules' | 'study' | 'resources'>('concepts');
  const [ragExplain, setRagExplain] = useState<{ id: string; text: string; sources: string[] } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const askRagExplain = async (conceptId: string, prompt: string) => {
    setLoadingId(conceptId);
    try {
      const res = await api.queryRag(prompt);
      setRagExplain({
        id: conceptId,
        text: res.result.answer,
        sources: res.result.sources,
      });
      onStateUpdate(res.state);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <div className="opts" style={{ marginTop: 0 }}>
        {(
          [
            ['concepts', 'Core Concepts & RAG'],
            ['modules', 'Guided Modules'],
            ['study', 'Flashcards & Focus'],
            ['resources', 'Resource Library'],
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

      {tab === 'concepts' && (
        <div>
          <h1 style={{ marginBottom: 4 }}>Core Concepts</h1>
          <p className="mute" style={{ marginBottom: 16 }}>
            Fundamental computer science &amp; engineering concepts mapped to your Skill Twin with live RAG explanations.
          </p>
          {CORE_CONCEPTS.map((c) => {
            const mastery = Math.round((state.skills[c.skillKey] || 0) * 100);
            return (
              <div key={c.id} className="pn">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mute">
                    {c.track} · {SKILL_META[c.skillKey].label}{' '}
                    <span className="font-mono-num">({mastery}%)</span>
                  </span>
                  <button
                    disabled={loadingId === c.id}
                    onClick={() => askRagExplain(c.id, c.ragPrompt)}
                    style={{ minHeight: 34, padding: '4px 12px', fontSize: 13 }}
                  >
                    <Sparkles
                      size={13}
                      style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }}
                    />
                    {loadingId === c.id ? 'Querying RAG…' : 'Explain via RAG'}
                  </button>
                </div>
                <h2 style={{ marginBottom: 6 }}>{c.title}</h2>
                <p className="mute">{c.summary}</p>
                <ul style={{ paddingLeft: 18, margin: '8px 0 0', fontSize: 13.5 }}>
                  {c.keyTakeaways.map((t) => (
                    <li key={t} style={{ marginBottom: 3 }}>
                      {t}
                    </li>
                  ))}
                </ul>
                {ragExplain?.id === c.id && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>
                      Built-in RAG Context ({ragExplain.sources.join(', ') || 'Skill Twin'})
                    </div>
                    <p style={{ margin: 0 }}>{ragExplain.text}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'modules' && (
        <LearnView
          state={state}
          onNavigate={onNavigate}
          onToggleResource={onToggleResource}
        />
      )}

      {tab === 'study' && (
        <StudyView
          state={state}
          onCompleteFocus={onCompleteFocus}
          onToggleWeekly={onToggleWeekly}
          onCardMastered={onCardMastered}
        />
      )}

      {tab === 'resources' && <ResourcesView state={state} onToast={onToast} />}
    </div>
  );
}

export function AptitudeLabView({
  state,
  initialSkill,
  initialMode = 'apt',
  onNavigate,
  onSubmitQuiz,
  onToggleDsa,
  onSubmitAptitude,
  onPromptDuel,
  onLaunchInterview,
  onToast,
}: {
  state: AppState;
  initialSkill: SkillKey;
  initialMode?: 'apt' | 'bkt';
  onNavigate: (screen: string) => void;
  onSubmitQuiz: (
    answers: number[],
    skillKey: SkillKey,
    answerKeys: number[]
  ) => Promise<{
    skillKey: SkillKey;
    skillLabel: string;
    score: number;
    total: number;
    priorPercent: number;
    masteryPercent: number;
    replanned: boolean;
  }>;
  onToggleDsa: (slug: string, solved: boolean) => void;
  onSubmitAptitude: (score: number) => Promise<void>;
  onPromptDuel: (topic: string, userPrompt: string) => Promise<PromptDuelResult>;
  onLaunchInterview: (type: InterviewType) => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'bkt' | 'practice'>(initialMode === 'bkt' ? 'bkt' : 'practice');

  React.useEffect(() => {
    setTab(initialMode === 'bkt' ? 'bkt' : 'practice');
  }, [initialMode, initialSkill]);

  return (
    <div>
      <div className="opts" style={{ marginTop: 0 }}>
        <button
          className={`opt ${tab === 'practice' ? 'on' : ''}`}
          onClick={() => setTab('practice')}
        >
          Timed Aptitude &amp; Communication
        </button>
        <button
          className={`opt ${tab === 'bkt' ? 'on' : ''}`}
          onClick={() => setTab('bkt')}
        >
          8-Skill BKT Assessments
        </button>
      </div>

      {tab === 'bkt' ? (
        <QuizView
          initialSkill={initialSkill}
          onNavigate={onNavigate}
          onSubmitQuiz={onSubmitQuiz}
        />
      ) : (
        <PracticeView
          state={state}
          initialTab="apt"
          onToggleDsa={onToggleDsa}
          onSubmitAptitude={onSubmitAptitude}
          onPromptDuel={onPromptDuel}
          onLaunchInterview={onLaunchInterview}
          onToast={onToast}
        />
      )}
    </div>
  );
}

export function MockInterviewsView({
  state,
  initialType,
  onEvaluateInterview,
  onAddMeeting,
  onDeleteMeeting,
  onRewardEvent,
  onNavigate,
  onToast,
}: {
  state: AppState;
  initialType: InterviewType;
  onEvaluateInterview: (
    type: InterviewType,
    qaPairs: Array<{ q: string; a: string }>
  ) => Promise<InterviewSessionRecord | null>;
  onAddMeeting: (topic: string, whenMs: number, link: string) => Promise<void>;
  onDeleteMeeting: (id: number) => Promise<void>;
  onRewardEvent: (kind: 'meeting_join' | 'precall') => void;
  onNavigate: (screen: string) => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'ai' | 'live'>('ai');

  return (
    <div>
      <div className="opts" style={{ marginTop: 0 }}>
        <button
          className={`opt ${tab === 'ai' ? 'on' : ''}`}
          onClick={() => setTab('ai')}
        >
          AI Hiring Manager Studio
        </button>
        <button
          className={`opt ${tab === 'live' ? 'on' : ''}`}
          onClick={() => setTab('live')}
        >
          Live Peer Meetings ({state.meetings.length})
        </button>
      </div>

      {tab === 'ai' ? (
        <InterviewView
          state={state}
          initialType={initialType}
          onEvaluateInterview={onEvaluateInterview}
          onNavigate={onNavigate}
          onToast={onToast}
        />
      ) : (
        <MeetView
          state={state}
          onAddMeeting={onAddMeeting}
          onDeleteMeeting={onDeleteMeeting}
          onRewardEvent={onRewardEvent}
          onToast={onToast}
        />
      )}
    </div>
  );
}

export function MyProgressHubView({
  state,
  initialTab = 'roadmap',
  onNavigate,
  onReorderRoadmap,
  onCompleteStage,
  onClaimChest,
  onSetGoal,
  onTailorResume,
  onApplyJob,
  onAddTracker,
  onMoveTracker,
  onDeleteTracker,
  onToggleProject,
  onGenerateCoverLetter,
  onStateUpdate,
  onToast,
}: {
  state: AppState;
  initialTab?: 'roadmap' | 'jobs' | 'tracker' | 'kit' | 'position' | 'pivot' | 'ach';
  onNavigate: (screen: string) => void;
  onReorderRoadmap: (orderedIds: number[]) => void;
  onCompleteStage: () => void;
  onClaimChest: () => void;
  onSetGoal: (role: TargetRole) => void;
  onTailorResume: (jobId: string) => Promise<void>;
  onApplyJob: (jobId: string) => Promise<void>;
  onAddTracker: (company: string, role?: string) => Promise<void>;
  onMoveTracker: (id: number, stage: TrackerStage) => Promise<void>;
  onDeleteTracker: (id: number) => Promise<void>;
  onToggleProject: (title: string, checked: boolean) => void;
  onGenerateCoverLetter: (payload: {
    company: string;
    role: string;
    skills: string;
    achievement: string;
    whyCompany: string;
  }) => Promise<string>;
  onStateUpdate?: (s: AppState) => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<
    'roadmap' | 'jobs' | 'tracker' | 'kit' | 'position' | 'pivot' | 'ach'
  >(initialTab);

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div>
      <div className="pn" style={{ marginBottom: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 14 }}>
            <Ring percent={state.readiness} size={72} strokeWidth={8} />
            <div>
              <h1 style={{ marginBottom: 2 }}>My Progress Hub</h1>
              <span className="mute font-mono-num">
                {state.user.role} · Roadmap v{state.user.roadmapVersion} · {state.tracker.length} applications
              </span>
            </div>
          </div>
          <button onClick={() => onNavigate('agents')}>View Agent Debate</button>
        </div>
      </div>

      <div className="opts" style={{ marginTop: 0 }}>
        {(
          [
            ['roadmap', 'Roadmap & Saga'],
            ['jobs', 'Jobs & Auto-Apply'],
            ['tracker', `Tracker (${state.tracker.length})`],
            ['kit', 'Career Kit'],
            ['position', 'Market Roles'],
            ['pivot', 'Career Pivot'],
            ['ach', 'Achievements'],
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

      {tab === 'roadmap' && (
        <div>
          <RoadmapView
            state={state}
            onNavigate={onNavigate}
            onReorder={onReorderRoadmap}
            onCompleteStage={onCompleteStage}
            onClaimChest={onClaimChest}
          />
          <div className="pn">
            <h2>Activity, last 12 weeks</h2>
            <div className="hm">
              {Array.from({ length: 84 }, (_, i) => {
                const cls = ['', 'a', 'b', 'c'][((i * 7 + (i % 5) * 3) % 11) % 4];
                return <i key={i} className={cls} />;
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'jobs' && (
        <JobsView
          state={state}
          onTailorResume={onTailorResume}
          onApplyJob={onApplyJob}
          onStateUpdate={onStateUpdate}
          onToast={onToast}
        />
      )}

      {tab === 'tracker' && (
        <TrackerView
          state={state}
          onAdd={onAddTracker}
          onMove={onMoveTracker}
          onDelete={onDeleteTracker}
          onToast={onToast}
        />
      )}

      {tab === 'kit' && (
        <CareerKitView
          state={state}
          onToggleProject={onToggleProject}
          onGenerateCoverLetter={onGenerateCoverLetter}
          onToast={onToast}
        />
      )}

      {tab === 'position' && <PositionView state={state} onSetGoal={onSetGoal} />}
      {tab === 'pivot' && <PivotView state={state} onSetGoal={onSetGoal} />}
      {tab === 'ach' && <AchievementsView state={state} />}
    </div>
  );
}

export { ProgressPathSaga };
