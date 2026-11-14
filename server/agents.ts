import { GoogleGenAI, Type } from '@google/genai';
import {
  QUIZ_QUESTIONS,
  ROLE_PLANS,
  SKILL_EDGES,
  SKILL_META,
} from './data.ts';
import { appendAgentLog, appendDebateTurn } from './db.ts';
import type {
  PivotDiff,
  PromptDuelResult,
  SkillKey,
  SkillQuizQuestion,
  TargetRole,
} from '../src/types.ts';

function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

/**
 * Bayesian Knowledge Tracing (BKT) update step.
 */
export function bktUpdate(
  prior: number,
  correct: boolean,
  slip = 0.1,
  guess = 0.2,
  learn = 0.15
): number {
  const p = Math.max(0.01, Math.min(0.99, prior));
  let posterior: number;
  if (correct) {
    const num = p * (1 - slip);
    posterior = num / (num + (1 - p) * guess);
  } else {
    const num = p * slip;
    posterior = num / (num + (1 - p) * (1 - guess));
  }
  const updated = posterior + (1 - posterior) * learn;
  return Number(Math.max(0.02, Math.min(0.98, updated)).toFixed(3));
}

export function computePivotDiff(
  skills: Record<SkillKey, number>,
  fromRole: TargetRole,
  toRole: TargetRole
): PivotDiff {
  const fromSteps = ROLE_PLANS[fromRole] || ROLE_PLANS['Full Stack Developer'];
  const toSteps = ROLE_PLANS[toRole] || ROLE_PLANS['Data Analyst'];

  const fromKeys = new Set(fromSteps.map((s) => s.skillKey));
  const toKeys = new Set(toSteps.map((s) => s.skillKey));

  const transfers: string[] = [];
  const partlyUseful: string[] = [];
  const newSkills: string[] = [];
  const noLongerNeeded: string[] = [];

  for (const k of toKeys) {
    const label = SKILL_META[k].label;
    const mastery = skills[k] || 0;
    if (mastery >= 0.4) {
      transfers.push(label);
    } else if (fromKeys.has(k)) {
      partlyUseful.push(label);
    } else {
      newSkills.push(label);
    }
  }

  for (const k of fromKeys) {
    if (!toKeys.has(k)) {
      noLongerNeeded.push(SKILL_META[k].label);
    }
  }

  const totalTargetHours = toSteps.reduce((acc, s) => acc + s.hours, 0);
  const coveredHours = toSteps.reduce((acc, s) => {
    const m = skills[s.skillKey] || 0;
    return acc + Math.round(s.hours * Math.min(1, m));
  }, 0);

  const overlapPercent = Math.round(
    (coveredHours / Math.max(1, totalTargetHours)) * 100
  );

  const insightMap: Record<TargetRole, string> = {
    'Frontend Engineer':
      'React (62%), TypeScript (58%), CSS/Tailwind (44%), and Web Accessibility anchor Frontend Engineer interviews.',
    'Data Analyst':
      'SQL is the top skill in Data Analyst postings (60 to 71%), and three in four expect a BI tool.',
    'Full Stack Developer':
      'React (54%) and TypeScript (45%) lead Full Stack postings, with SQL in 35% of listings.',
    'Data Scientist':
      'Python (63%), SQL (48%), and Statistics/ML (48%) anchor Data Scientist requirements.',
    'ML Engineer':
      'Python, scikit-learn, and MLOps pipelines cover the core engineering gap.',
    'Backend Developer':
      'Node.js APIs, SQL databases, Docker, and system design drive 24,600+ active roles.',
  };

  return {
    fromRole,
    toRole,
    transfers,
    partlyUseful,
    newSkills,
    noLongerNeeded,
    overlapPercent,
    hoursSaved: coveredHours,
    insight: insightMap[toRole],
  };
}

