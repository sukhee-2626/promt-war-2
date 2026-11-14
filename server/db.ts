import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  DEFAULT_SKILLS,
  JD_KEYWORDS,
  JOB_CATALOG,
  ROLE_PLANS,
  SKILL_META,
} from './data.ts';
import type {
  AgentLogEntry,
  AppState,
  AtsBreakdown,
  BoostInventory,
  ChatMessage,
  CustomAgentRecord,
  CustomRagDoc,
  FocusStats,
  InterviewScore,
  InterviewSessionRecord,
  InterviewType,
  MeetingSession,
  ResumeData,
  RoadmapStep,
  SkillKey,
  StreakData,
  TargetRole,
  TrackerEntry,
  TrackerStage,
  UserProfile,
} from '../src/types.ts';

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'place1ai-data')
  : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'place1ai.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Full Stack Developer',
  xp INTEGER NOT NULL DEFAULT 240,
  coin INTEGER NOT NULL DEFAULT 120,
  star INTEGER NOT NULL DEFAULT 0,
  stage INTEGER NOT NULL DEFAULT 1,
  chest_claimed_date TEXT NOT NULL DEFAULT '',
  boost_json TEXT NOT NULL DEFAULT '{"hint":2,"xp":1,"shield":1}',
  prof_json TEXT DEFAULT NULL,
  roadmap_version INTEGER NOT NULL DEFAULT 1,
  aptitude_best INTEGER NOT NULL DEFAULT 0,
  badges_json TEXT NOT NULL DEFAULT '[]',
  streak_json TEXT NOT NULL DEFAULT '{}',
  focus_json TEXT NOT NULL DEFAULT '{"sessions":0,"minutes":0}',
  completed_resources_json TEXT NOT NULL DEFAULT '[]',
  completed_projects_json TEXT NOT NULL DEFAULT '[]',
  weekly_done_json TEXT NOT NULL DEFAULT '[]',
  completed_quests_json TEXT NOT NULL DEFAULT '["Read the closures chapter"]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id INTEGER NOT NULL,
  skill_key TEXT NOT NULL,
  mastery REAL NOT NULL,
  PRIMARY KEY (user_id, skill_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmap_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  skill_key TEXT NOT NULL,
  title TEXT NOT NULL,
  hours INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  is_remedial INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resumes (
  user_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  skills TEXT NOT NULL,
  experience TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dsa_progress (
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  solved_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, slug),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tracker_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id TEXT DEFAULT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Saved',
  applied_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  when_ms INTEGER NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  breakdown_json TEXT NOT NULL,
  reviews_json TEXT NOT NULL,
  summary_feedback TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  agent TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  sources_json TEXT NOT NULL DEFAULT '[]',
  rag_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_debates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  roadmap_version INTEGER NOT NULL,
  round INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'activity',
  day_iso TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rag_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role_focus TEXT NOT NULL,
  mission TEXT NOT NULL,
  tools_json TEXT NOT NULL DEFAULT '[]',
  last_output TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN daily_challenge_date TEXT NOT NULL DEFAULT ''");
} catch {
  // column already exists
}

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const levelFromXp = (xp: number): number => Math.floor(xp / 200) + 1;

export function computeAts(resume: ResumeData): AtsBreakdown {
  const combined = `${resume.summary} ${resume.skills} ${resume.experience}`.toLowerCase();
  const hit = JD_KEYWORDS.filter((kw) => combined.includes(kw));
  const kwScore = Math.round((hit.length / JD_KEYWORDS.length) * 45);
  const impactScore = /\d/.test(resume.experience) ? 15 : 5;
  const score = kwScore + 15 + 15 + 10 + impactScore;
  const miss = JD_KEYWORDS.filter((kw) => !hit.includes(kw));
  return { score, kwScore, impactScore, hit, miss };
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function seedRoadmapForRole(userId: number, role: TargetRole, includeRemedial = false) {
  db.prepare('DELETE FROM roadmap_steps WHERE user_id = ?').run(userId);
  const steps = ROLE_PLANS[role] || ROLE_PLANS['Full Stack Developer'];
  const insert = db.prepare(
    'INSERT INTO roadmap_steps (user_id, skill_key, title, hours, sort_order, is_remedial, completed) VALUES (?, ?, ?, ?, ?, ?, 0)'
  );
  let order = 0;
  if (includeRemedial && role === 'Full Stack Developer') {
    insert.run(userId, 'js', 'JS closures and async (remedial)', 6, order++, 1);
  }
  for (const s of steps) {
    insert.run(userId, s.skillKey, s.title, s.hours, order++, 0);
  }
}

export function appendAgentLog(userId: number, agent: string, message: string) {
  db.prepare('INSERT INTO agent_logs (user_id, agent, message) VALUES (?, ?, ?)').run(
    userId,
    agent,
    message
  );
}

export function appendDebateTurn(
  userId: number,
  roadmapVersion: number,
  round: number,
  speaker: 'Planner' | 'Critic' | 'Curator',
  message: string
) {
  db.prepare(
    'INSERT INTO agent_debates (user_id, roadmap_version, round, speaker, message) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, roadmapVersion, round, speaker, message);
}

export function findOrCreateUser(params: {
  sessionToken?: string;
  name?: string;
  email?: string;
}): { userId: number; sessionToken: string; isNew: boolean } {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanName = (params.name || '').trim();

  if (cleanEmail) {
    const byEmail = db
      .prepare('SELECT id, session_token FROM users WHERE lower(email) = ? LIMIT 1')
      .get(cleanEmail) as { id: number; session_token: string } | undefined;
    if (byEmail) {
      if (cleanName) {
        db.prepare('UPDATE users SET name = ? WHERE id = ?').run(cleanName, byEmail.id);
      }
      return { userId: byEmail.id, sessionToken: byEmail.session_token, isNew: false };
    }
  }

  if (params.sessionToken) {
    const byToken = db
      .prepare('SELECT id, session_token FROM users WHERE session_token = ? LIMIT 1')
      .get(params.sessionToken) as { id: number; session_token: string } | undefined;
    if (byToken) {
      return { userId: byToken.id, sessionToken: byToken.session_token, isNew: false };
    }
  }

  const displayName = cleanName || (cleanEmail ? cleanEmail.split('@')[0] : 'Asha Rao');
  const token =
    params.sessionToken ||
    `p1_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const today = todayIso();
  const streakInit = JSON.stringify({ date: today, count: 1 });

  const info = db
    .prepare(
      'INSERT INTO users (session_token, name, email, streak_json) VALUES (?, ?, ?, ?)'
    )
    .run(token, displayName, cleanEmail, streakInit);
  const userId = Number(info.lastInsertRowid);

  db.prepare('INSERT INTO xp_events (user_id, amount, source, day_iso) VALUES (?, ?, ?, ?)').run(
    userId,
    40,
    'welcome',
    today
  );

  const insertSkill = db.prepare(
    'INSERT INTO user_skills (user_id, skill_key, mastery) VALUES (?, ?, ?)'
  );
  for (const [k, v] of Object.entries(DEFAULT_SKILLS)) {
    insertSkill.run(userId, k, v);
  }

  seedRoadmapForRole(userId, 'Full Stack Developer', false);

  db.prepare(
    'INSERT INTO resumes (user_id, name, summary, skills, experience) VALUES (?, ?, ?, ?, ?)'
  ).run(
    userId,
    displayName,
    'Computer science student building web projects with Python and SQL.',
    'Python, SQL, HTML, JavaScript (learning)',
    'Built a library tracker in Python and SQL used by 40 students\nDesigned 3 HTML pages for a college club'
  );

  const initialLogs: Array<[string, string]> = [
    ['Planner', 'proposed JavaScript, TypeScript, React, Node.js, SQL, Docker in 64 hours.'],
    ['Critic', 'React before JavaScript basics is risky and the plan ignores your 8 hours a week. Revise.'],
    ['Planner', 'moved JavaScript first and spread tasks over 8 weeks.'],
    ['Curator', 'picked 3 resources from the library. All links verified.'],
    ['Verifier', 'resume lists JavaScript as learning, not proficient.'],
    ['Profiler', 'read your resume and found 4 skills'],
    ['Gap Analyst', 'matched you to Full Stack Developer: 38%'],
    [
      'Researcher',
      'refreshed market data on 14 Nov 2026. TypeScript is now in 45% of Full Stack postings, so a TypeScript step was added.',
    ],
  ];
  for (const [ag, msg] of initialLogs) {
    appendAgentLog(userId, ag, msg);
  }

  appendDebateTurn(
    userId,
    1,
    1,
    'Planner',
    'Round 1 proposal: JavaScript (12h) → TypeScript (8h) → React (16h) → Node.js (14h) → SQL DB (8h) → Git/Docker (6h).'
  );
  appendDebateTurn(
    userId,
    1,
    1,
    'Critic',
    'Objection: React cannot precede JavaScript closures, and 64 total hours must be paced across 8 weeks at 8h/week.'
  );
  appendDebateTurn(
    userId,
    1,
    2,
    'Planner',
    'Revised plan: Enforced topological prerequisite order (HTML → JS → React/Node, SQL → Databases) and paced weekly milestones.'
  );
  appendDebateTurn(
    userId,
    1,
    2,
    'Curator',
    'Verified MDN, javascript.info, and freeCodeCamp resources attached to each step.'
  );

  db.prepare(
    'INSERT INTO chat_messages (user_id, sender, content, sources_json, rag_enabled) VALUES (?, ?, ?, ?, ?)'
  ).run(
    userId,
    'assistant',
    `Hi ${displayName}. Ask me why a step was chosen, or enable RAG to search your live SQLite profile, resume, roadmap, and market data.`,
    '[]',
    0
  );

  return { userId, sessionToken: token, isNew: true };
}

export function touchDailyStreak(userId: number) {
  const row = db.prepare('SELECT streak_json FROM users WHERE id = ?').get(userId) as
    | { streak_json: string }
    | undefined;
  if (!row) return;
  const streak = parseJson<StreakData>(row.streak_json, { date: '', count: 0 });
  const today = todayIso();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (streak.date !== today) {
    const nextCount = streak.date === yesterday ? (streak.count || 0) + 1 : 1;
    const updated: StreakData = { date: today, count: nextCount };
    db.prepare('UPDATE users SET streak_json = ? WHERE id = ?').run(
      JSON.stringify(updated),
      userId
    );
  }
}

export function awardXpAndEvaluateBadges(
  userId: number,
  xpDelta: number,
  coinDelta = 0,
  starDelta = 0,
  source = 'activity'
): { xp: number; leveledUp: boolean; newlyUnlockedBadges: string[] } {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { xp: 0, leveledUp: false, newlyUnlockedBadges: [] };

  const prevLevel = levelFromXp(user.xp);
  const nextXp = Math.max(0, user.xp + xpDelta);
  const nextLevel = levelFromXp(nextXp);
  const nextCoin = Math.max(0, user.coin + coinDelta);
  const nextStar = Math.max(0, user.star + starDelta);

  db.prepare('UPDATE users SET xp = ?, coin = ?, star = ? WHERE id = ?').run(
    nextXp,
    nextCoin,
    nextStar,
    userId
  );

  if (xpDelta > 0) {
    db.prepare('INSERT INTO xp_events (user_id, amount, source, day_iso) VALUES (?, ?, ?, ?)').run(
      userId,
      xpDelta,
      source,
      todayIso()
    );
  }

  // Evaluate badges
  const dsaCount = (
    db.prepare('SELECT COUNT(*) as c FROM dsa_progress WHERE user_id = ?').get(userId) as {
      c: number;
    }
  ).c;
  const ivCount = (
    db.prepare('SELECT COUNT(*) as c FROM interview_sessions WHERE user_id = ?').get(userId) as {
      c: number;
    }
  ).c;
  const meetCount = (
    db.prepare('SELECT COUNT(*) as c FROM meetings WHERE user_id = ?').get(userId) as {
      c: number;
    }
  ).c;

  const focus = parseJson<FocusStats>(user.focus_json, { sessions: 0, minutes: 0 });
  const projects = parseJson<string[]>(user.completed_projects_json, []);
  const streak = parseJson<StreakData>(user.streak_json, { date: todayIso(), count: 1 });
  const prof = parseJson<UserProfile | null>(user.prof_json, null);
  const existingBadges = parseJson<string[]>(user.badges_json, []);

  const badgeChecks: Array<[string, boolean]> = [
    ['First steps', !!prof],
    ['Problem solver', dsaCount >= 5],
    ['DSA grinder', dsaCount >= 15],
    ['Aptitude ace', user.aptitude_best >= 8],
    ['Interview ready', ivCount >= 1],
    ['Deep focus', (focus.sessions || 0) >= 5],
    ['Stage clearer', user.stage >= 3],
    ['Builder', projects.length >= 1],
    ['Connector', meetCount > 0],
    ['Level 3', nextLevel >= 3],
    ['Consistent', (streak.count || 0) >= 3],
  ];

  const newlyUnlocked = badgeChecks
    .filter(([name, ok]) => ok && !existingBadges.includes(name))
    .map(([name]) => name);

  if (newlyUnlocked.length > 0) {
    const allBadges = [...existingBadges, ...newlyUnlocked];
    const bonusXp = newlyUnlocked.length * 20;
    db.prepare('UPDATE users SET badges_json = ?, xp = xp + ?, coin = coin + ? WHERE id = ?').run(
      JSON.stringify(allBadges),
      bonusXp,
      bonusXp,
      userId
    );
  }

  return {
    xp: nextXp + newlyUnlocked.length * 20,
    leveledUp: nextLevel > prevLevel,
    newlyUnlockedBadges: newlyUnlocked,
  };
}

export function getAppState(userId: number): AppState {
  touchDailyStreak(userId);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!u) {
    throw new Error('User not found');
  }

  const skillRows = db
    .prepare('SELECT skill_key, mastery FROM user_skills WHERE user_id = ?')
    .all(userId) as Array<{ skill_key: SkillKey; mastery: number }>;

  const skills = { ...DEFAULT_SKILLS };
  for (const r of skillRows) {
    skills[r.skill_key] = r.mastery;
  }

  const skillKeys = Object.keys(SKILL_META) as SkillKey[];
  const readiness = Math.round(
    (skillKeys.reduce((acc, k) => acc + (skills[k] || 0), 0) / skillKeys.length) * 100
  );

  const roadmapRows = db
    .prepare('SELECT * FROM roadmap_steps WHERE user_id = ? ORDER BY sort_order ASC, id ASC')
    .all(userId) as any[];

  const roadmap: RoadmapStep[] = roadmapRows.map((r) => ({
    id: r.id,
    skillKey: r.skill_key as SkillKey,
    title: r.title,
    hours: r.hours,
    sortOrder: r.sort_order,
    isRemedial: Boolean(r.is_remedial),
    completed: Boolean(r.completed),
  }));

  const resRow = db.prepare('SELECT * FROM resumes WHERE user_id = ?').get(userId) as any;
  const resume: ResumeData = resRow
    ? {
        name: resRow.name,
        summary: resRow.summary,
        skills: resRow.skills,
        experience: resRow.experience,
      }
    : {
        name: u.name,
        summary: '',
        skills: '',
        experience: '',
      };

  const ats = computeAts(resume);

  const dsaRows = db
    .prepare('SELECT slug FROM dsa_progress WHERE user_id = ?')
    .all(userId) as Array<{ slug: string }>;
  const dsaSolved = dsaRows.map((d) => d.slug);

  const trackerRows = db
    .prepare('SELECT * FROM tracker_entries WHERE user_id = ? ORDER BY id DESC')
    .all(userId) as any[];
  const tracker: TrackerEntry[] = trackerRows.map((t) => ({
    id: t.id,
    company: t.company,
    role: t.role,
    stage: t.stage as TrackerStage,
    appliedDate: t.applied_date,
    notes: t.notes,
  }));

  const appliedJobIds = new Set(trackerRows.map((t) => t.job_id).filter(Boolean));
  const appliedTitles = new Set(trackerRows.map((t) => t.role));

  const jobs = JOB_CATALOG.map((j) => {
    const fit = Math.round(
      (j.requiredSkills.reduce((acc, k) => acc + (skills[k] || 0), 0) / j.requiredSkills.length) *
        100
    );
    const missing = j.requiredSkills.filter((k) => (skills[k] || 0) < 0.5);
    return {
      ...j,
      fit,
      missing,
      applied: appliedJobIds.has(j.id) || appliedTitles.has(j.title),
    };
  });

  const meetingRows = db
    .prepare('SELECT * FROM meetings WHERE user_id = ? ORDER BY when_ms ASC')
    .all(userId) as any[];
  const meetings: MeetingSession[] = meetingRows.map((m) => ({
    id: m.id,
    topic: m.topic,
    whenMs: m.when_ms,
    link: m.link,
  }));

  const ivRows = db
    .prepare('SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY id ASC')
    .all(userId) as any[];
  const interviews: InterviewSessionRecord[] = ivRows.map((iv) => ({
    id: iv.id,
    type: iv.type as InterviewType,
    overallScore: iv.overall_score,
    breakdown: parseJson<InterviewScore>(iv.breakdown_json, {
      Communication: 70,
      Structure: 70,
      'Relevance and depth': 70,
      Confidence: 70,
    }),
    reviews: parseJson(iv.reviews_json, []),
    summaryFeedback: iv.summary_feedback,
    createdAt: iv.created_at,
  }));

  const logRows = db
    .prepare('SELECT * FROM agent_logs WHERE user_id = ? ORDER BY id ASC')
    .all(userId) as any[];
  const agentLogs: AgentLogEntry[] = logRows.map((l) => ({
    id: l.id,
    agent: l.agent,
    message: l.message,
    createdAt: l.created_at,
  }));

  const debateRows = db
    .prepare('SELECT * FROM agent_debates WHERE user_id = ? ORDER BY id ASC')
    .all(userId) as any[];
  const agentDebate = debateRows.map((d) => ({
    id: d.id,
    roadmapVersion: d.roadmap_version,
    round: d.round,
    speaker: d.speaker as 'Planner' | 'Critic' | 'Curator',
    message: d.message,
    createdAt: d.created_at,
  }));

  const chatRows = db
    .prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY id ASC')
    .all(userId) as any[];
  const chatMessages: ChatMessage[] = chatRows.map((c) => ({
    id: c.id,
    sender: c.sender,
    content: c.content,
    sources: parseJson<string[]>(c.sources_json, []),
    ragEnabled: Boolean(c.rag_enabled),
    createdAt: c.created_at,
  }));

  const myCohortScore = u.xp * 4 + 300;
  const leaderboard = [
    { name: 'Meera', score: 1480, isMe: false },
    { name: 'Arjun', score: 1310, isMe: false },
    { name: `${u.name} (you)`, score: myCohortScore, isMe: true },
    { name: 'Kavin', score: 900, isMe: false },
    { name: 'Divya', score: 760, isMe: false },
  ].sort((a, b) => b.score - a.score);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(now.getDate() - now.getDay());

  const weekDates = dayNames.map((day, idx) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + idx);
    return { day, date: d.toISOString().slice(0, 10) };
  });

  const xpRows = db
    .prepare(
      'SELECT day_iso, SUM(amount) as total FROM xp_events WHERE user_id = ? AND day_iso >= ? GROUP BY day_iso'
    )
    .all(userId, weekDates[0].date) as Array<{ day_iso: string; total: number }>;
  const xpByDate = new Map(xpRows.map((r) => [r.day_iso, Number(r.total || 0)]));

  const velocityDays = weekDates.map((w) => ({
    day: w.day,
    date: w.date,
    xp: xpByDate.get(w.date) || 0,
  }));
  const totalWeek = velocityDays.reduce((a, b) => a + b.xp, 0);

  const completedQuests = parseJson<string[]>(u.completed_quests_json, []);
  const focus = parseJson<FocusStats>(u.focus_json, { sessions: 0, minutes: 0 });
  const dailyChallengeDone = u.daily_challenge_date === todayIso();
  const todayTasks = [
    {
      id: 'task-daily',
      title: 'Complete Daily Challenge',
      done: dailyChallengeDone,
      screen: 'daily',
    },
    {
      id: 'task-dsa',
      title: 'Solve a DSA problem',
      done: dsaSolved.length > 0,
      screen: 'dsa',
    },
    {
      id: 'task-rag',
      title: 'Query Built-in RAG Mentor',
      done: chatMessages.some((m) => m.sender === 'user'),
      screen: 'rag',
    },
    {
      id: 'task-quest',
      title: 'Complete a study quest or focus sprint',
      done: completedQuests.length >= 2 || (focus.sessions || 0) > 0,
      screen: 'daily',
    },
  ];

  const customDocRows = db
    .prepare('SELECT id, title, content, created_at FROM rag_documents WHERE user_id = ? ORDER BY id DESC')
    .all(userId) as Array<{ id: number; title: string; content: string; created_at: string }>;

  const customRagDocs: CustomRagDoc[] = customDocRows.map((d) => ({
    id: d.id,
    title: d.title,
    content: d.content,
    createdAt: d.created_at,
  }));

  const ragChunks = [
    {
      id: 'Resume',
      preview: `${resume.name} · ${resume.skills}`,
      tokens: `${resume.summary} ${resume.skills} ${resume.experience}`.split(/\s+/).filter(Boolean).length,
    },
    {
      id: 'Skill twin',
      preview: `${readiness}% overall readiness · Target: ${u.role}`,
      tokens: skillKeys.length * 4,
    },
    {
      id: 'Roadmap',
      preview: `v${u.roadmap_version} · ${roadmap.length} steps (${roadmap.map((s) => s.title).slice(0, 2).join(', ')})`,
      tokens: roadmap.length * 6,
    },
    {
      id: 'ATS',
      preview: `Score ${ats.score}/100 · ${ats.miss.length} missing keywords`,
      tokens: ats.hit.length + ats.miss.length + 12,
    },
    {
      id: 'Jobs',
      preview: `${jobs.length} calibrated roles matched (${jobs.map((j) => `${j.company} ${j.fit}%`).join(', ')})`,
      tokens: jobs.length * 8,
    },
    {
      id: 'Market: 2026 Postings',
      preview: 'Frontend 9.1K · Full Stack 7.3K · Data Analyst 6.4K postings indexed',
      tokens: 52,
    },
    ...customRagDocs.map((d) => ({
      id: `Note: ${d.title}`,
      preview: d.content.slice(0, 120) + (d.content.length > 120 ? '…' : ''),
      tokens: d.content.split(/\s+/).filter(Boolean).length,
      customDocId: d.id,
    })),
  ];

  const customAgentRows = db
    .prepare(
      'SELECT id, name, role_focus, mission, tools_json, last_output, created_at FROM custom_agents WHERE user_id = ? ORDER BY id DESC'
    )
    .all(userId) as Array<{
    id: number;
    name: string;
    role_focus: string;
    mission: string;
    tools_json: string;
    last_output: string;
    created_at: string;
  }>;

  const customAgents: CustomAgentRecord[] = customAgentRows.map((a) => ({
    id: a.id,
    name: a.name,
    roleFocus: a.role_focus,
    mission: a.mission,
    tools: parseJson<string[]>(a.tools_json, []),
    lastOutput: a.last_output,
    createdAt: a.created_at,
  }));

  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as TargetRole,
      xp: u.xp,
      level: levelFromXp(u.xp),
      coin: u.coin,
      star: u.star,
      stage: u.stage,
      chestClaimedToday: u.chest_claimed_date === todayIso(),
      dailyChallengeDone,
      boost: parseJson<BoostInventory>(u.boost_json, { hint: 2, xp: 1, shield: 1 }),
      prof: parseJson<UserProfile | null>(u.prof_json, null),
      roadmapVersion: u.roadmap_version,
      aptitudeBest: u.aptitude_best,
      badgesUnlocked: parseJson<string[]>(u.badges_json, []),
      streak: parseJson<StreakData>(u.streak_json, { date: todayIso(), count: 1 }),
      focus,
      completedResources: parseJson<string[]>(u.completed_resources_json, []),
      completedProjects: parseJson<string[]>(u.completed_projects_json, []),
      weeklyDone: parseJson<string[]>(u.weekly_done_json, []),
      completedQuests,
    },
    skills,
    readiness,
    roadmap,
    resume,
    ats,
    dsaSolved,
    jobs,
    tracker,
    meetings,
    interviews,
    agentLogs,
    agentDebate,
    chatMessages,
    leaderboard,
    xpVelocity: {
      totalWeek,
      days: velocityDays,
    },
    todayTasks,
    ragChunks,
    customRagDocs,
    customAgents,
  };
}
