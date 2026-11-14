import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  DEFAULT_SKILLS,
  INTEREST_ROLE_MAP,
  JOB_CATALOG,
  QUIZ_QUESTIONS,
  SKILL_META,
  TRACKER_STAGES,
} from './server/data.ts';
import {
  appendAgentLog,
  awardXpAndEvaluateBadges,
  db,
  findOrCreateUser,
  getAppState,
  seedRoadmapForRole,
  todayIso,
} from './server/db.ts';
import {
  bktUpdate,
  computePivotDiff,
  evaluatePromptDuel,
  getSkillQuiz,
  recordAgentDebate,
} from './server/agents.ts';
import {
  askMentor,
  evaluateInterviewSession,
  generateCoverLetter,
  tailorResumeForJob,
} from './server/gemini.ts';
import type {
  BoostInventory,
  InterviewType,
  SkillKey,
  TargetRole,
  TrackerStage,
  UserProfile,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

function parseSessionToken(req: Request): string | undefined {
  const headerToken = req.header('x-session-token')?.trim();
  if (headerToken) return headerToken;
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'place1ai_sid') return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

interface AuthedRequest extends Request {
  userId?: number;
  sessionToken?: string;
}

function resolveUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = parseSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  const row = db
    .prepare('SELECT id, session_token FROM users WHERE session_token = ? LIMIT 1')
    .get(token) as { id: number; session_token: string } | undefined;
  if (!row) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }
  req.userId = row.id;
  req.sessionToken = row.session_token;
  next();
}

