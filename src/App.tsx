import React, { useCallback, useEffect, useState } from 'react';
import { OnboardingModal, SignInModal } from './components/AuthOnboarding';
import {
  AchievementsView,
  AgentsView,
  AtsLabView,
  CareerKitView,
  InterviewView,
  JobsView,
  PivotView,
  ResumeView,
  TrackerView,
} from './components/CareerViews';
import {
  LearnView,
  MeetView,
  PracticeView,
  QuizView,
  ResourcesView,
  StudyView,
} from './components/LearnViews';
import { MentorDrawer } from './components/MentorDrawer';
import {
  HomeView,
  PositionView,
  RoadmapView,
  SkillMapView,
} from './components/PlanViews';
import {
  AgentRunnerOverlay,
  BrandLogo,
  CommandPalette,
  ConfettiBurst,
  GuidedTourOverlay,
  NeuralBackground,
  RewardsModal,
} from './components/UiPrimitives';
import { api } from './lib/api';
import type {
  AppState,
  BoostInventory,
  InterviewType,
  SkillKey,
  TargetRole,
  TrackerStage,
  UserProfile,
} from './types';

const ICON_PATHS: Record<string, string> = {
  home: 'M3 11l9-8 9 8v10H3z',
  position: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  map: 'M6 6h4v4H6zM14 14h4v4h-4zM10 8h4v6',
  roadmap: 'M4 19c4 0 4-6 8-6s4-6 8-6',
  learn: 'M3 6l9-3 9 3-9 3zM7 11v4c3 2 7 2 10 0v-4',
  quiz: 'M5 4h14v16H5zM9 9h6M9 13h4',
  practice: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
  res: 'M4 5h7v14H4zM13 5h7v14h-7z',
  meet: 'M3 7h12v10H3zM15 11l6-3v8l-6-3',
  study: 'M12 8v4l3 2M12 21a8 8 0 100-16 8 8 0 000 16zM9 2h6',
  resume: 'M7 3h8l4 4v14H7zM10 12h6M10 16h6',
  ats: 'M4 12l5 5L20 6',
  jobs: 'M3 8h18v12H3zM9 8V5h6v3',
  track: 'M3 5h5v14H3zM10 5h5v9h-5zM17 5h4v6h-4z',
  kit: 'M3 8h18v12H3zM9 8V5h6v3M3 13h18',
  interview: 'M4 5h16v10H9l-5 4z',
  pivot: 'M4 8h13l-3-3M20 16H7l3 3',
  ach: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z',
  agents: 'M12 3v4M12 17v4M3 12h4M17 12h4M8 8h8v8H8z',
};

const NAV_ITEMS: Array<[string, string]> = [
  ['home', 'Home'],
  ['position', 'Position'],
  ['map', 'Skill map'],
  ['roadmap', 'Roadmap'],
  ['learn', 'Learn'],
  ['quiz', 'Assess'],
  ['practice', 'Practice'],
  ['res', 'Resources'],
  ['meet', 'Meet'],
  ['study', 'Study'],
  ['resume', 'Resume'],
  ['ats', 'ATS lab'],
  ['jobs', 'Jobs'],
  ['track', 'Tracker'],
  ['kit', 'Career kit'],
  ['interview', 'Interview'],
  ['pivot', 'Pivot'],
  ['ach', 'Achievements'],
  ['agents', 'Agents'],
];

const SIDEBAR_GROUPS: Array<[string, string[]]> = [
  ['Plan', ['home', 'position', 'map', 'roadmap']],
  ['Learn', ['learn', 'quiz', 'practice', 'res', 'study', 'meet']],
  ['Career', ['resume', 'ats', 'jobs', 'track', 'kit', 'interview', 'pivot']],
  ['Progress', ['ach', 'agents']],
];

const MOBILE_TABS = ['home', 'map', 'learn', 'resume'];

function NavIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON_PATHS[id] || ICON_PATHS.home} />
    </svg>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('sf-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [state, setState] = useState<AppState | null>(null);
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  const [screen, setScreen] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return NAV_ITEMS.some(([id]) => id === hash) ? hash : 'home';
  });

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [mentorSending, setMentorSending] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [interviewPreType, setInterviewPreType] =
    useState<InterviewType>('Behavioral');
  const [quizSkill, setQuizSkill] = useState<SkillKey>('js');

  const [toastMsg, setToastMsg] = useState('');
  const [toastOn, setToastOn] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [splashWord, setSplashWord] = useState<string | null>(null);

  const [runningAgents, setRunningAgents] = useState<string[] | null>(null);
  const [agentIndex, setAgentIndex] = useState(0);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOn(true);
  }, []);

  useEffect(() => {
    if (!toastOn) return;
    const t = setTimeout(() => setToastOn(false), 2600);
    return () => clearTimeout(t);
  }, [toastOn, toastMsg]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('sf-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (NAV_ITEMS.some(([id]) => id === h)) {
        setScreen(h);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    api
      .checkSession()
      .then((res) => {
        if (res.authenticated && res.state) {
          setState(res.state);
          if (!res.state.user.prof) {
            setShowOnboarding(true);
          }
        }
      })
      .catch(() => {
        // user not signed in yet
      })
      .finally(() => setBooting(false));
  }, []);

  const navigate = useCallback((id: string) => {
    setScreen(id);
    setMobileSheetOpen(false);
    window.location.hash = `#${id}`;
    window.scrollTo(0, 0);
  }, []);

  const triggerWord = useCallback(
    (label: string) => {
      setSplashWord(label);
      setConfettiTrigger((c) => c + 1);
      setTimeout(() => setSplashWord(null), 1500 / speed);
    },
    [speed]
  );

  const runAgentsAnimation = useCallback(
    async (agents: string[], doneMsg?: string) => {
      setRunningAgents(agents);
      for (let i = 0; i < agents.length; i++) {
        setAgentIndex(i);
        await new Promise((r) => setTimeout(r, 520 / speed));
      }
      setAgentIndex(agents.length);
      await new Promise((r) => setTimeout(r, 380 / speed));
      setRunningAgents(null);
      if (doneMsg) toast(doneMsg);
    },
    [speed, toast]
  );

  const handleRewardEffects = useCallback(
    (
      reward:
        | { xp: number; leveledUp: boolean; newlyUnlockedBadges: string[] }
        | null
        | undefined,
      label?: string
    ) => {
      if (!reward) return;
      if (reward.leveledUp) {
        triggerWord('Level up');
      } else if (label) {
        triggerWord(label);
      }
      if (reward.newlyUnlockedBadges.length > 0) {
        toast(`Badge unlocked: ${reward.newlyUnlockedBadges.join(', ')}`);
        setConfettiTrigger((c) => c + 1);
      }
    },
    [toast, triggerWord]
  );

  const handleSignIn = async (name?: string, email?: string) => {
    setAuthLoading(true);
    try {
      const res = await api.login(name, email);
      setState(res.state);
      if (!res.state.user.prof) {
        setShowOnboarding(true);
      }
      toast(`Welcome, ${res.state.user.name}`);
    } catch (err: any) {
      toast(err.message || 'Sign in failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveOnboarding = async (profile: UserProfile) => {
    setOnboardingSaving(true);
    try {
      const res = await api.saveOnboarding(profile);
      setState(res.state);
      setShowOnboarding(false);
      await runAgentsAnimation(
        ['Profiler', 'Gap Analyst', 'Planner', 'Critic', 'Curator'],
        `Roadmap ready for ${res.state.user.role}`
      );
      handleRewardEffects(res.reward, 'Welcome aboard');
    } catch (err: any) {
      toast(err.message || 'Failed to save profile');
    } finally {
      setOnboardingSaving(false);
    }
  };

  const handleSetGoal = async (role: TargetRole) => {
    try {
      const res = await api.setGoal(role);
      setState(res.state);
      navigate('home');
      await runAgentsAnimation(
        ['Gap Analyst', 'Planner', 'Critic', 'Curator'],
        `Pivot plan ready for ${role}`
      );
    } catch (err: any) {
      toast(err.message || 'Failed to switch goal');
    }
  };

  const handleReorderRoadmap = async (orderedIds: number[]) => {
    try {
      const res = await api.reorderRoadmap(orderedIds);
      setState(res.state);
      toast(res.message || 'Order accepted by Critic');
    } catch (err: any) {
      toast(err.message || 'Critic rejected order');
    }
  };

  const handleCompleteStage = async () => {
    try {
      const res = await api.completeStage();
      setState(res.state);
      handleRewardEffects(res.reward, res.label);
      if (!res.reward.leveledUp) toast(res.label);
    } catch (err: any) {
      toast(err.message || 'Could not advance stage');
    }
  };

  const handleClaimChest = async () => {
    try {
      const res = await api.claimChest();
      setState(res.state);
      handleRewardEffects(res.reward, 'Daily reward');
      toast('+50 credits · +1 badge claimed');
    } catch (err: any) {
      toast(err.message || 'Already claimed today');
    }
  };

  const handleSignOut = async () => {
    await api.logout();
    setRewardsOpen(false);
    setState(null);
    setShowOnboarding(false);
  };

  const handleToggleRag = async () => {
    const next = !ragEnabled;
    setRagEnabled(next);
    try {
      const res = await api.logRagToggle(next);
      setState(res.state);
    } catch {
      // ignore
    }
  };

  const handleSendMentor = async (question: string) => {
    setMentorSending(true);
    try {
      const res = await api.sendMentorMessage(question, ragEnabled);
      setState(res.state);
    } catch (err: any) {
      toast(err.message || 'Mentor request failed');
    } finally {
      setMentorSending(false);
    }
  };

  const commands = [
    ...NAV_ITEMS.map(([id, label]) => ({
      label: `${label} screen`,
      action: () => navigate(id),
    })),
    {
      label: 'Start guided tour',
      action: () => {
        navigate('home');
        setTourStep(0);
      },
    },
    {
      label: 'Toggle light or dark theme',
      action: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    },
    {
      label: 'Ask AI mentor',
      action: () => setMentorOpen(true),
    },
    {
      label: 'Run agents: replan roadmap',
      action: async () => {
        const res = await api.replanAgents();
        setState(res.state);
        await runAgentsAnimation(
          ['Evaluator', 'Gap Analyst', 'Planner', 'Critic', 'Curator'],
          'Roadmap refreshed'
        );
      },
    },
  ];

  if (booting) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <NeuralBackground theme={theme} />
        <div style={{ width: 64, height: 64 }}>
          <BrandLogo />
        </div>
        <p className="mute">Loading place1ai…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <>
        <NeuralBackground theme={theme} />
        <SignInModal loading={authLoading} onSignIn={handleSignIn} />
      </>
    );
  }

  const nextStep = state.roadmap[0] || {
    title: 'JavaScript fundamentals',
    hours: 12,
  };

  return (
    <>
      <NeuralBackground theme={theme} />
      <ConfettiBurst trigger={confettiTrigger} />
      <AgentRunnerOverlay agents={runningAgents} activeIndex={agentIndex} />

      <div className="app">
        {/* Desktop Sidebar */}
        <nav className="side" aria-label="Main">
          <div className="logo">
            <span className="lm">
              <BrandLogo />
            </span>
            place1ai
          </div>

          {SIDEBAR_GROUPS.map(([groupName, ids]) => {
            const items = ids
              .map((id) => NAV_ITEMS.find((x) => x[0] === id))
              .filter(Boolean) as Array<[string, string]>;
            const containsActive = items.some(([id]) => id === screen);
            return (
              <details
                key={groupName}
                className="sg"
                open={containsActive || groupName === 'Plan'}
              >
                <summary>
                  {groupName} <span className="mute">{items.length}</span>
                </summary>
                {items.map(([id, label]) => (
                  <button
                    key={id}
                    className={`nv ${screen === id ? 'on' : ''}`}
                    aria-current={screen === id ? 'page' : undefined}
                    onClick={() => navigate(id)}
                  >
                    <NavIcon id={id} />
                    {label}
                  </button>
                ))}
              </details>
            );
          })}
        </nav>

        {/* Main Workspace */}
        <main tabIndex={-1}>
          {/* Top Bar */}
          <div className="top">
            <span className="mute">{state.user.role}</span>
            <span className="sp" />
            <div className="hud">
              <button
                className="hb lv"
                onClick={() => setRewardsOpen(true)}
                title="View rewards and boosts"
              >
                Lv {state.user.level}
              </button>
              <button
                className="hb"
                onClick={() => setRewardsOpen(true)}
                title="Credits"
              >
                ◆ {state.user.coin}
              </button>
              <button
                className="hb"
                onClick={() => setRewardsOpen(true)}
                title="Badges"
              >
                ★ {state.user.star}
              </button>
            </div>
            <button onClick={() => setPaletteOpen(true)}>Search Ctrl+K</button>
            <button
              onClick={() => {
                navigate('home');
                setTourStep(0);
              }}
            >
              Tour
            </button>
            <button
              onClick={() =>
                setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
              }
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button className="p" onClick={() => setMentorOpen(true)}>
              Ask mentor
            </button>
          </div>

          {/* Target Summary Strip */}
          <div
            className="pn"
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <span className="mute">Your target</span>
              <h2 style={{ margin: 0 }}>{state.user.role}</h2>
              <div className="xp" style={{ margin: '7px 0' }}>
                <b style={{ width: `${state.readiness}%` }} />
              </div>
              <span className="mute font-mono-num">
                {state.readiness}% ready · Next best step: <b>{nextStep.title}</b> (
                {nextStep.hours}h)
              </span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="p" onClick={() => navigate('learn')}>
                Start next step
              </button>
              <button onClick={() => navigate('quiz')}>Assess</button>
              <button onClick={() => navigate('jobs')}>Jobs</button>
              <button onClick={() => navigate('interview')}>Interview</button>
            </div>
            <div className="mute" style={{ width: '100%', fontSize: 12 }}>
              Free resources:{' '}
              <a
                href="https://developer.mozilla.org/en-US/docs/Learn"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginRight: 12 }}
              >
                MDN
              </a>
              <a
                href="https://www.freecodecamp.org/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginRight: 12 }}
              >
                freeCodeCamp
              </a>
              <a
                href="https://roadmap.sh"
                target="_blank"
                rel="noopener noreferrer"
              >
                roadmap.sh
              </a>
            </div>
          </div>

          {/* Active Screen */}
          {screen === 'home' && (
            <HomeView
              state={state}
              onNavigate={navigate}
              onCompleteStage={handleCompleteStage}
              onClaimChest={handleClaimChest}
              onToggleQuest={async (quest, checked) => {
                const res = await api.toggleProgress({
                  kind: 'quests',
                  item: quest,
                  checked,
                  xpAmount: 20,
                });
                setState(res.state);
                if (checked) {
                  handleRewardEffects(res.reward, '+20 XP');
                  toast('+20 XP: quest completed');
                }
              }}
              onOpenOnboarding={() => setShowOnboarding(true)}
            />
          )}

          {screen === 'position' && (
            <PositionView state={state} onSetGoal={handleSetGoal} />
          )}

          {screen === 'map' && (
            <SkillMapView
              state={state}
              onAssessSkill={(skill) => {
                setQuizSkill(skill);
                navigate('quiz');
              }}
            />
          )}

          {screen === 'roadmap' && (
            <RoadmapView
              state={state}
              onNavigate={navigate}
              onReorder={handleReorderRoadmap}
              onCompleteStage={handleCompleteStage}
              onClaimChest={handleClaimChest}
            />
          )}

          {screen === 'learn' && (
            <LearnView
              state={state}
              onNavigate={navigate}
              onToggleResource={async (id, checked) => {
                const res = await api.toggleProgress({
                  kind: 'resources',
                  item: id,
                  checked,
                  xpAmount: 15,
                });
                setState(res.state);
                if (checked) {
                  handleRewardEffects(res.reward);
                  toast('+15 XP: resource completed');
                }
              }}
            />
          )}

          {screen === 'quiz' && (
            <QuizView
              initialSkill={quizSkill}
              onNavigate={navigate}
              onSubmitQuiz={async (answers, skillKey, answerKeys) => {
                const res = await api.submitQuiz(answers, skillKey, answerKeys);
                setState(res.state);
                if (res.replanned) {
                  await runAgentsAnimation(
                    ['Evaluator', 'Gap Analyst', 'Planner', 'Critic', 'Curator'],
                    `Roadmap v${res.state.user.roadmapVersion} ready`
                  );
                } else if (res.score >= 2) {
                  handleRewardEffects(res.reward, 'Assessment passed');
                  toast('+40 XP: assessment passed');
                }
                return res;
              }}
            />
          )}

          {screen === 'practice' && (
            <PracticeView
              state={state}
              onToast={toast}
              onToggleDsa={async (slug, solved) => {
                const res = await api.toggleDsa(slug, solved);
                setState(res.state);
                if (solved) {
                  handleRewardEffects(res.reward);
                  toast('+10 XP: problem solved');
                }
              }}
              onSubmitAptitude={async (score) => {
                const res = await api.submitAptitude(score);
                setState(res.state);
                handleRewardEffects(res.reward, 'Aptitude complete');
                toast(`Aptitude test saved: ${score}/10`);
              }}
              onPromptDuel={async (topic, userPrompt) => {
                const res = await api.runPromptDuel(topic, userPrompt);
                setState(res.state);
                handleRewardEffects(
                  res.reward,
                  res.result.winner === 'user' ? 'Duel won' : undefined
                );
                toast(
                  res.result.winner === 'user'
                    ? '+30 XP: Prompt Duel won'
                    : '+10 XP: Prompt Duel completed'
                );
                return res.result;
              }}
              onLaunchInterview={(type) => {
                setInterviewPreType(type);
                navigate('interview');
              }}
            />
          )}

          {screen === 'res' && <ResourcesView state={state} onToast={toast} />}

          {screen === 'meet' && (
            <MeetView
              state={state}
              onToast={toast}
              onAddMeeting={async (topic, whenMs, link) => {
                const res = await api.addMeeting(topic, whenMs, link);
                setState(res.state);
                handleRewardEffects(res.reward);
                toast('Session scheduled');
              }}
              onDeleteMeeting={async (id) => {
                const res = await api.deleteMeeting(id);
                setState(res.state);
              }}
              onRewardEvent={async (kind) => {
                const res = await api.toggleProgress({
                  kind,
                  xpAmount: kind === 'precall' ? 20 : 10,
                });
                setState(res.state);
                handleRewardEffects(res.reward);
                toast(
                  kind === 'precall'
                    ? '+20 XP: ready for the call'
                    : '+10 XP: joined session'
                );
              }}
            />
          )}

          {screen === 'study' && (
            <StudyView
              state={state}
              onCompleteFocus={async (minutes) => {
                const res = await api.completeFocus(minutes);
                setState(res.state);
                handleRewardEffects(res.reward, 'Focus complete');
                toast('+25 XP: focus session saved');
              }}
              onToggleWeekly={async (dayKey, checked) => {
                const res = await api.toggleProgress({
                  kind: 'weekly',
                  item: dayKey,
                  checked,
                  xpAmount: 15,
                });
                setState(res.state);
                if (checked) toast('+15 XP: day completed');
              }}
              onCardMastered={async () => {
                const res = await api.toggleProgress({
                  kind: 'card',
                  xpAmount: 5,
                });
                setState(res.state);
                handleRewardEffects(res.reward);
                toast('+5 XP: card mastered');
              }}
            />
          )}

          {screen === 'resume' && (
            <ResumeView
              state={state}
              onNavigate={navigate}
              onSaveResume={async (resume) => {
                const res = await api.updateResume(resume);
                setState(res.state);
              }}
            />
          )}

          {screen === 'ats' && (
            <AtsLabView
              state={state}
              onAddKeyword={async (kw) => {
                const res = await api.addResumeKeyword(kw);
                setState(res.state);
                toast(`${kw} added as learning`);
              }}
            />
          )}

          {screen === 'jobs' && (
            <JobsView
              state={state}
              onTailorResume={async (jobId) => {
                const res = await api.tailorResume(jobId);
                setState(res.state);
                toast('Tailored resume saved to SQLite');
                navigate('resume');
              }}
              onApplyJob={async (jobId) => {
                await runAgentsAnimation([
                  'Resume Writer',
                  'Resume Verifier',
                  'ATS Analyst',
                ]);
                const res = await api.applyJob(jobId);
                setState(res.state);
                handleRewardEffects(res.reward, 'Applied');
                toast('+50 XP: application sent');
              }}
            />
          )}

          {screen === 'track' && (
            <TrackerView
              state={state}
              onToast={toast}
              onAdd={async (company, role) => {
                const res = await api.addTracker(company, role);
                setState(res.state);
                toast('Application added');
              }}
              onMove={async (id, stage: TrackerStage) => {
                const res = await api.moveTracker(id, stage);
                setState(res.state);
                if (res.reward) {
                  handleRewardEffects(res.reward, stage);
                }
              }}
              onDelete={async (id) => {
                const res = await api.deleteTracker(id);
                setState(res.state);
              }}
            />
          )}

          {screen === 'kit' && (
            <CareerKitView
              state={state}
              onToast={toast}
              onToggleProject={async (title, checked) => {
                const res = await api.toggleProgress({
                  kind: 'projects',
                  item: title,
                  checked,
                  xpAmount: 30,
                });
                setState(res.state);
                if (checked) {
                  handleRewardEffects(res.reward);
                  toast('+30 XP: project finished');
                }
              }}
              onGenerateCoverLetter={(payload) =>
                api.generateCoverLetter(payload).then((r) => r.letter)
              }
            />
          )}

          {screen === 'interview' && (
            <InterviewView
              state={state}
              initialType={interviewPreType}
              onNavigate={navigate}
              onToast={toast}
              onEvaluateInterview={async (type, qaPairs) => {
                try {
                  const res = await api.evaluateInterview(type, qaPairs);
                  setState(res.state);
                  handleRewardEffects(res.reward, 'Interview complete');
                  toast('+60 XP: interview scored & saved');
                  return (
                    res.state.interviews[res.state.interviews.length - 1] || null
                  );
                } catch (err: any) {
                  toast(err.message || 'Evaluation failed');
                  return null;
                }
              }}
            />
          )}

          {screen === 'pivot' && <PivotView state={state} onSetGoal={handleSetGoal} />}

          {screen === 'ach' && <AchievementsView state={state} />}

          {screen === 'agents' && (
            <AgentsView
              state={state}
              onReplan={async () => {
                const res = await api.replanAgents();
                setState(res.state);
                await runAgentsAnimation(
                  ['Evaluator', 'Gap Analyst', 'Planner', 'Critic', 'Curator'],
                  'Roadmap refreshed'
                );
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bnav" aria-label="Main mobile">
        {MOBILE_TABS.map((id) => {
          const item = NAV_ITEMS.find((x) => x[0] === id)!;
          return (
            <button
              key={id}
              className={`tab ${screen === id ? 'on' : ''}`}
              onClick={() => navigate(id)}
            >
              <NavIcon id={id} />
              <span>{item[1]}</span>
            </button>
          );
        })}
        <button
          className="tab"
          onClick={() => setMobileSheetOpen((v) => !v)}
        >
          <NavIcon id="agents" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Overflow Sheet */}
      <div className={`sheet ${mobileSheetOpen ? 'open' : ''}`}>
        {NAV_ITEMS.filter(([id]) => !MOBILE_TABS.includes(id)).map(
          ([id, label]) => (
            <button
              key={id}
              className={`nv ${screen === id ? 'on' : ''}`}
              onClick={() => navigate(id)}
            >
              <NavIcon id={id} />
              <span>{label}</span>
            </button>
          )
        )}
      </div>

      {/* Floating Mentor Trigger + Speed Button */}
      <button
        className="p chat-fab"
        onClick={() => setMentorOpen(true)}
        aria-label="Open chatbot"
      >
        <span style={{ width: 18, height: 18, display: 'inline-block' }}>
          <BrandLogo />
        </span>
        AI Mentor · RAG
      </button>

      <button
        onClick={() => {
          const next = speed === 1 ? 2 : 1;
          setSpeed(next);
          toast(next === 2 ? 'Speed up on' : 'Speed up off');
        }}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 14,
          zIndex: 31,
          fontWeight: 600,
          background: speed === 2 ? 'var(--ink)' : 'var(--glass)',
          color: speed === 2 ? 'var(--bg)' : 'var(--ink)',
        }}
      >
        Speed ×{speed}
      </button>

      {/* Modals & Drawers */}
      <MentorDrawer
        open={mentorOpen}
        messages={state.chatMessages}
        ragEnabled={ragEnabled}
        sending={mentorSending}
        onClose={() => setMentorOpen(false)}
        onToggleRag={handleToggleRag}
        onSend={handleSendMentor}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

      <RewardsModal
        open={rewardsOpen}
        state={state}
        onClose={() => setRewardsOpen(false)}
        onUseBoost={async (key: keyof BoostInventory) => {
          try {
            const res = await api.manageBoost('use', key);
            setState(res.state);
            handleRewardEffects(res.reward, key === 'xp' ? '+50 XP' : undefined);
            toast(key === 'xp' ? 'XP booster used (+50 XP)' : 'Booster activated');
          } catch (err: any) {
            toast(err.message || 'None left');
          }
        }}
        onBuyBoost={async () => {
          try {
            const res = await api.manageBoost('buy');
            setState(res.state);
            toast('Purchased XP booster for 60 credits');
          } catch (err: any) {
            toast(err.message || 'Not enough credits');
          }
        }}
        onSignOut={handleSignOut}
      />

      <GuidedTourOverlay
        stepIndex={tourStep}
        onStep={(idx) => {
          const screens = ['home', 'home', 'map', 'roadmap', 'resume', 'home'];
          navigate(screens[idx] || 'home');
          setTourStep(idx);
        }}
        onOpenRagMentor={() => {
          if (!ragEnabled) handleToggleRag();
          setMentorOpen(true);
        }}
        onClose={() => setTourStep(null)}
      />

      {showOnboarding && (
        <OnboardingModal
          initialProfile={state.user.prof}
          saving={onboardingSaving}
          onSave={handleSaveOnboarding}
          onToast={toast}
        />
      )}

      {/* Celebratory Word Splash */}
      {splashWord && <div className="word">{splashWord}</div>}

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 88,
          transform: `translate(-50%, ${toastOn ? '0' : '14px'})`,
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: '10px 18px',
          borderRadius: 99,
          zIndex: 99,
          opacity: toastOn ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.22s, transform 0.28s',
          maxWidth: '90%',
          fontWeight: 500,
        }}
      >
        {toastMsg}
      </div>
    </>
  );
}