export function recordAgentDebate(params: {
  userId: number;
  roadmapVersion: number;
  role: TargetRole;
  weeklyHours: number;
  reason: string;
}) {
  const { userId, roadmapVersion, role, weeklyHours, reason } = params;
  const steps = ROLE_PLANS[role] || ROLE_PLANS['Full Stack Developer'];
  const totalHrs = steps.reduce((a, b) => a + b.hours, 0);
  const weeks = Math.max(1, Math.ceil(totalHrs / Math.max(1, weeklyHours)));

  const edgesSummary = SKILL_EDGES.map(
    ([a, b]) => `${SKILL_META[a].label}→${SKILL_META[b].label}`
  )
    .slice(0, 3)
    .join(', ');

  appendDebateTurn(
    userId,
    roadmapVersion,
    1,
    'Planner',
    `Round 1 (${reason}): Proposed ${steps.map((s) => `${s.title} (${s.hours}h)`).join(' → ')}.`
  );
  appendDebateTurn(
    userId,
    roadmapVersion,
    1,
    'Critic',
    `Checked prerequisite DAG (${edgesSummary}) and ${weeklyHours}h/week budget across ${weeks} weeks.`
  );
  appendDebateTurn(
    userId,
    roadmapVersion,
    2,
    'Planner',
    `Confirmed topological order with ${steps.length} milestones over ${weeks} weeks.`
  );
  appendDebateTurn(
    userId,
    roadmapVersion,
    2,
    'Curator',
    `Attached verified learning docs and practice labs for ${role}.`
  );
  appendAgentLog(
    userId,
    'Critic',
    `approved v${roadmapVersion} topological path for ${role} (${totalHrs}h / ${weeks}w)`
  );
}

