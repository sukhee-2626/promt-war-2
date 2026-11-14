import type {
  AppState,
  BoostInventory,
  InterviewScore,
  InterviewType,
  PivotDiff,
  PromptDuelResult,
  SkillKey,
  SkillQuizQuestion,
  TargetRole,
  TrackerStage,
  UserProfile,
} from '../types';

const TOKEN_KEY = 'place1ai_session_token';

export function getSavedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getSavedToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['x-session-token'] = token;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface RewardResult {
  xp: number;
  leveledUp: boolean;
  newlyUnlockedBadges: string[];
}

export const api = {
  checkSession: () =>
    req<{ authenticated: boolean; sessionToken?: string; state: AppState | null }>(
      '/api/auth/session'
    ),

  login: async (name?: string, email?: string) => {
    const res = await req<{
      authenticated: boolean;
      sessionToken: string;
      isNew: boolean;
      state: AppState;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
    saveToken(res.sessionToken);
    return res;
  },

  logout: async () => {
    await req('/api/auth/logout', { method: 'POST' });
    saveToken(null);
  },

  saveOnboarding: (profile: UserProfile) =>
    req<{ state: AppState; reward: RewardResult }>('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  setGoal: (role: TargetRole) =>
    req<{ state: AppState }>('/api/goal', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  replanAgents: () =>
    req<{ state: AppState }>('/api/agents/replan', {
      method: 'POST',
    }),

  reorderRoadmap: (orderedIds: number[]) =>
    req<{ state: AppState; message?: string }>('/api/roadmap/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),

  completeStage: () =>
    req<{ state: AppState; reward: RewardResult; label: string; completedAll: boolean }>(
      '/api/roadmap/stage',
      { method: 'POST' }
    ),

  getSkillQuiz: (skillKey: SkillKey) =>
    req<{ skillKey: SkillKey; label: string; questions: SkillQuizQuestion[] }>(
      `/api/assess/${skillKey}`
    ),

  submitQuiz: (answers: number[], skillKey: SkillKey = 'js', answerKeys?: number[]) =>
    req<{
      skillKey: SkillKey;
      skillLabel: string;
      score: number;
      total: number;
      priorPercent: number;
      masteryPercent: number;
      replanned: boolean;
      reward: RewardResult;
      state: AppState;
    }>('/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ answers, skillKey, answerKeys }),
    }),

  getPivotDiff: (role: TargetRole) =>
    req<{ diff: PivotDiff }>(`/api/pivot?role=${encodeURIComponent(role)}`),

  runPromptDuel: (topic: string, userPrompt: string) =>
    req<{ result: PromptDuelResult; reward: RewardResult; state: AppState }>(
      '/api/practice/prompt-duel',
      {
        method: 'POST',
        body: JSON.stringify({ topic, userPrompt }),
      }
    ),

  updateResume: (resume: {
    name: string;
    summary: string;
    skills: string;
    experience: string;
  }) =>
    req<{ state: AppState }>('/api/resume', {
      method: 'PUT',
      body: JSON.stringify(resume),
    }),

  addResumeKeyword: (keyword: string) =>
    req<{ state: AppState }>('/api/resume/keyword', {
      method: 'POST',
      body: JSON.stringify({ keyword }),
    }),

  tailorResume: (jobId: string) =>
    req<{ state: AppState }>('/api/resume/tailor', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    }),

  applyJob: (jobId: string) =>
    req<{ state: AppState; reward: RewardResult }>('/api/jobs/apply', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    }),

  addTracker: (company: string, role?: string) =>
    req<{ state: AppState }>('/api/tracker', {
      method: 'POST',
      body: JSON.stringify({ company, role }),
    }),

  moveTracker: (id: number, stage: TrackerStage) =>
    req<{ state: AppState; reward: RewardResult | null }>(`/api/tracker/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),

  deleteTracker: (id: number) =>
    req<{ state: AppState }>(`/api/tracker/${id}`, { method: 'DELETE' }),

  toggleDsa: (slug: string, solved: boolean) =>
    req<{ state: AppState; reward: RewardResult | null }>('/api/dsa/toggle', {
      method: 'POST',
      body: JSON.stringify({ slug, solved }),
    }),

  submitAptitude: (score: number) =>
    req<{ state: AppState; reward: RewardResult }>('/api/aptitude/submit', {
      method: 'POST',
      body: JSON.stringify({ score }),
    }),

  addMeeting: (topic: string, whenMs: number, link: string) =>
    req<{ state: AppState; reward: RewardResult }>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify({ topic, whenMs, link }),
    }),

  deleteMeeting: (id: number) =>
    req<{ state: AppState }>(`/api/meetings/${id}`, { method: 'DELETE' }),

  completeFocus: (minutes: number) =>
    req<{ state: AppState; reward: RewardResult }>('/api/focus/complete', {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    }),

  toggleProgress: (payload: {
    kind: 'resources' | 'projects' | 'weekly' | 'quests' | 'card' | 'meeting_join' | 'precall';
    item?: string;
    checked?: boolean;
    xpAmount?: number;
  }) =>
    req<{ state: AppState; reward: RewardResult | null }>('/api/progress/toggle', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  claimChest: () =>
    req<{ state: AppState; reward: RewardResult }>('/api/rewards/chest', {
      method: 'POST',
    }),

  manageBoost: (action: 'use' | 'buy', boostKey?: keyof BoostInventory) =>
    req<{ state: AppState; reward: RewardResult | null }>('/api/rewards/boost', {
      method: 'POST',
      body: JSON.stringify({ action, boostKey }),
    }),

  evaluateInterview: (type: InterviewType, qaPairs: Array<{ q: string; a: string }>) =>
    req<{
      sessionId: number;
      evaluation: {
        overallScore: number;
        breakdown: InterviewScore;
        reviews: Array<{
          q: string;
          w: number;
          s: InterviewScore;
          tip: string;
          answer?: string;
        }>;
        summaryFeedback: string;
      };
      reward: RewardResult;
      state: AppState;
    }>('/api/interview/evaluate', {
      method: 'POST',
      body: JSON.stringify({ type, qaPairs }),
    }),

  generateCoverLetter: (payload: {
    company: string;
    role: string;
    skills: string;
    achievement: string;
    whyCompany: string;
  }) =>
    req<{ letter: string }>('/api/kit/cover-letter', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  sendMentorMessage: (question: string, ragEnabled: boolean) =>
    req<{ reply: { answer: string; sources: string[] }; state: AppState }>(
      '/api/mentor/chat',
      {
        method: 'POST',
        body: JSON.stringify({ question, ragEnabled }),
      }
    ),

  logRagToggle: (enabled: boolean) =>
    req<{ state: AppState }>('/api/mentor/rag-log', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
};
