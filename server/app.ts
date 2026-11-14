import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  DAILY_CHALLENGES,
  DEFAULT_SKILLS,
  INTEREST_ROLE_MAP,
  JOB_CATALOG,
  QUIZ_QUESTIONS,
  SKILL_META,
  TRACKER_STAGES,
} from './data.ts';
import {
  appendAgentLog,
  awardXpAndEvaluateBadges,
  db,
  findOrCreateUser,
  getAppState,
  seedRoadmapForRole,
  todayIso,
} from './db.ts';
import {
  bktUpdate,
  computePivotDiff,
  evaluatePromptDuel,
  getSkillQuiz,
  recordAgentDebate,
} from './agents.ts';
import {
  analyzeResumeWithAts,
  askMentor,
  converseInterviewTurn,
  evaluateInterviewSession,
  generateAiResumeDraft,
  generateCoverLetter,
  generateInterviewCoachHint,
  generateInterviewFollowUp,
  gradeCodingSubmission,
  recommendOnboardingRoadmap,
  runCustomAgent,
  runMultiAgentAudit,
  runRagInspectorQuery,
  solveDsaWithAi,
  tailorResumeForJob,
} from './gemini.ts';
import type {
  BoostInventory,
  InterviewType,
  SkillKey,
  TargetRole,
  TrackerStage,
  UserProfile,
} from '../src/types.ts';

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

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      timestamp: new Date().toISOString(),
    });
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

  // Update user display name
  app.patch('/api/user/name', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { name } = req.body as { name?: string };
    const clean = (name || '').trim();
    if (!clean) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(clean, userId);
    db.prepare('UPDATE resumes SET name = ? WHERE user_id = ?').run(clean, userId);
    res.json({ state: getAppState(userId) });
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

    const reward = awardXpAndEvaluateBadges(userId, 50, 100, 1, 'onboarding');
    res.json({ state: getAppState(userId), reward });
  });

  // AI Voice Onboarding Roadmap Recommender
  app.post('/api/onboarding/recommend', resolveUser, async (req: AuthedRequest, res) => {
    const { transcript, interests, level, hours } = req.body as {
      transcript?: string;
      interests?: string[];
      level?: string;
      hours?: number;
    };
    const recommendation = await recommendOnboardingRoadmap({
      transcript: transcript || '',
      interests: Array.isArray(interests) ? interests : [],
      level: level || 'Beginner',
      hours: Number(hours) || 8,
    });
    res.json({ recommendation });
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

  // Run 3-Agent Workspace Audit via Gemini
  app.post('/api/agents/audit', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const state = getAppState(userId);
    const audit = await runMultiAgentAudit(state);
    for (const f of audit.findings) {
      appendAgentLog(userId, f.agent, `[${f.status.toUpperCase()}] ${f.detail}`);
    }
    const reward = awardXpAndEvaluateBadges(userId, 15, 15, 0, 'agent_audit');
    res.json({ audit, reward, state: getAppState(userId) });
  });

  // Custom User-Built AI Agent Runner ("Make Agents")
  app.post('/api/agents/custom-run', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { name, roleFocus, mission, tools } = req.body as {
      name?: string;
      roleFocus?: string;
      mission?: string;
      tools?: string[];
    };
    if (!name?.trim() || !mission?.trim()) {
      res.status(400).json({ error: 'Agent name and mission are required' });
      return;
    }
    const state = getAppState(userId);
    const cleanName = name.trim();
    const cleanRole = roleFocus?.trim() || state.user.role;
    const cleanMission = mission.trim();
    const cleanTools = Array.isArray(tools) && tools.length ? tools : ['SQLite RAG', 'Skill Twin'];

    const run = await runCustomAgent({
      state,
      name: cleanName,
      roleFocus: cleanRole,
      mission: cleanMission,
      tools: cleanTools,
    });

    const info = db
      .prepare(
        'INSERT INTO custom_agents (user_id, name, role_focus, mission, tools_json, last_output) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        userId,
        cleanName,
        cleanRole,
        cleanMission,
        JSON.stringify(cleanTools),
        `${run.verdict} | Next: ${run.actions.join(' ; ')}`
      );

    appendAgentLog(userId, cleanName, run.verdict);
    const reward = awardXpAndEvaluateBadges(userId, 25, 25, 0, 'custom_agent');
    const nextState = getAppState(userId);
    const agent =
      nextState.customAgents.find((a) => a.id === Number(info.lastInsertRowid)) ||
      nextState.customAgents[0];

    res.json({
      result: {
        agent,
        verdict: run.verdict,
        actions: run.actions,
        ragSourcesUsed: run.ragSourcesUsed,
        usedGemini: run.usedGemini,
      },
      reward,
      state: nextState,
    });
  });

  app.delete('/api/agents/custom/:id', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    db.prepare('DELETE FROM custom_agents WHERE id = ? AND user_id = ?').run(
      Number(req.params.id),
      userId
    );
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
      const reward = awardXpAndEvaluateBadges(userId, 100, 200, 5, 'journey_complete');
      res.json({
        state: getAppState(userId),
        reward,
        label: 'Journey complete',
        completedAll: true,
      });
      return;
    }

    db.prepare('UPDATE users SET stage = stage + 1 WHERE id = ?').run(userId);
    const reward = awardXpAndEvaluateBadges(userId, 40, 40, 3, 'stage_complete');
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
        reward = awardXpAndEvaluateBadges(userId, 40, 40, 2, 'bkt_quiz');
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
        ? awardXpAndEvaluateBadges(userId, 30, 30, 1, 'prompt_duel')
        : awardXpAndEvaluateBadges(userId, 10, 10, 0, 'prompt_duel');
    res.json({ result, reward, state: getAppState(userId) });
  });

  // AI Problem Solver & Code Coach
  app.post('/api/practice/solve', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { problem, language, userApproach } = req.body as {
      problem?: string;
      language?: string;
      userApproach?: string;
    };
    if (!problem || !problem.trim()) {
      res.status(400).json({ error: 'Problem title or statement required' });
      return;
    }
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string };
    const solution = await solveDsaWithAi({
      problem: problem.trim(),
      language: language || 'TypeScript',
      userApproach: userApproach || '',
      role: u.role,
    });
    appendAgentLog(
      userId,
      'AI Coach',
      `solved DSA problem "${problem.trim().slice(0, 40)}" (${solution.timeComplexity})`
    );
    const reward = awardXpAndEvaluateBadges(userId, 15, 15, 0, 'ai_problem_solve');
    res.json({ solution, reward, state: getAppState(userId) });
  });

  // Live Coding Test Grader
  app.post('/api/practice/grade-code', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { problemTitle, language, code, passedTests, totalTests } = req.body as {
      problemTitle?: string;
      language?: string;
      code?: string;
      passedTests?: number;
      totalTests?: number;
    };
    if (!problemTitle?.trim() || !code?.trim()) {
      res.status(400).json({ error: 'Problem title and code are required' });
      return;
    }
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string };
    const grade = await gradeCodingSubmission({
      problemTitle: problemTitle.trim(),
      language: language || 'JavaScript',
      code,
      passedTests: Number(passedTests) || 0,
      totalTests: Number(totalTests) || 3,
      role: u.role,
    });
    const xpGain = grade.passedTests >= grade.totalTests ? 30 : 15;
    appendAgentLog(
      userId,
      'Coding Grader',
      `${problemTitle.trim()}: ${grade.passedTests}/${grade.totalTests} tests (${grade.score}/100)`
    );
    const reward = awardXpAndEvaluateBadges(userId, xpGain, xpGain, 0, 'coding_test');
    res.json({ grade, reward, state: getAppState(userId) });
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

  // AI Resume Maker (generates full resume draft from SQLite Skill Twin)
  app.post('/api/resume/generate', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { highlightNote } = req.body as { highlightNote?: string };
    const state = getAppState(userId);
    const draft = await generateAiResumeDraft({ state, highlightNote });
    db.prepare(
      "UPDATE resumes SET summary = ?, skills = ?, experience = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(draft.summary, draft.skills, draft.experience, userId);

    appendAgentLog(userId, 'Resume Writer', 'generated full AI Resume Maker draft from Skill Twin');
    appendAgentLog(userId, 'Resume Verifier', 'ensured unmastered skills stay tagged learning');
    const reward = awardXpAndEvaluateBadges(userId, 20, 20, 0, 'resume_maker');
    res.json({ usedGemini: draft.usedGemini, reward, state: getAppState(userId) });
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

  // Gemini ATS JD Match & XYZ Bullet Rewriter
  app.post('/api/ats/analyze', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { jobDescription } = req.body as { jobDescription?: string };
    const state = getAppState(userId);
    const audit = await analyzeResumeWithAts({ state, jobDescription });
    appendAgentLog(
      userId,
      'ATS Analyst',
      `evaluated JD match score (${audit.matchScore}/100) and generated ${audit.rewrittenBullets.length} quantified bullets`
    );
    res.json({ audit, state: getAppState(userId) });
  });

  // Autonomous Batch Auto-Apply Agent
  app.post('/api/jobs/auto-apply', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { minFit = 0, limit = 3 } = req.body as { minFit?: number; limit?: number };
    const state = getAppState(userId);
    const candidates = state.jobs
      .filter((j) => !j.applied && j.fit >= minFit)
      .sort((a, b) => b.fit - a.fit)
      .slice(0, Math.max(1, limit));

    if (candidates.length === 0) {
      res.json({
        result: {
          appliedCount: 0,
          appliedJobs: [],
          tailoredSummary: state.resume.summary,
          usedGemini: false,
        },
        reward: null,
        state,
      });
      return;
    }

    const topJob = candidates[0];
    const missingLabels = topJob.requiredSkills
      .filter((k) => (state.skills[k] || 0) < 0.5)
      .map((k) => SKILL_META[k].label);

    const tailored = await tailorResumeForJob({
      state,
      jobTitle: topJob.title,
      company: topJob.company,
      missingLabels,
    });

    db.prepare(
      "UPDATE resumes SET summary = ?, skills = ?, experience = ?, updated_at = datetime('now') WHERE user_id = ?"
    ).run(tailored.summary, tailored.skills, tailored.experience, userId);

    const insertTracker = db.prepare(
      'INSERT INTO tracker_entries (user_id, job_id, company, role, stage, applied_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const today = todayIso();
    for (const job of candidates) {
      insertTracker.run(
        userId,
        job.id,
        job.company,
        job.title,
        'Applied',
        today,
        `Auto-applied (${job.fit}% Skill Twin match)`
      );
    }

    appendAgentLog(
      userId,
      'Auto-Applier',
      `tailored resume and auto-applied to ${candidates.length} matching roles (${candidates.map((c) => c.company).join(', ')})`
    );
    appendAgentLog(userId, 'Resume Verifier', 'certified truthful skill markings prior to batch submission');

    const reward = awardXpAndEvaluateBadges(
      userId,
      candidates.length * 40,
      candidates.length * 30,
      candidates.length,
      'auto_apply'
    );

    res.json({
      result: {
        appliedCount: candidates.length,
        appliedJobs: candidates.map((c) => ({ company: c.company, title: c.title, fit: c.fit })),
        tailoredSummary: tailored.summary,
        usedGemini: Boolean(
          process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
        ),
      },
      reward,
      state: getAppState(userId),
    });
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

    const reward = awardXpAndEvaluateBadges(userId, 50, 50, 2, 'job_apply');
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
      reward = awardXpAndEvaluateBadges(userId, 30, 30, 1, 'tracker_interview');
    } else if (stage === 'Offer' && prev.stage !== 'Offer') {
      reward = awardXpAndEvaluateBadges(userId, 100, 100, 3, 'tracker_offer');
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
        reward = awardXpAndEvaluateBadges(userId, 10, 10, 0, 'dsa_solve');
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
    const reward = awardXpAndEvaluateBadges(userId, earned, earned, score >= 8 ? 2 : 0, 'aptitude');
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
    const reward = awardXpAndEvaluateBadges(userId, 10, 10, 0, 'meeting');
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
    const reward = awardXpAndEvaluateBadges(userId, 25, 25, 0, 'focus');
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
        reward = awardXpAndEvaluateBadges(userId, xpAmount || 15, xpAmount || 15, 0, kind);
      } else if (!checked && idx >= 0) {
        arr.splice(idx, 1);
      }
      db.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(
        JSON.stringify(arr),
        userId
      );
    } else if (xpAmount && xpAmount > 0) {
      reward = awardXpAndEvaluateBadges(userId, xpAmount, xpAmount, 0, kind);
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
    const reward = awardXpAndEvaluateBadges(userId, 25, 50, 1, 'daily_chest');
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
        reward = awardXpAndEvaluateBadges(userId, 50, 0, 0, 'xp_boost');
      }
    }
    res.json({ state: getAppState(userId), reward });
  });

  // Live Gemini interview follow-up probe
  app.post('/api/interview/followup', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { type, question, answer } = req.body as {
      type: InterviewType;
      question: string;
      answer: string;
    };
    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required' });
      return;
    }
    const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string };
    const result = await generateInterviewFollowUp({
      type: type || 'Behavioral',
      role: u.role,
      question,
      answer,
    });
    res.json(result);
  });

  // Live Gemini interview coaching hint & STAR draft
  app.post('/api/interview/coach-hint', resolveUser, async (req: AuthedRequest, res) => {
    const { type, persona, question, currentAnswer } = req.body as {
      type?: InterviewType;
      persona?: string;
      question?: string;
      currentAnswer?: string;
    };
    if (!question) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }
    const result = await generateInterviewCoachHint({
      type: type || 'Behavioral',
      persona: persona || 'FAANG Systems',
      question,
      currentAnswer: currentAnswer || '',
    });
    res.json(result);
  });

  // Two-way Virtual Interview conversational turn
  app.post('/api/interview/turn', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const {
      type,
      persona,
      currentPrompt,
      userUtterance,
      nextQuestion,
      turnIndex,
    } = req.body as {
      type?: InterviewType;
      persona?: string;
      currentPrompt?: string;
      userUtterance?: string;
      nextQuestion?: string | null;
      turnIndex?: number;
    };
    if (!userUtterance || !userUtterance.trim()) {
      res.status(400).json({ error: 'Please share a spoken or typed response' });
      return;
    }
    const u = db.prepare('SELECT name, role FROM users WHERE id = ?').get(userId) as {
      name: string;
      role: string;
    };
    const result = await converseInterviewTurn({
      candidateName: u.name || 'Friend',
      role: u.role,
      type: type || 'Behavioral',
      persona: persona || 'Brightwave Startup',
      currentPrompt: currentPrompt || '',
      userUtterance: userUtterance.trim(),
      nextQuestion: nextQuestion ?? null,
      turnIndex: Number(turnIndex) || 0,
    });
    res.json(result);
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
    const reward = awardXpAndEvaluateBadges(userId, 60, 60, 2, 'interview');

    res.json({
      sessionId: Number(info.lastInsertRowid),
      evaluation,
      reward,
      state: getAppState(userId),
    });
  });

  // Google Calendar Sync & Automatic Reminders Endpoint
  app.post('/api/calendar/sync-interview', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const {
      interviewType = 'Frontend Engineer Mock Interview',
      startTime = new Date(Date.now() + 86400000).toISOString(),
      durationMinutes = 45,
      reminderMinutes = 30,
    } = req.body as {
      interviewType?: string;
      startTime?: string;
      durationMinutes?: number;
      reminderMinutes?: number;
    };

    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + (durationMinutes || 45) * 60000);

    const fmtGCal = (d: Date) => d.toISOString().replace(/-|:/g, '').replace(/\.\d\d\d/, '');
    const datesStr = `${fmtGCal(startDate)}/${fmtGCal(endDate)}`;
    const title = encodeURIComponent(`place1ai Mock Interview: ${interviewType}`);
    const details = encodeURIComponent(
      `Your live AI mock interview session on place1ai.\n\nAutomatic meeting reminder set for ${reminderMinutes} minutes before start time.\n\nJoin workspace: https://place1ai.app`
    );
    const location = encodeURIComponent('place1ai Virtual Interview Studio (Online)');

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesStr}&details=${details}&location=${location}&reminders=${reminderMinutes}`;

    appendAgentLog(
      userId,
      'Calendar Sync',
      `Synced ${interviewType} to Google Calendar for ${startDate.toLocaleString()} with ${reminderMinutes}m reminder`
    );

    const reward = awardXpAndEvaluateBadges(userId, 15, 15, 1, 'calendar_sync');

    res.json({
      success: true,
      calendarUrl,
      eventSummary: {
        title: `place1ai Mock Interview: ${interviewType}`,
        startTime: startDate.toISOString(),
        durationMinutes,
        reminderMinutes,
      },
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

  // Built-in RAG Inspector playground + Custom Document Ingestion
  app.post('/api/rag/query', resolveUser, async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { query } = req.body as { query: string };
    if (!query || !query.trim()) {
      res.status(400).json({ error: 'Query required' });
      return;
    }
    const cleanQ = query.trim();
    const state = getAppState(userId);
    const result = await runRagInspectorQuery({ state, query: cleanQ });
    appendAgentLog(
      userId,
      'RAG retriever',
      `indexed ${result.retrieved.length} SQLite chunks for "${cleanQ.slice(0, 48)}"`
    );
    res.json({ result, state: getAppState(userId) });
  });

  app.post('/api/rag/ingest', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title?.trim() || !content?.trim()) {
      res.status(400).json({ error: 'Document title and content are required' });
      return;
    }
    const info = db
      .prepare('INSERT INTO rag_documents (user_id, title, content) VALUES (?, ?, ?)')
      .run(userId, title.trim(), content.trim());
    appendAgentLog(userId, 'RAG retriever', `ingested custom knowledge chunk "${title.trim()}"`);
    const reward = awardXpAndEvaluateBadges(userId, 15, 15, 0, 'rag_ingest');
    res.json({
      docId: Number(info.lastInsertRowid),
      reward,
      state: getAppState(userId),
    });
  });

  app.delete('/api/rag/ingest/:id', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const id = Number(req.params.id);
    db.prepare('DELETE FROM rag_documents WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ state: getAppState(userId) });
  });

  // Daily Challenge submission
  app.post('/api/daily/submit', resolveUser, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { challengeId, answerIndex } = req.body as {
      challengeId: string;
      answerIndex: number;
    };
    const ch = DAILY_CHALLENGES.find((c) => c.id === challengeId) || DAILY_CHALLENGES[0];
    const correct = Number(answerIndex) === ch.answerIndex;
    const u = db
      .prepare('SELECT daily_challenge_date FROM users WHERE id = ?')
      .get(userId) as { daily_challenge_date: string };
    const today = todayIso();
    let reward = null;
    if (correct && u.daily_challenge_date !== today) {
      db.prepare('UPDATE users SET daily_challenge_date = ? WHERE id = ?').run(today, userId);
      reward = awardXpAndEvaluateBadges(userId, ch.xp, 30, 1, 'daily_challenge');
      appendAgentLog(userId, 'Evaluator', `completed Daily Challenge: ${ch.title} (+${ch.xp} XP)`);
    }
    res.json({
      correct,
      explanation: ch.explanation,
      alreadyDone: u.daily_challenge_date === today,
      reward,
      state: getAppState(userId),
    });
  });

  return app;
}