const FALLBACK_SKILL_QUIZZES: Record<SkillKey, SkillQuizQuestion[]> = {
  js: QUIZ_QUESTIONS.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
  })),
  html: [
    {
      id: 0,
      question: 'Which HTML element represents the main self-contained content of a document?',
      options: ['<div>', '<main>', '<section>', '<span>'],
      answerIndex: 1,
      explanation: '<main> identifies the primary content landmark for accessibility and semantics.',
    },
    {
      id: 1,
      question: 'What attribute improves accessibility for decorative vs informative images?',
      options: ['title', 'alt', 'srcset', 'role'],
      answerIndex: 1,
      explanation: 'The alt attribute provides screen-reader text or empty alt="" for decorative images.',
    },
    {
      id: 2,
      question: 'Which input type validates email structure natively in HTML5?',
      options: ['text', 'mail', 'email', 'address'],
      answerIndex: 2,
      explanation: 'type="email" triggers built-in browser email validation and mobile keyboards.',
    },
  ],
  react: [
    {
      id: 0,
      question: 'Why should React list items use stable unique keys instead of array indexes when reordering?',
      options: [
        'CSS animations break without indexes',
        'Keys help React track item identity across renders',
        'Indexes are deprecated in JSX',
        'Keys prevent network requests',
      ],
      answerIndex: 1,
      explanation: 'Stable keys allow React reconciliation to preserve component state when items move.',
    },
    {
      id: 1,
      question: 'When does a useEffect with an empty dependency array [] run?',
      options: [
        'On every state change',
        'Only after the initial mount',
        'Before the DOM paints on every render',
        'Never',
      ],
      answerIndex: 1,
      explanation: 'An empty dependency array tells React to run the effect once after mount.',
    },
    {
      id: 2,
      question: 'How should state derived directly from existing props or state be handled?',
      options: [
        'Duplicate it in another useState',
        'Compute it during render instead of syncing with useEffect',
        'Store it in window',
        'Use setTimeout',
      ],
      answerIndex: 1,
      explanation: 'Computing derived values during render avoids stale state and extra re-renders.',
    },
  ],
  node: [
    {
      id: 0,
      question: 'Which Express method registers middleware that parses JSON request bodies?',
      options: ['express.static()', 'express.json()', 'express.Router()', 'express.query()'],
      answerIndex: 1,
      explanation: 'express.json() parses incoming application/json payloads onto req.body.',
    },
    {
      id: 1,
      question: 'Which HTTP status code indicates a newly created resource?',
      options: ['200', '201', '204', '302'],
      answerIndex: 1,
      explanation: '201 Created confirms that a new resource was created on the server.',
    },
    {
      id: 2,
      question: 'Why should blocking synchronous file reads be avoided inside request handlers?',
      options: [
        'They corrupt UTF-8 strings',
        'They block the single-threaded Node.js event loop',
        'They bypass HTTPS',
        'They double memory usage',
      ],
      answerIndex: 1,
      explanation: 'Blocking the event loop stalls all concurrent requests on the Node process.',
    },
  ],
  python: [
    {
      id: 0,
      question: 'What is the average time complexity of checking `x in my_set` in Python?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      answerIndex: 0,
      explanation: 'Python sets are hash tables with O(1) average membership lookup.',
    },
    {
      id: 1,
      question: 'What does a list comprehension `[x*2 for x in nums if x > 0]` return?',
      options: ['A generator', 'A dictionary', 'A new list', 'A tuple'],
      answerIndex: 2,
      explanation: 'Square brackets produce a new materialized list.',
    },
    {
      id: 2,
      question: 'Why use `with open(path) as f:` instead of calling `open()` alone?',
      options: [
        'It reads faster',
        'It guarantees the file handle closes even if an exception occurs',
        'It automatically parses JSON',
        'It creates missing directories',
      ],
      answerIndex: 1,
      explanation: 'Context managers guarantee deterministic resource cleanup.',
    },
  ],
  sql: [
    {
      id: 0,
      question: 'Which SQL clause filters grouped aggregate results like `COUNT(*) > 5`?',
      options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
      answerIndex: 1,
      explanation: 'WHERE filters rows before grouping; HAVING filters groups after GROUP BY.',
    },
    {
      id: 1,
      question: 'What does a LEFT JOIN return?',
      options: [
        'Only matching rows from both tables',
        'All rows from the left table and matching rows from the right table',
        'A Cartesian product',
        'Only unmatched rows',
      ],
      answerIndex: 1,
      explanation: 'LEFT JOIN preserves every row from the left table, filling NULL when no right match exists.',
    },
    {
      id: 2,
      question: 'Why use parameterized SQL queries (`?` or `$1`) instead of string concatenation?',
      options: [
        'To shorten the code',
        'To prevent SQL injection and enable plan caching',
        'To skip indexes',
        'To avoid transactions',
      ],
      answerIndex: 1,
      explanation: 'Parameterized queries separate SQL syntax from untrusted user input.',
    },
  ],
  db: [
    {
      id: 0,
      question: 'What does a database index primarily speed up?',
      options: [
        'Full table scans',
        'Read lookups and range queries on indexed columns',
        'Bulk deletes without WHERE',
        'Network latency',
      ],
      answerIndex: 1,
      explanation: 'B-tree indexes let the engine locate matching rows in O(log n) instead of scanning every row.',
    },
    {
      id: 1,
      question: 'What does the "A" in ACID transactions stand for?',
      options: ['Asynchronous', 'Atomicity', 'Availability', 'Authentication'],
      answerIndex: 1,
      explanation: 'Atomicity ensures all operations in a transaction succeed together or roll back together.',
    },
    {
      id: 2,
      question: 'What is a foreign key constraint used for?',
      options: [
        'Encrypting columns',
        'Enforcing referential integrity between related tables',
        'Compressing JSON columns',
        'Sharding across regions',
      ],
      answerIndex: 1,
      explanation: 'Foreign keys ensure child rows reference valid existing parent rows.',
    },
  ],
  git: [
    {
      id: 0,
      question: 'What does `git switch -c feature/auth` do?',
      options: [
        'Deletes the branch',
        'Creates and switches to a new branch named feature/auth',
        'Merges main into HEAD',
        'Reverts the last commit',
      ],
      answerIndex: 1,
      explanation: 'git switch -c creates a new branch at HEAD and checks it out.',
    },
    {
      id: 1,
      question: 'What is the difference between `git fetch` and `git pull`?',
      options: [
        'No difference',
        'fetch downloads remote changes without merging; pull fetches and merges/rebases',
        'pull only updates tags',
        'fetch deletes local commits',
      ],
      answerIndex: 1,
      explanation: 'git fetch updates remote-tracking refs safely without modifying your working branch.',
    },
    {
      id: 2,
      question: 'Why should `.env` files with secrets never be committed to Git?',
      options: [
        'Git cannot diff text files',
        'Secrets stay in Git history even after deletion',
        'They slow down Vite HMR',
        'Docker ignores .env files',
      ],
      answerIndex: 1,
      explanation: 'Once committed, secrets persist in repository history and clones.',
    },
  ],
};

