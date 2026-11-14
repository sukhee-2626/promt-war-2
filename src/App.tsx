import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Calculator,
  Compass,
  Database,
  FileText,
  Flame,
  GitBranch,
  LayoutDashboard,
  Map,
  Mic,
  Terminal,
  Trophy,
} from 'lucide-react';
import { AnalyticsView } from './components/AnalyticsView';
import { OnboardingModal, SignInModal } from './components/AuthOnboarding';
import { AgentsView } from './components/CareerViews';
import { CommandCentreView } from './components/CommandCentreView';
import {
  DailyChallengeView,
  LeaderboardView,
  RagHubView,
  TutorTreeView,
} from './components/HighlightsViews';
import { PracticeView } from './components/LearnViews';
import { MentorDrawer } from './components/MentorDrawer';
import { RoadmapView } from './components/PlanViews';
import {
  AgentRunnerOverlay,
  BrandLogo,
  CommandPalette,
  ConfettiBurst,
  GuidedTourOverlay,
  NeuralBackground,
  RewardsModal,
  TOUR_STEPS,
} from './components/UiPrimitives';
import {
  AptitudeLabView,
  CoreConceptsView,
  MockInterviewsView,
  MyProgressHubView,
  ResumeAnalyzerView,
} from './components/WorkspaceHubs';
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

type ScreenId =
  | 'command'
  | 'roadmap'
  | 'agents'
  | 'rag'
  | 'dsa'
  | 'interview'
  | 'resume'
  | 'concepts'
  | 'aptitude'
  | 'analytics'
  | 'tutortree'
  | 'daily'
  | 'progress'
  | 'leaderboard';

const NAV_ITEMS: Array<{
  id: ScreenId;
  label: string;
  group: 'AI TOOLS' | 'PRACTICE & PREP' | 'PROGRESS';
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'command', label: 'Command Centre', group: 'AI TOOLS', icon: LayoutDashboard },
  { id: 'roadmap', label: 'My Roadmap', group: 'AI TOOLS', icon: Map },
  { id: 'agents', label: 'Build AI Agents', group: 'AI TOOLS', icon: Bot },
  { id: 'rag', label: 'AI Study Mentor', group: 'AI TOOLS', icon: Database },
  { id: 'dsa', label: 'Coding Test & DSA', group: 'PRACTICE & PREP', icon: Terminal },
  { id: 'interview', label: 'Virtual Interview', group: 'PRACTICE & PREP', icon: Mic },
  { id: 'resume', label: 'AI Resume Builder', group: 'PRACTICE & PREP', icon: FileText },
  { id: 'concepts', label: 'Core Lessons', group: 'PRACTICE & PREP', icon: BookOpen },
  { id: 'aptitude', label: 'Aptitude & Quizzes', group: 'PRACTICE & PREP', icon: Calculator },
  { id: 'analytics', label: 'Analytics & Insights', group: 'PROGRESS', icon: BarChart3 },
  { id: 'tutortree', label: 'Skill Map', group: 'PROGRESS', icon: GitBranch },
  { id: 'daily', label: 'Daily Practice', group: 'PROGRESS', icon: Flame },
  { id: 'progress', label: 'Jobs & Progress', group: 'PROGRESS', icon: Compass },
  { id: 'leaderboard', label: 'Leaderboard', group: 'PROGRESS', icon: Trophy },
];

const SIDEBAR_GROUPS: Array<'AI TOOLS' | 'PRACTICE & PREP' | 'PROGRESS'> = [
  'AI TOOLS',
  'PRACTICE & PREP',
  'PROGRESS',
];

const MOBILE_TABS: ScreenId[] = ['command', 'roadmap', 'agents', 'interview'];