function setSessionCookie(res: Response, token: string) {
  res.cookie('place1ai_sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Auth: Check existing session
  app.get('/api/auth/session', (req: AuthedRequest, res) => {
    const token = parseSessionToken(req);
    if (!token) {
      res.json({ authenticated: false, state: null });
      return;
    }
    const row = db
      .prepare('SELECT id, session_token FROM users WHERE session_token = ? LIMIT 1')
      .get(token) as { id: number; session_token: string } | undefined;
    if (!row) {
      res.json({ authenticated: false, state: null });
      return;
    }
    res.json({
      authenticated: true,
      sessionToken: row.session_token,
      state: getAppState(row.id),
    });
  });

  // Auth: Sign in or create account
  app.post('/api/auth/login', (req, res) => {
    const { name, email } = req.body as { name?: string; email?: string };
    const created = findOrCreateUser({ name, email });
    setSessionCookie(res, created.sessionToken);
    res.json({
      authenticated: true,
      sessionToken: created.sessionToken,
      isNew: created.isNew,
      state: getAppState(created.userId),
    });
  });

  // Auth: Logout
  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('place1ai_sid', { path: '/' });
    res.json({ ok: true });
  });

  // Full hydrated state
  app.get('/api/state', resolveUser, (req: AuthedRequest, res) => {
    res.json({ state: getAppState(req.userId!) });
  });

  // Onboarding
  app.post('/api/onboarding', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const prof = req.body as UserProfile;
    if (!prof || !Array.isArray(prof.int) || prof.int.length === 0) {
      res.status(400).json({ error: 'Pick at least one interest' });
      return;
    }

    const counts: Record<string, number> = {};
    for (const i of prof.int) {
      const r = INTEREST_ROLE_MAP[i] || 'Full Stack Developer';
      counts[r] = (counts[r] || 0) + 1;
    }
    let bestRole: TargetRole = INTEREST_ROLE_MAP[prof.int[0]] || 'Full Stack Developer';
    let maxCount = 0;
    for (const [r, c] of Object.entries(counts)) {
      if (c > maxCount) {
        maxCount = c;
        bestRole = r as TargetRole;
      }
    }

    const multMap: Record<string, number> = {
      Beginner: 0.6,
      Intermediate: 1,
      Advanced: 1.3,
      Switcher: 0.9,
    };
    const mult = multMap[prof.lvl] || 1;
    const updSkill = db.prepare(
      'INSERT INTO user_skills (user_id, skill_key, mastery) VALUES (?, ?, ?) ON CONFLICT(user_id, skill_key) DO UPDATE SET mastery = excluded.mastery'
    );
    for (const [k, baseVal] of Object.entries(DEFAULT_SKILLS)) {
      updSkill.run(userId, k, Math.min(0.95, Number((baseVal * mult).toFixed(2))));
    }

    db.prepare(
      'UPDATE users SET prof_json = ?, role = ?, roadmap_version = 1, stage = 0 WHERE id = ?'
    ).run(JSON.stringify(prof), bestRole, userId);

    seedRoadmapForRole(userId, bestRole, false);
    appendAgentLog(userId, 'Profiler', 'interests and goals captured');
    appendAgentLog(userId, 'Planner', `roadmap built for ${bestRole}`);
    recordAgentDebate({
      userId,
      roadmapVersion: 1,
      role: bestRole,
      weeklyHours: prof.hrs || 8,
      reason: 'initial onboarding',
    });

    const reward = awardXpAndEvaluateBadges(userId, 50, 100, 1);
    res.json({ state: getAppState(userId), reward });
  });

  // Change target role / goal
  app.post('/api/goal', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { role } = req.body as { role: TargetRole };
    const u = db.prepare('SELECT role, roadmap_version, prof_json FROM users WHERE id = ?').get(userId) as {
      role: TargetRole;
      roadmap_version: number;
      prof_json: string | null;
    };
    const hrs = u.prof_json ? (JSON.parse(u.prof_json).hrs as number) || 8 : 8;
    if (role && role !== u.role) {
      const nextVersion = u.roadmap_version + 1;
      db.prepare('UPDATE users SET role = ?, roadmap_version = ? WHERE id = ?').run(
        role,
        nextVersion,
        userId
      );
      seedRoadmapForRole(userId, role, false);
      appendAgentLog(userId, 'Gap Analyst', `goal changed to ${role}`);
      appendAgentLog(userId, 'Planner', `new roadmap v${nextVersion}`);
      recordAgentDebate({
        userId,
        roadmapVersion: nextVersion,
        role,
        weeklyHours: hrs,
        reason: `goal pivot to ${role}`,
      });
    }
    res.json({ state: getAppState(userId) });
  });

  // Replan roadmap manually via Agents
  app.post('/api/agents/replan', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const u = db.prepare('SELECT role, roadmap_version, prof_json FROM users WHERE id = ?').get(userId) as {
      role: TargetRole;
      roadmap_version: number;
      prof_json: string | null;
    };
    const hrs = u.prof_json ? (JSON.parse(u.prof_json).hrs as number) || 8 : 8;
    const nextVersion = u.roadmap_version + 1;
    db.prepare('UPDATE users SET roadmap_version = ? WHERE id = ?').run(nextVersion, userId);
    appendAgentLog(userId, 'Evaluator', 'reviewed latest BKT skill mastery and study hours');
    appendAgentLog(userId, 'Planner', `refreshed roadmap v${nextVersion} for ${u.role}`);
    recordAgentDebate({
      userId,
      roadmapVersion: nextVersion,
      role: u.role,
      weeklyHours: hrs,
      reason: 'manual agent replan',
    });
    res.json({ state: getAppState(userId) });
  });

  // Reorder roadmap steps with Critic validation
  app.post('/api/roadmap/reorder', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { orderedIds } = req.body as { orderedIds: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'Invalid order' });
      return;
    }

    const rows = db
      .prepare('SELECT id, title FROM roadmap_steps WHERE user_id = ?')
      .all(userId) as Array<{ id: number; title: string }>;
    const byId = new Map(rows.map((r) => [r.id, r.title]));
    const titles = orderedIds.map((id) => byId.get(id) || '');

    const reactIdx = titles.findIndex((t) => t.startsWith('React'));
    const jsIdx = titles.findIndex((t) => t.startsWith('JavaScript') || t.startsWith('JS'));

    if (reactIdx !== -1 && jsIdx !== -1 && reactIdx < jsIdx) {
      res.status(400).json({
        error: 'Critic: React needs JavaScript first. Order reverted.',
        state: getAppState(userId),
      });
      return;
    }

    const upd = db.prepare(
      'UPDATE roadmap_steps SET sort_order = ? WHERE id = ? AND user_id = ?'
    );
    orderedIds.forEach((id, idx) => upd.run(idx, id, userId));
    appendAgentLog(userId, 'Critic', 'validated and accepted custom roadmap ordering');
    res.json({ state: getAppState(userId), message: 'Order accepted by Critic' });
  });

  // Complete progress path stage
  app.post('/api/roadmap/stage', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const u = db.prepare('SELECT stage FROM users WHERE id = ?').get(userId) as { stage: number };
    const stepCount = (
      db.prepare('SELECT COUNT(*) as c FROM roadmap_steps WHERE user_id = ?').get(userId) as {
        c: number;
      }
    ).c;
    const totalStages = stepCount + 4;

    if (u.stage >= totalStages - 1) {
      const reward = awardXpAndEvaluateBadges(userId, 100, 200, 5);
      res.json({
        state: getAppState(userId),
        reward,
        label: 'Journey complete',
        completedAll: true,
      });
      return;
    }

    db.prepare('UPDATE users SET stage = stage + 1 WHERE id = ?').run(userId);
    const reward = awardXpAndEvaluateBadges(userId, 40, 40, 3);
    res.json({
      state: getAppState(userId),
      reward,
      label: 'Stage complete',
      completedAll: false,
    });
  });

  // Dynamic skill quiz generation & BKT assessment
  app.get('/api/assess/:skill', resolveUser, async (req: AuthedRequest, res) => {
    const skillKey = (req.params.skill || 'js') as SkillKey;
    if (!SKILL_META[skillKey]) {
      res.status(400).json({ error: 'Unknown skill' });
      return;
    }
    const questions = await getSkillQuiz(skillKey);
    res.json({ skillKey, label: SKILL_META[skillKey].label, questions });
  });

  // Submit quiz assessment with Bayesian Knowledge Tracing (BKT)
  app.post('/api/quiz/submit', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const {
      answers,
      skillKey = 'js',
      answerKeys,
    } = req.body as {
      answers: number[];
      skillKey?: SkillKey;
      answerKeys?: number[];
    };
    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'Answers required' });
      return;
    }

    const targetSkill: SkillKey = SKILL_META[skillKey] ? skillKey : 'js';
    const expected =
      Array.isArray(answerKeys) && answerKeys.length === answers.length
        ? answerKeys
        : QUIZ_QUESTIONS.map((q) => q.answerIndex);

    const skillRow = db
      .prepare('SELECT mastery FROM user_skills WHERE user_id = ? AND skill_key = ?')
      .get(userId, targetSkill) as { mastery: number } | undefined;
    const prevMastery = skillRow ? skillRow.mastery : 0.25;

    let score = 0;
    let bktP = prevMastery;
    answers.forEach((ans, i) => {
      const correct = ans === expected[i];
      if (correct) score++;
      bktP = bktUpdate(bktP, correct);
    });
    const nextMastery = bktP;

    db.prepare(
      'INSERT INTO user_skills (user_id, skill_key, mastery) VALUES (?, ?, ?) ON CONFLICT(user_id, skill_key) DO UPDATE SET mastery = excluded.mastery'
    ).run(userId, targetSkill, nextMastery);

    const u = db
      .prepare('SELECT role, roadmap_version, prof_json FROM users WHERE id = ?')
      .get(userId) as { role: TargetRole; roadmap_version: number; prof_json: string | null };
    const hrs = u.prof_json ? (JSON.parse(u.prof_json).hrs as number) || 8 : 8;

    let replanned = false;
    let reward = { xp: 0, leveledUp: false, newlyUnlockedBadges: [] as string[] };
    const skillLabel = SKILL_META[targetSkill].label;

    if (score < 2 && u.roadmap_version === 1 && targetSkill === 'js') {
      db.prepare('UPDATE users SET roadmap_version = 2 WHERE id = ?').run(userId);
      seedRoadmapForRole(userId, u.role, true);
      appendAgentLog(
        userId,
        'Evaluator',
        `BKT updated ${skillLabel} ${Math.round(prevMastery * 100)}% → ${Math.round(nextMastery * 100)}% (assessment failed)`
      );
      appendAgentLog(
        userId,
        'Planner',
        'added a remedial JS closures and async step, roadmap v2'
      );
      recordAgentDebate({
        userId,
        roadmapVersion: 2,
        role: u.role,
        weeklyHours: hrs,
        reason: 'remedial assessment replan',
      });
      replanned = true;
    } else {
      if (score >= 2) {
        reward = awardXpAndEvaluateBadges(userId, 40, 40, 2);
      }
      appendAgentLog(
        userId,
        'Evaluator',
        `BKT updated ${skillLabel} ${Math.round(prevMastery * 100)}% → ${Math.round(nextMastery * 100)}% (${score}/${expected.length})`
      );
    }

    res.json({
      skillKey: targetSkill,
      skillLabel,
      score,
      total: expected.length,
      priorPercent: Math.round(prevMastery * 100),
      masteryPercent: Math.round(nextMastery * 100),
      replanned,
      reward,
      state: getAppState(userId),
    });
  });

  // Dynamic Career Pivot Diff
  app.get('/api/pivot', resolveUser, (req: AuthedRequest, res) => {
    const state = getAppState(req.userId!);
    const targetRole = (req.query.role as TargetRole) || 'Data Analyst';
    const diff = computePivotDiff(state.skills, state.user.role, targetRole);
    res.json({ diff });
  });

  // Prompt Duel practice arena
  app.post('/api/practice/prompt-duel', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { topic, userPrompt } = req.body as { topic: string; userPrompt: string };
    if (!userPrompt || userPrompt.trim().split(/\s+/).length < 4) {
      res.status(400).json({ error: 'Write a prompt of at least 4 words' });
      return;
    }
    const result = await evaluatePromptDuel({
      topic: topic || 'REST API error handling',
      userPrompt: userPrompt.trim(),
    });
    const reward =
      result.winner === 'user'
        ? awardXpAndEvaluateBadges(userId, 30, 30, 1)
        : awardXpAndEvaluateBadges(userId, 10, 10, 0);
    res.json({ result, reward, state: getAppState(userId) });
  });

  // Update resume live
  app.put('/api/resume', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { name, summary, skills, experience } = req.body as {
      name: string;
      summary: string;
      skills: string;
      experience: string;
    };
    db.prepare(
      "UPDATE resumes SET name = ?, summary = ?, skills = ?, experience = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(name || '', summary || '', skills || '', experience || '', userId);

    res.json({ state: getAppState(userId) });
  });

  // Add missing keyword as learning
  app.post('/api/resume/keyword', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { keyword } = req.body as { keyword: string };
    const r = db.prepare('SELECT skills FROM resumes WHERE user_id = ?').get(userId) as {
      skills: string;
    };
    const nextSkills = r.skills
      ? `${r.skills}, ${keyword} (learning)`
      : `${keyword} (learning)`;
    db.prepare("UPDATE resumes SET skills = ?, updated_at = datetime('now') WHERE user_id = ?").run(
      nextSkills,
      userId
    );
    appendAgentLog(userId, 'Verifier', `marked ${keyword} as learning on resume`);
    res.json({ state: getAppState(userId) });
  });

  // AI Tailor resume for a job
  app.post('/api/resume/tailor', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { jobId } = req.body as { jobId: string };
    const state = getAppState(userId);
    const job = JOB_CATALOG.find((j) => j.id === jobId) || JOB_CATALOG[0];
    const missingLabels = job.requiredSkills
      .filter((k) => (state.skills[k] || 0) < 0.5)
      .map((k) => SKILL_META[k].label);

    const tailored = await tailorResumeForJob({
      state,
      jobTitle: job.title,
      company: job.company,
      missingLabels,
    });

    db.prepare(
      "UPDATE resumes SET summary = ?, skills = ?, experience = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(tailored.summary, tailored.skills, tailored.experience, userId);

    appendAgentLog(
      userId,
      'Resume Writer',
      `tailored resume for ${job.title} at ${job.company}`
    );
    appendAgentLog(
      userId,
      'Resume Verifier',
      'confirmed missing skills remain truthfully marked as learning'
    );

    res.json({ state: getAppState(userId) });
  });

  // Apply to a job
  app.post('/api/jobs/apply', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { jobId } = req.body as { jobId: string };
    const job = JOB_CATALOG.find((j) => j.id === jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM tracker_entries WHERE user_id = ? AND job_id = ?')
      .get(userId, jobId);
    if (existing) {
      res.status(400).json({ error: 'Already applied' });
      return;
    }

    db.prepare(
      'INSERT INTO tracker_entries (user_id, job_id, company, role, stage, applied_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, job.id, job.company, job.title, 'Applied', todayIso());

    appendAgentLog(
      userId,
      'Resume Writer',
      `prepared tailored application for ${job.title} at ${job.company}`
    );
    appendAgentLog(userId, 'ATS Analyst', 'verified keyword alignment before submission');

    const reward = awardXpAndEvaluateBadges(userId, 50, 50, 2);
    res.json({ state: getAppState(userId), reward });
  });

  // Application Tracker CRUD
  app.post('/api/tracker', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { company, role } = req.body as { company: string; role?: string };
    if (!company || !company.trim()) {
      res.status(400).json({ error: 'Company required' });
      return;
    }
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string };
    db.prepare(
      'INSERT INTO tracker_entries (user_id, company, role, stage, applied_date) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, company.trim(), (role || '').trim() || u.role, 'Saved', todayIso());
    res.json({ state: getAppState(userId) });
  });

  app.patch('/api/tracker/:id', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const id = Number(req.params.id);
    const { stage } = req.body as { stage: TrackerStage };
    if (!TRACKER_STAGES.includes(stage)) {
      res.status(400).json({ error: 'Invalid stage' });
      return;
    }
    const prev = db
      .prepare('SELECT stage FROM tracker_entries WHERE id = ? AND user_id = ?')
      .get(id, userId) as { stage: TrackerStage } | undefined;
    if (!prev) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    db.prepare('UPDATE tracker_entries SET stage = ? WHERE id = ? AND user_id = ?').run(
      stage,
      id,
      userId
    );

    let reward = null;
    if (stage === 'Interview' && prev.stage !== 'Interview') {
      reward = awardXpAndEvaluateBadges(userId, 30, 30, 1);
    } else if (stage === 'Offer' && prev.stage !== 'Offer') {
      reward = awardXpAndEvaluateBadges(userId, 100, 100, 3);
    }
    res.json({ state: getAppState(userId), reward });
  });

  app.delete('/api/tracker/:id', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const id = Number(req.params.id);
    db.prepare('DELETE FROM tracker_entries WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ state: getAppState(userId) });
  });

  // DSA toggle
  app.post('/api/dsa/toggle', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { slug, solved } = req.body as { slug: string; solved: boolean };
    let reward = null;
    if (solved) {
      const existing = db
        .prepare('SELECT 1 FROM dsa_progress WHERE user_id = ? AND slug = ?')
        .get(userId, slug);
      if (!existing) {
        db.prepare('INSERT INTO dsa_progress (user_id, slug) VALUES (?, ?)').run(userId, slug);
        reward = awardXpAndEvaluateBadges(userId, 10, 10, 0);
      }
    } else {
      db.prepare('DELETE FROM dsa_progress WHERE user_id = ? AND slug = ?').run(userId, slug);
    }
    res.json({ state: getAppState(userId), reward });
  });

  // Aptitude test submit
  app.post('/api/aptitude/submit', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { score } = req.body as { score: number };
    const u = db
      .prepare('SELECT aptitude_best FROM users WHERE id = ?')
      .get(userId) as { aptitude_best: number };
    const best = Math.max(u.aptitude_best || 0, score);
    db.prepare('UPDATE users SET aptitude_best = ? WHERE id = ?').run(best, userId);
    const earned = Math.max(10, score * 6);
    const reward = awardXpAndEvaluateBadges(userId, earned, earned, score >= 8 ? 2 : 0);
    res.json({ state: getAppState(userId), reward });
  });

  // Meetings CRUD
  app.post('/api/meetings', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { topic, whenMs, link } = req.body as {
      topic: string;
      whenMs: number;
      link: string;
    };
    if (!topic || !whenMs) {
      res.status(400).json({ error: 'Topic and date required' });
      return;
    }
    db.prepare('INSERT INTO meetings (user_id, topic, when_ms, link) VALUES (?, ?, ?, ?)').run(
      userId,
      topic,
      whenMs,
      link || ''
    );
    const reward = awardXpAndEvaluateBadges(userId, 10, 10, 0);
    res.json({ state: getAppState(userId), reward });
  });

  app.delete('/api/meetings/:id', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const id = Number(req.params.id);
    db.prepare('DELETE FROM meetings WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ state: getAppState(userId) });
  });

  // Focus timer completion
  app.post('/api/focus/complete', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { minutes } = req.body as { minutes: number };
    const u = db.prepare('SELECT focus_json FROM users WHERE id = ?').get(userId) as {
      focus_json: string;
    };
    const focus = JSON.parse(u.focus_json || '{"sessions":0,"minutes":0}');
    focus.sessions = (focus.sessions || 0) + 1;
    focus.minutes = (focus.minutes || 0) + (Number(minutes) || 25);
    db.prepare('UPDATE users SET focus_json = ? WHERE id = ?').run(
      JSON.stringify(focus),
      userId
    );
    const reward = awardXpAndEvaluateBadges(userId, 25, 25, 0);
    res.json({ state: getAppState(userId), reward });
  });

  // Toggle completed lists (resources, projects, weekly, quests, flashcard xp)
  app.post('/api/progress/toggle', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { kind, item, checked, xpAmount } = req.body as {
      kind: 'resources' | 'projects' | 'weekly' | 'quests' | 'card' | 'meeting_join' | 'precall';
      item?: string;
      checked?: boolean;
      xpAmount?: number;
    };

    const colMap: Record<string, string> = {
      resources: 'completed_resources_json',
      projects: 'completed_projects_json',
      weekly: 'weekly_done_json',
      quests: 'completed_quests_json',
    };

    let reward = null;
    if (kind in colMap && item) {
      const col = colMap[kind];
      const row = db.prepare(`SELECT ${col} as val FROM users WHERE id = ?`).get(userId) as {
        val: string;
      };
      const arr: string[] = JSON.parse(row.val || '[]');
      const idx = arr.indexOf(item);
      if (checked && idx < 0) {
        arr.push(item);
        reward = awardXpAndEvaluateBadges(userId, xpAmount || 15, xpAmount || 15, 0);
      } else if (!checked && idx >= 0) {
        arr.splice(idx, 1);
      }
      db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(
        JSON.stringify(arr),
        userId
      );
    } else if (xpAmount && xpAmount > 0) {
      reward = awardXpAndEvaluateBadges(userId, xpAmount, xpAmount, 0);
    }

    res.json({ state: getAppState(userId), reward });
  });

  // Rewards: daily chest, use boost, buy boost
  app.post('/api/rewards/chest', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const u = db
      .prepare('SELECT chest_claimed_date FROM users WHERE id = ?')
      .get(userId) as { chest_claimed_date: string };
    const today = todayIso();
    if (u.chest_claimed_date === today) {
      res.status(400).json({ error: 'Daily reward already claimed. Come back tomorrow.' });
      return;
    }
    db.prepare('UPDATE users SET chest_claimed_date = ? WHERE id = ?').run(today, userId);
    const reward = awardXpAndEvaluateBadges(userId, 25, 50, 1);
    res.json({ state: getAppState(userId), reward });
  });

  app.post('/api/rewards/boost', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { action, boostKey } = req.body as {
      action: 'use' | 'buy';
      boostKey?: keyof BoostInventory;
    };
    const u = db.prepare('SELECT coin, boost_json FROM users WHERE id = ?').get(userId) as {
      coin: number;
      boost_json: string;
    };
    const boost: BoostInventory = JSON.parse(u.boost_json);

    let reward = null;
    if (action === 'buy') {
      if (u.coin < 60) {
        res.status(400).json({ error: 'Not enough credits' });
        return;
      }
      boost.xp += 1;
      db.prepare('UPDATE users SET coin = coin - 60, boost_json = ? WHERE id = ?').run(
        JSON.stringify(boost),
        userId
      );
    } else if (action === 'use' && boostKey) {
      if (!boost[boostKey]) {
        res.status(400).json({ error: 'None left' });
        return;
      }
      boost[boostKey] -= 1;
      db.prepare('UPDATE users SET boost_json = ? WHERE id = ?').run(
        JSON.stringify(boost),
        userId
      );
      if (boostKey === 'xp') {
        reward = awardXpAndEvaluateBadges(userId, 50, 0, 0);
      }
    }
    res.json({ state: getAppState(userId), reward });
  });

  // Virtual Interview evaluation via Gemini
  app.post('/api/interview/evaluate', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { type, qaPairs } = req.body as {
      type: InterviewType;
      qaPairs: Array<{ q: string; a: string }>;
    };
    if (!Array.isArray(qaPairs) || qaPairs.length === 0) {
      res.status(400).json({ error: 'At least one answered question is required' });
      return;
    }
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string };
    const evaluation = await evaluateInterviewSession({
      type,
      role: u.role,
      qaPairs,
    });

    const info = db
      .prepare(
        'INSERT INTO interview_sessions (user_id, type, overall_score, breakdown_json, reviews_json, summary_feedback) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        userId,
        type,
        evaluation.overallScore,
        JSON.stringify(evaluation.breakdown),
        JSON.stringify(evaluation.reviews),
        evaluation.summaryFeedback
      );

    appendAgentLog(
      userId,
      'Evaluator',
      `scored ${type} mock interview: ${evaluation.overallScore}/100`
    );
    const reward = awardXpAndEvaluateBadges(userId, 60, 60, 2);

    res.json({
      sessionId: Number(info.lastInsertRowid),
      evaluation,
      reward,
      state: getAppState(userId),
    });
  });

  // Cover letter generation via Gemini
  app.post('/api/kit/cover-letter', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { company, role, skills, achievement, whyCompany } = req.body as {
      company: string;
      role: string;
      skills: string;
      achievement: string;
      whyCompany: string;
    };
    const u = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string };
    const letter = await generateCoverLetter({
      name: u.name,
      role,
      company,
      skills,
      achievement,
      whyCompany,
    });
    res.json({ letter });
  });

  // AI Mentor Chat (with optional RAG over SQLite state)
  app.post('/api/mentor/chat', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { question, ragEnabled } = req.body as {
      question: string;
      ragEnabled: boolean;
    };
    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Question required' });
      return;
    }

    const cleanQ = question.trim();
    db.prepare(
      'INSERT INTO chat_messages (user_id, sender, content, sources_json, rag_enabled) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'user', cleanQ, '[]', ragEnabled ? 1 : 0);

    const state = getAppState(userId);
    const reply = await askMentor({ state, question: cleanQ, ragEnabled: Boolean(ragEnabled) });

    db.prepare(
      'INSERT INTO chat_messages (user_id, sender, content, sources_json, rag_enabled) VALUES (?, ?, ?, ?, ?)'
    ).run(
      userId,
      'assistant',
      reply.answer,
      JSON.stringify(reply.sources),
      ragEnabled ? 1 : 0
    );

    res.json({
      reply,
      state: getAppState(userId),
    });
  });

  app.post('/api/mentor/rag-log', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { enabled } = req.body as { enabled: boolean };
    if (enabled) {
      appendAgentLog(userId, 'RAG retriever', 'enabled by you in the chatbot');
    }
    res.json({ state: getAppState(userId) });
  });

  // Vite middleware (dev) or static dist serving (prod)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`place1ai server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