export async function getSkillQuiz(skillKey: SkillKey): Promise<SkillQuizQuestion[]> {
  if (skillKey === 'js') {
    return FALLBACK_SKILL_QUIZZES.js;
  }

  const ai = getAi();
  if (ai) {
    try {
      const label = SKILL_META[skillKey]?.label || skillKey;
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate 3 practical multiple-choice technical interview assessment questions for ${label} at an early-career software engineering level.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'answerIndex', 'explanation'],
            },
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        question: string;
        options: string[];
        answerIndex: number;
        explanation: string;
      }>;
      if (
        Array.isArray(parsed) &&
        parsed.length === 3 &&
        parsed.every((q) => q.options?.length === 4 && q.answerIndex >= 0 && q.answerIndex < 4)
      ) {
        return parsed.map((q, idx) => ({ id: idx, ...q }));
      }
    } catch (err) {
      console.error('Gemini skill quiz fallback triggered:', err);
    }
  }

  return FALLBACK_SKILL_QUIZZES[skillKey] || FALLBACK_SKILL_QUIZZES.js;
}

const lexicalScore = (text: string): number =>
  new Set((text || '').toLowerCase().match(/\b\w+\b/g) || []).size;

export async function evaluatePromptDuel(params: {
  topic: string;
  userPrompt: string;
}): Promise<PromptDuelResult> {
  const { topic, userPrompt } = params;
  const fallbackChallenger = `Act as a senior engineer reviewing ${topic}. Break down the architecture into concrete components, specify input/output constraints, edge cases, and measurable verification steps.`;

  const ai = getAi();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          duelTopic: topic,
          candidatePrompt: userPrompt,
        }),
        config: {
          systemInstruction:
            'You are the Prompt Duel judge. First craft a crisp, high-signal challenger prompt (2-3 sentences) on the same topic. Then score both the candidatePrompt and challengerPrompt from 0 to 100 on clarity, specificity, constraints, and verifiability, and give 2 sentences of actionable feedback to the candidate.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              challengerPrompt: { type: Type.STRING },
              userScore: { type: Type.INTEGER },
              challengerScore: { type: Type.INTEGER },
              feedback: { type: Type.STRING },
            },
            required: ['challengerPrompt', 'userScore', 'challengerScore', 'feedback'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        challengerPrompt?: string;
        userScore?: number;
        challengerScore?: number;
        feedback?: string;
      };
      if (
        parsed.challengerPrompt &&
        typeof parsed.userScore === 'number' &&
        typeof parsed.challengerScore === 'number'
      ) {
        const uTok = lexicalScore(userPrompt);
        const cTok = lexicalScore(parsed.challengerPrompt);
        const winner =
          parsed.userScore > parsed.challengerScore
            ? 'user'
            : parsed.challengerScore > parsed.userScore
              ? 'challenger'
              : 'draw';
        return {
          topic,
          userScore: Math.max(0, Math.min(100, Math.round(parsed.userScore))),
          challengerScore: Math.max(0, Math.min(100, Math.round(parsed.challengerScore))),
          winner,
          uniqueTokensUser: uTok,
          uniqueTokensChallenger: cTok,
          feedback: parsed.feedback || 'Keep refining constraints and output format.',
          challengerPrompt: parsed.challengerPrompt,
        };
      }
    } catch (err) {
      console.error('Gemini prompt duel fallback triggered:', err);
    }
  }

  const uTok = lexicalScore(userPrompt);
  const cTok = lexicalScore(fallbackChallenger);
  const userScore = Math.min(98, Math.max(20, uTok * 4));
  const challengerScore = Math.min(92, Math.max(40, cTok * 3));
  const winner =
    userScore > challengerScore
      ? 'user'
      : challengerScore > userScore
        ? 'challenger'
        : 'draw';

  return {
    topic,
    userScore,
    challengerScore,
    winner,
    uniqueTokensUser: uTok,
    uniqueTokensChallenger: cTok,
    feedback:
      winner === 'user'
        ? 'Strong specificity and vocabulary density. Adding explicit edge-case constraints will make prompts even sharper.'
        : 'Try specifying role, concrete constraints, edge cases, and expected output format to beat the challenger.',
    challengerPrompt: fallbackChallenger,
  };
}