function resolveScreenAlias(raw: string): ScreenId {
  const clean = raw.replace(/^#/, '');
  const found = NAV_ITEMS.find((n) => n.id === clean);
  if (found) return found.id;
  const legacyMap: Record<string, ScreenId> = {
    home: 'command',
    map: 'tutortree',
    roadmap: 'roadmap',
    position: 'progress',
    jobs: 'progress',
    'progress-jobs': 'progress',
    track: 'progress',
    kit: 'progress',
    pivot: 'progress',
    ach: 'progress',
    ats: 'resume',
    learn: 'concepts',
    res: 'concepts',
    study: 'concepts',
    quiz: 'aptitude',
    practice: 'dsa',
    coding: 'dsa',
    'dsa-coding': 'dsa',
    'dsa-solver': 'dsa',
    'dsa-duel': 'dsa',
    'dsa-com': 'dsa',
    meet: 'interview',
  };
  return legacyMap[clean] || 'command';
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

  const [screen, setScreen] = useState<ScreenId>(() =>
    resolveScreenAlias(window.location.hash)
  );
  const [aptitudeMode, setAptitudeMode] = useState<'apt' | 'bkt'>('apt');
  const [practiceTab, setPracticeTab] = useState<
    'coding' | 'dsa' | 'solver' | 'apt' | 'com' | 'duel'
  >('coding');
  const [progressTab, setProgressTab] = useState<
    'roadmap' | 'jobs' | 'tracker' | 'kit' | 'position' | 'pivot' | 'ach'
  >('roadmap');

  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);
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
      setScreen(resolveScreenAlias(window.location.hash));
      window.scrollTo(0, 0);
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

  const navigate = useCallback((rawId: string) => {
    const clean = rawId.replace(/^#/, '');
    if (clean === 'quiz') {
      setAptitudeMode('bkt');
    } else if (clean === 'aptitude') {
      setAptitudeMode('apt');
    }
    if (clean === 'dsa-coding' || clean === 'coding') {
      setPracticeTab('coding');
    } else if (clean === 'dsa-solver') {
      setPracticeTab('solver');
    } else if (clean === 'dsa-duel') {
      setPracticeTab('duel');
    } else if (clean === 'dsa-com') {
      setPracticeTab('com');
    } else if (clean === 'dsa') {
      setPracticeTab('dsa');
    }
    if (clean === 'progress-jobs' || clean === 'jobs') {
      setProgressTab('jobs');
    } else if (clean === 'progress') {
      setProgressTab('roadmap');
    }
    const next = resolveScreenAlias(clean);
    setScreen(next);
    setMobileSheetOpen(false);
    window.location.hash = `#${next}`;
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

  const handleSaveOnboarding = async (profile: UserProfile, updatedName?: string) => {
    setOnboardingSaving(true);
    try {
      if (updatedName && updatedName.trim()) {
        await api.updateUserName(updatedName.trim());
      }
      const res = await api.saveOnboarding(profile);
      setState(res.state);
      setShowOnboarding(false);
      await runAgentsAnimation(
        ['Understanding your goal', 'Checking your skills', 'Building weekly plan', 'Adding study lessons', 'Roadmap ready'],
        `Your ${res.state.user.role} Roadmap is ready!`
      );
      navigate('roadmap');
      handleRewardEffects(res.reward, 'Roadmap ready');
      // Automatically launch the guided tour right after onboarding
      setTourStep(0);
    } catch (err: any) {
      toast(err.message || 'Failed to save profile');
    } finally {
      setOnboardingSaving(false);
    }
  };

  const handleUpdateName = async (name: string) => {
    try {
      const res = await api.updateUserName(name);
      setState(res.state);
      toast(`Nice to meet you, ${res.state.user.name}!`);
    } catch (err: any) {
      toast(err.message || 'Could not update name');
    }
  };

  const handleSetGoal = async (role: TargetRole) => {
    try {
      const res = await api.setGoal(role);
      setState(res.state);
      await runAgentsAnimation(
        ['Gap Analyst', 'Planner', 'Critic', 'Curator'],
        `Calibrated for ${role}`
      );
    } catch (err: any) {
      toast(err.message || 'Failed to switch goal');
    }
  };

  const handleReplanAgents = async () => {
    const res = await api.replanAgents();
    setState(res.state);
    await runAgentsAnimation(
      ['Evaluator', 'Gap Analyst', 'Planner', 'Critic', 'Curator'],
      'Roadmap refreshed'
    );
  };

  const handleRunAgentAudit = async () => {
    try {
      const res = await api.runAgentAudit();
      setState(res.state);
      handleRewardEffects(res.reward);
      toast('Multi-Agent Workspace Audit complete (+15 XP)');
      return res.audit;
    } catch (err: any) {
      toast(err.message || 'Multi-Agent Audit failed');
      return null;
    }
  };

  const handleAutoApplyJobs = async () => {
    try {
      await runAgentsAnimation([
        'Resume Writer',
        'Resume Verifier',
        'ATS Analyst',
        'Auto-Applier',
      ]);
      const res = await api.autoApplyJobs(0, 3);
      setState(res.state);
      if (res.reward) {
        handleRewardEffects(res.reward, 'Auto-Applied');
      }
      toast(
        res.result.appliedCount > 0
          ? `Auto-applied to ${res.result.appliedCount} matching roles`
          : 'All matching jobs already applied'
      );
      return res.result;
    } catch (err: any) {
      toast(err.message || 'Auto-apply failed');
      return null;
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

  const handleOpenMentorWithRag = useCallback(() => {
    if (!ragEnabled) {
      setRagEnabled(true);
      api.logRagToggle(true).then((r) => setState(r.state)).catch(() => {});
    }
    setMentorOpen(true);
  }, [ragEnabled]);

  const commands = [
    ...NAV_ITEMS.map((item) => ({
      label: `${item.label} (${item.group})`,
      action: () => navigate(item.id),
    })),
    {
      label: 'Start guided tour',
      action: () => {
        navigate('command');
        setTourStep(0);
      },
    },
    {
      label: 'Toggle light or dark theme',
      action: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    },
    {
      label: 'Ask Built-in RAG Mentor',
      action: handleOpenMentorWithRag,
    },
    {
      label: 'Run agents: replan roadmap',
      action: handleReplanAgents,
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

  const userInitial = (state.user.name || 'U').trim().charAt(0).toUpperCase();

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

          <div className="side-cal">
            <div className="mute" style={{ fontSize: 11, fontWeight: 600 }}>
              Calibrated for
            </div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>
              {state.user.role}
            </div>
          </div>

          {SIDEBAR_GROUPS.map((groupName) => {
            const items = NAV_ITEMS.filter((x) => x.group === groupName);
            return (
              <details
                key={groupName}
                className="sg"
                open
              >
                <summary>{groupName}</summary>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`nv ${screen === item.id ? 'on' : ''}`}
                      aria-current={screen === item.id ? 'page' : undefined}
                      onClick={() => navigate(item.id)}
                    >
                      <Icon size={17} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </details>
            );
          })}

          <div className="side-foot">
            <div className="row" style={{ justifyContent: 'space-between', padding: '0 4px' }}>
              <span className="mute font-mono-num">Lvl {state.user.level}</span>
              <span className="mute font-mono-num">{state.user.streak.count}d</span>
            </div>
            <button
              className="side-user-btn"
              onClick={() => setRewardsOpen(true)}
              title="Open Rewards, Profile & Sign out"
            >
              <span className="avatar-sm">{userInitial}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="truncate" style={{ fontWeight: 600, fontSize: 13 }}>
                  {state.user.name}
                </div>
                <div className="mute truncate" style={{ fontSize: 11.5 }}>
                  {state.user.email || `${state.user.xp} XP · Profile`}
                </div>
              </div>
            </button>
          </div>
        </nav>

        {/* Main Workspace */}
        <main tabIndex={-1}>
          {/* Top Bar */}
          <div className="top">
            <span className="mute">
              place1ai · {NAV_ITEMS.find((i) => i.id === screen)?.label || 'Command Centre'}
            </span>
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
                navigate('command');
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
            <button className="p" onClick={handleOpenMentorWithRag}>
              Ask AI Mentor
            </button>
          </div>

          {/* Active Screen */}
          {screen === 'command' && (
            <CommandCentreView
              state={state}
              onNavigate={navigate}
              onSetGoal={handleSetGoal}
              onUpdateName={handleUpdateName}
              onOpenMentorWithRag={handleOpenMentorWithRag}
              onOpenVoiceOnboarding={() => setShowOnboarding(true)}
              onReplanAgents={handleReplanAgents}
              onRunAgentAudit={handleRunAgentAudit}
              onAutoApplyJobs={handleAutoApplyJobs}
              onStartFastTour={() => setTourStep(0)}
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
                  toast('+20 XP: goal checked off');
                }
              }}
            />
          )}

          {screen === 'roadmap' && (
            <div>
              <div className="pn glass-hero" style={{ marginBottom: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Your Personalized Career Roadmap</h2>
                    <span className="mute">
                      Built for <b>{state.user.role}</b> · Update your goal anytime with Voice Onboarding.
                    </span>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button onClick={() => setShowOnboarding(true)}>
                      Voice Roadmap Finder
                    </button>
                    <button className="p" onClick={handleReplanAgents}>
                      Refresh Plan
                    </button>
                  </div>
                </div>
              </div>
              <RoadmapView
                state={state}
                onNavigate={navigate}
                onReorder={handleReorderRoadmap}
                onCompleteStage={handleCompleteStage}
                onClaimChest={handleClaimChest}
              />
            </div>
          )}

          {screen === 'resume' && (
            <ResumeAnalyzerView
              state={state}
              onNavigate={navigate}
              onStateUpdate={setState}
              onToast={toast}
              onSaveResume={async (resume) => {
                const res = await api.updateResume(resume);
                setState(res.state);
              }}
              onAddKeyword={async (kw) => {
                const res = await api.addResumeKeyword(kw);
                setState(res.state);
                toast(`${kw} added as learning`);
              }}
              onTailorResume={async (jobId) => {
                const res = await api.tailorResume(jobId);
                setState(res.state);
                toast('Tailored resume saved to SQLite');
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

          {screen === 'tutortree' && (
            <TutorTreeView
              state={state}
              onStateUpdate={setState}
              onAssessSkill={(skill) => {
                setQuizSkill(skill);
                setAptitudeMode('bkt');
                navigate('quiz');
              }}
            />
          )}

          {screen === 'rag' && (
            <RagHubView
              state={state}
              onStateUpdate={setState}
              onOpenMentorWithRag={handleOpenMentorWithRag}
            />
          )}

          {screen === 'agents' && (
            <AgentsView
              state={state}
              onReplan={handleReplanAgents}
              onStateUpdate={setState}
              onToast={toast}
            />
          )}

          {screen === 'dsa' && (
            <PracticeView
              state={state}
              initialTab={practiceTab}
              onStateUpdate={setState}
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

          {screen === 'concepts' && (
            <CoreConceptsView
              state={state}
              onNavigate={navigate}
              onStateUpdate={setState}
              onToast={toast}
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

          {screen === 'interview' && (
            <MockInterviewsView
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

          {screen === 'aptitude' && (
            <AptitudeLabView
              state={state}
              initialSkill={quizSkill}
              initialMode={aptitudeMode}
              onNavigate={navigate}
              onToast={toast}
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

          {screen === 'daily' && (
            <DailyChallengeView
              state={state}
              onNavigate={navigate}
              onClaimChest={handleClaimChest}
              onSubmitChallenge={async (challengeId, answerIndex) => {
                const res = await api.submitDailyChallenge(challengeId, answerIndex);
                setState(res.state);
                if (res.reward) {
                  handleRewardEffects(res.reward, '+45 XP');
                  toast('+45 XP: Daily Challenge completed');
                }
                return res;
              }}
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
            />
          )}

          {screen === 'progress' && (
            <MyProgressHubView
              state={state}
              initialTab={progressTab}
              onNavigate={navigate}
              onStateUpdate={setState}
              onReorderRoadmap={handleReorderRoadmap}
              onCompleteStage={handleCompleteStage}
              onClaimChest={handleClaimChest}
              onSetGoal={handleSetGoal}
              onToast={toast}
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
              onAddTracker={async (company, role) => {
                const res = await api.addTracker(company, role);
                setState(res.state);
                toast('Application added');
              }}
              onMoveTracker={async (id, stage: TrackerStage) => {
                const res = await api.moveTracker(id, stage);
                setState(res.state);
                if (res.reward) {
                  handleRewardEffects(res.reward, stage);
                }
              }}
              onDeleteTracker={async (id) => {
                const res = await api.deleteTracker(id);
                setState(res.state);
              }}
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

          {screen === 'analytics' && (
            <AnalyticsView state={state} onNavigate={navigate} />
          )}

          {screen === 'leaderboard' && (
            <LeaderboardView state={state} onNavigate={navigate} />
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bnav" aria-label="Main mobile">
        {MOBILE_TABS.map((id) => {
          const item = NAV_ITEMS.find((x) => x.id === id)!;
          const Icon = item.icon;
          return (
            <button
              key={id}
              className={`tab ${screen === id ? 'on' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          className="tab"
          onClick={() => setMobileSheetOpen((v) => !v)}
        >
          <Bot size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Overflow Sheet */}
      <div className={`sheet ${mobileSheetOpen ? 'open' : ''}`}>
        {NAV_ITEMS.filter((i) => !MOBILE_TABS.includes(i.id)).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nv ${screen === item.id ? 'on' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Floating Mentor Trigger + Speed Button */}
      <button
        className="p chat-fab"
        onClick={handleOpenMentorWithRag}
        aria-label="Open chatbot"
      >
        <span style={{ width: 18, height: 18, display: 'inline-block' }}>
          <BrandLogo />
        </span>
        AI Mentor
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
          const targetScreen = TOUR_STEPS[idx]?.screen || 'command';
          navigate(targetScreen);
          setTourStep(idx);
        }}
        onOpenRagMentor={handleOpenMentorWithRag}
        onOpenVoiceOnboarding={() => setShowOnboarding(true)}
        onClose={() => setTourStep(null)}
      />

      {showOnboarding && (
        <OnboardingModal
          initialName={state.user.name}
          initialProfile={state.user.prof}
          saving={onboardingSaving}
          onSave={handleSaveOnboarding}
          onCancel={state.user.prof ? () => setShowOnboarding(false) : undefined}
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
