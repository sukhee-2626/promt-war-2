export type SkillKey = 'html' | 'js' | 'react' | 'node' | 'python' | 'sql' | 'db' | 'git';

export type TargetRole =
  | 'Full Stack Developer'
  | 'Data Analyst'
  | 'Data Scientist'
  | 'ML Engineer'
  | 'Backend Developer';

export type TrackerStage = 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export type InterviewType = 'Behavioral' | 'Technical' | 'HR' | 'DSA' | 'Communication';

export interface UserProfile {
  int: string[];
  lvl: string;
  hrs: number;
  needs: string[];
  goal: string;
}

export interface BoostInventory {
  hint: number;
  xp: number;
  shield: number;
}

export interface RoadmapStep {
  id: number;
  skillKey: SkillKey;
  title: string;
  hours: number;
  sortOrder: number;
  isRemedial: boolean;
  completed: boolean;
}

export interface ResumeData {
  name: string;
  summary: string;
  skills: string;
  experience: string;
}

export interface AtsBreakdown {
  score: number;
  kwScore: number;
  impactScore: number;
  hit: string[];
  miss: string[];
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  requiredSkills: SkillKey[];
  fit: number;
  missing: SkillKey[];
  applied: boolean;
}

export interface TrackerEntry {
  id: number;
  company: string;
  role: string;
  stage: TrackerStage;
  appliedDate: string;
  notes?: string;
}

export interface MeetingSession {
  id: number;
  topic: string;
  whenMs: number;
  link: string;
}

export interface InterviewScore {
  Communication: number;
  Structure: number;
  'Relevance and depth': number;
  Confidence: number;
}

export interface InterviewQuestionReview {
  q: string;
  w: number;
  s: InterviewScore;
  tip: string;
  answer?: string;
}

export interface InterviewSessionRecord {
  id: number;
  type: InterviewType;
  overallScore: number;
  breakdown: InterviewScore;
  reviews: InterviewQuestionReview[];
  summaryFeedback?: string;
  createdAt: string;
}

export interface AgentLogEntry {
  id: number;
  agent: string;
  message: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'assistant';
  content: string;
  sources: string[];
  ragEnabled: boolean;
  createdAt: string;
}

export interface FocusStats {
  sessions: number;
  minutes: number;
}

export interface StreakData {
  date: string;
  count: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  isMe: boolean;
}

export interface AgentDebateTurn {
  id: number;
  roadmapVersion: number;
  round: number;
  speaker: 'Planner' | 'Critic' | 'Curator';
  message: string;
  createdAt: string;
}

export interface PivotDiff {
  fromRole: TargetRole;
  toRole: TargetRole;
  transfers: string[];
  partlyUseful: string[];
  newSkills: string[];
  noLongerNeeded: string[];
  overlapPercent: number;
  hoursSaved: number;
  insight: string;
}

export interface SkillQuizQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface PromptDuelResult {
  topic: string;
  userScore: number;
  challengerScore: number;
  winner: 'user' | 'challenger' | 'draw';
  uniqueTokensUser: number;
  uniqueTokensChallenger: number;
  feedback: string;
  challengerPrompt: string;
}

export interface AppState {
  user: {
    id: number;
    name: string;
    email: string;
    role: TargetRole;
    xp: number;
    level: number;
    coin: number;
    star: number;
    stage: number;
    chestClaimedToday: boolean;
    boost: BoostInventory;
    prof: UserProfile | null;
    roadmapVersion: number;
    aptitudeBest: number;
    badgesUnlocked: string[];
    streak: StreakData;
    focus: FocusStats;
    completedResources: string[];
    completedProjects: string[];
    weeklyDone: string[];
    completedQuests: string[];
  };
  skills: Record<SkillKey, number>;
  readiness: number;
  roadmap: RoadmapStep[];
  resume: ResumeData;
  ats: AtsBreakdown;
  dsaSolved: string[];
  jobs: JobPosting[];
  tracker: TrackerEntry[];
  meetings: MeetingSession[];
  interviews: InterviewSessionRecord[];
  agentLogs: AgentLogEntry[];
  agentDebate: AgentDebateTurn[];
  chatMessages: ChatMessage[];
  leaderboard: LeaderboardEntry[];
}
