export type SkillKey = 'html' | 'js' | 'react' | 'node' | 'python' | 'sql' | 'db' | 'git';

export type TargetRole =
  | 'Frontend Engineer'
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

export interface XpVelocityPoint {
  day: string;
  date: string;
  xp: number;
}

export interface TodayTaskItem {
  id: string;
  title: string;
  done: boolean;
  screen: string;
}

export interface RagChunkInfo {
  id: string;
  preview: string;
  tokens: number;
  customDocId?: number;
}

export interface CustomRagDoc {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface RagQueryResult {
  query: string;
  retrieved: Array<{ id: string; text: string; score: number }>;
  answer: string;
  sources: string[];
  usedGemini: boolean;
}

export interface AtsAiAudit {
  matchScore: number;
  verdict: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  rewrittenBullets: string[];
  usedGemini: boolean;
}

export interface AgentAuditResult {
  summary: string;
  findings: Array<{ agent: string; status: 'pass' | 'warn'; detail: string }>;
  usedGemini: boolean;
}

export interface AiProblemSolution {
  problem: string;
  intuition: string;
  optimalApproach: string;
  timeComplexity: string;
  spaceComplexity: string;
  codeSolution: string;
  edgeCases: string[];
  usedGemini: boolean;
}

export interface AutoApplyResult {
  appliedCount: number;
  appliedJobs: Array<{ company: string; title: string; fit: number }>;
  tailoredSummary: string;
  usedGemini: boolean;
}

export interface OnboardingRecommendation {
  recommendedRole: TargetRole;
  reason: string;
  spokenPitch: string;
  alternatives: Array<{ role: TargetRole; fit: number; summary: string }>;
  previewSteps: Array<{ title: string; hours: number; why: string }>;
  usedGemini: boolean;
}

export interface CustomAgentRecord {
  id: number;
  name: string;
  roleFocus: string;
  mission: string;
  tools: string[];
  lastOutput: string;
  createdAt: string;
}

export interface CustomAgentRunResult {
  agent: CustomAgentRecord;
  verdict: string;
  actions: string[];
  ragSourcesUsed: string[];
  usedGemini: boolean;
}

export interface CodeGradeResult {
  problemTitle: string;
  language: string;
  score: number;
  passedTests: number;
  totalTests: number;
  timeComplexity: string;
  spaceComplexity: string;
  feedback: string;
  optimizedSnippet: string;
  usedGemini: boolean;
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
    dailyChallengeDone: boolean;
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
  xpVelocity: {
    totalWeek: number;
    days: XpVelocityPoint[];
  };
  todayTasks: TodayTaskItem[];
  ragChunks: RagChunkInfo[];
  customRagDocs: CustomRagDoc[];
  customAgents: CustomAgentRecord[];
}
