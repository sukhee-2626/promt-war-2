import React, { useEffect, useState } from 'react';
import { CheckCircle2, Play, RotateCcw, Sparkles, Timer, XCircle } from 'lucide-react';
import codingArenaBanner from '../assets/images/coding_arena_banner_1794642150971.jpg';
import { api } from '../lib/api';
import {
  APTITUDE_QUESTIONS,
  DSA_TOPICS,
  FLASHCARDS,
  LEARN_MODULES,
  QUIZ_QUESTIONS,
  RESOURCES_LIBRARY,
  SKILL_META,
} from '../lib/catalog';
import type {
  AiProblemSolution,
  AppState,
  CodeGradeResult,
  InterviewType,
  PromptDuelResult,
  SkillKey,
  SkillQuizQuestion,
} from '../types';
import { ProgressBar, Ring } from './UiPrimitives';

interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium';
  fnName: string;
  prompt: string;
  starterCode: string;
  tests: Array<{ label: string; args: unknown[]; expected: unknown }>;
}

const CODING_PROBLEMS: CodingProblem[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    fnName: 'twoSum',
    prompt: 'Return the two indices [i, j] whose numbers in nums add up to target.',
    starterCode: `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}`,
    tests: [
      { label: '[2,7,11,15], target=9', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: '[3,2,4], target=6', args: [[3, 2, 4], 6], expected: [1, 2] },
      { label: '[3,3], target=6', args: [[3, 3], 6], expected: [0, 1] },
    ],
  },
  {
    id: 'valid-parens',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    fnName: 'isValid',
    prompt: 'Return true if every opening bracket (, {, [ is closed in the right order.',
    starterCode: `function isValid(s) {\n  const stack = [];\n  const match = { ')': '(', '}': '{', ']': '[' };\n  for (const ch of s) {\n    if (ch === '(' || ch === '{' || ch === '[') stack.push(ch);\n    else if (stack.pop() !== match[ch]) return false;\n  }\n  return stack.length === 0;\n}`,
    tests: [
      { label: '"()[]{}"', args: ['()[]{}'], expected: true },
      { label: '"([)]"', args: ['([)]'], expected: false },
      { label: '"{[]}"', args: ['{[]}'], expected: true },
    ],
  },
  {
    id: 'max-subarray',
    title: 'Max Subarray Sum',
    difficulty: 'Medium',
    fnName: 'maxSubArray',
    prompt: 'Find the largest sum you can get from a continuous slice of the array.',
    starterCode: `function maxSubArray(nums) {\n  let best = nums[0];\n  let cur = 0;\n  for (const n of nums) {\n    cur = Math.max(n, cur + n);\n    best = Math.max(best, cur);\n  }\n  return best;\n}`,
    tests: [
      { label: '[-2,1,-3,4,-1,2,1,-5,4]', args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { label: '[1]', args: [[1]], expected: 1 },
      { label: '[5,4,-1,7,8]', args: [[5, 4, -1, 7, 8]], expected: 23 },
    ],
  },
  {
    id: 'first-unique',
    title: 'First Unique Letter',
    difficulty: 'Easy',
    fnName: 'firstUniqChar',
    prompt: 'Return the index of the first letter that appears only once, or -1 if none.',
    starterCode: `function firstUniqChar(s) {\n  const counts = {};\n  for (const c of s) counts[c] = (counts[c] || 0) + 1;\n  for (let i = 0; i < s.length; i++) {\n    if (counts[s[i]] === 1) return i;\n  }\n  return -1;\n}`,
    tests: [
      { label: '"leetcode"', args: ['leetcode'], expected: 0 },
      { label: '"loveleetcode"', args: ['loveleetcode'], expected: 2 },
      { label: '"aabb"', args: ['aabb'], expected: -1 },
    ],
  },
];

export function LearnView({
  state,
  onToggleResource,
  onNavigate,
}: {
  state: AppState;
  onToggleResource: (id: string, checked: boolean) => void;
  onNavigate: (screen: string) => void;
}) {
  const currentStep = state.roadmap[0]?.title || 'JavaScript fundamentals';
  return (
    <div>
      <h1>Learn</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Now: {currentStep}
      </p>

      <div className="pn">
        {LEARN_MODULES.map((mod) => {
          const checked = state.user.completedResources.includes(mod.id);
          return (
            <details
              key={mod.id}
              style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                {mod.title} <span className="chip">{mod.kind}</span>
              </summary>
              <p className="mute" style={{ marginTop: 6 }}>
                Why this: {mod.reason}. Source:{' '}
                <a href={mod.url} target="_blank" rel="noopener noreferrer">
                  {mod.domain}
                </a>
              </p>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={checked}
                  onChange={(e) => onToggleResource(mod.id, e.target.checked)}
                />
                <span>Mark complete (+15 XP)</span>
              </label>
            </details>
          );
        })}
      </div>

      <div className="pn">
        <h2>Mini-project</h2>
        <p>
          Build a to-do list that saves to the browser and counts finished tasks. Then take the
          assessment to verify the skill.
        </p>
        <button className="p" onClick={() => onNavigate('quiz')}>
          Take the assessment
        </button>
      </div>
    </div>
  );
}

export function QuizView({
  initialSkill = 'js',
  onSubmitQuiz,
  onNavigate,
}: {
  initialSkill?: SkillKey;
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
  onNavigate: (screen: string) => void;
}) {
  const [skillKey, setSkillKey] = useState<SkillKey>(initialSkill);
  const [questions, setQuestions] = useState<SkillQuizQuestion[]>(QUIZ_QUESTIONS);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    skillKey: SkillKey;
    skillLabel: string;
    score: number;
    total: number;
    priorPercent: number;
    masteryPercent: number;
    replanned: boolean;
  } | null>(null);

  useEffect(() => {
    setSkillKey(initialSkill);
  }, [initialSkill]);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuiz(true);
    setAnswers({});
    setResult(null);
    api
      .getSkillQuiz(skillKey)
      .then((res) => {
        if (!cancelled) setQuestions(res.questions);
      })
      .catch(() => {
        if (!cancelled) setQuestions(QUIZ_QUESTIONS);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuiz(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skillKey]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = questions.map((_, idx) =>
        answers[idx] !== undefined ? answers[idx] : -1
      );
      const answerKeys = questions.map((q) => q.answerIndex);
      const res = await onSubmitQuiz(payload, skillKey, answerKeys);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Assessment: {SKILL_META[skillKey].label}</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Bayesian Knowledge Tracing (BKT) updates your skill probability in SQLite and may replan
        your roadmap.
      </p>

      <div className="opts">
        {(Object.keys(SKILL_META) as SkillKey[]).map((k) => (
          <button
            key={k}
            className={`opt ${skillKey === k ? 'on' : ''}`}
            onClick={() => setSkillKey(k)}
          >
            {SKILL_META[k].label}
          </button>
        ))}
      </div>

      <div className="pn">
        {loadingQuiz ? (
          <p className="mute">Generating {SKILL_META[skillKey].label} assessment…</p>
        ) : (
          <>
            {questions.map((q, i) => (
              <fieldset
                key={`${skillKey}-${q.id}`}
                style={{ border: 0, padding: 0, margin: '0 0 16px' }}
              >
                <legend style={{ fontWeight: 600, marginBottom: 6 }}>
                  {i + 1}. {q.question}
                </legend>
                {q.options.map((opt, j) => (
                  <label
                    key={opt}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name={`quiz-${skillKey}-${i}`}
                      style={{ width: 'auto' }}
                      checked={answers[i] === j}
                      onChange={() => setAnswers((prev) => ({ ...prev, [i]: j }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </fieldset>
            ))}

            <button className="p" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Updating BKT…' : 'Submit answers'}
            </button>
          </>
        )}

        {result && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <p>
              <b>
                Score {result.score} of {result.total}.
              </b>{' '}
              BKT {result.skillLabel} mastery:{' '}
              <span className="font-mono-num">
                {result.priorPercent}% → {result.masteryPercent}%
              </span>
              .
            </p>
            {result.replanned ? (
              <div>
                <p className="mute">
                  The Evaluator and Planner agents replanned your roadmap with a remedial JS closures
                  and async step.
                </p>
                <button className="p" onClick={() => onNavigate('roadmap')}>
                  View new roadmap
                </button>
              </div>
            ) : (
              <div>
                {questions.map((q, idx) => (
                  <p key={idx} className="mute" style={{ marginTop: 4 }}>
                    {idx + 1}. {q.explanation}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PracticeView({
  state,
  initialTab = 'coding',
  onToggleDsa,
  onSubmitAptitude,
  onPromptDuel,
  onLaunchInterview,
  onStateUpdate,
  onToast,
}: {
  state: AppState;
  initialTab?: 'coding' | 'dsa' | 'solver' | 'apt' | 'com' | 'duel';
  onToggleDsa: (slug: string, solved: boolean) => void;
  onSubmitAptitude: (score: number) => Promise<void>;
  onPromptDuel: (topic: string, userPrompt: string) => Promise<PromptDuelResult>;
  onLaunchInterview: (type: InterviewType) => void;
  onStateUpdate?: (s: AppState) => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'coding' | 'dsa' | 'solver' | 'apt' | 'com' | 'duel'>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Live Coding Test Arena state
  const [codingIdx, setCodingIdx] = useState(0);
  const currentProblem = CODING_PROBLEMS[codingIdx];
  const [codeInput, setCodeInput] = useState(currentProblem.starterCode);
  const [testResults, setTestResults] = useState<
    Array<{ label: string; expected: string; actual: string; passed: boolean }>
  >([]);
  const [codeTimerRunning, setCodeTimerRunning] = useState(false);
  const [codeSecLeft, setCodeSecLeft] = useState(25 * 60);
  const [gradingCode, setGradingCode] = useState(false);
  const [codeGrade, setCodeGrade] = useState<CodeGradeResult | null>(null);

  useEffect(() => {
    if (!codeTimerRunning) return;
    const iv = setInterval(() => {
      setCodeSecLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [codeTimerRunning]);

  const selectCodingProblem = (idx: number) => {
    setCodingIdx(idx);
    setCodeInput(CODING_PROBLEMS[idx].starterCode);
    setTestResults([]);
    setCodeGrade(null);
  };

  const runUnitTests = () => {
    const out: Array<{ label: string; expected: string; actual: string; passed: boolean }> = [];
    try {
      const factory = new Function(`${codeInput}\nreturn ${currentProblem.fnName};`);
      const fn = factory();
      if (typeof fn !== 'function') {
        throw new Error(`Could not find function ${currentProblem.fnName}`);
      }
      for (const tc of currentProblem.tests) {
        const clonedArgs = tc.args.map((a) => (Array.isArray(a) ? [...a] : a));
        const res = fn(...clonedArgs);
        const passed = JSON.stringify(res) === JSON.stringify(tc.expected);
        out.push({
          label: tc.label,
          expected: JSON.stringify(tc.expected),
          actual: JSON.stringify(res),
          passed,
        });
      }
      setTestResults(out);
      const passedCount = out.filter((r) => r.passed).length;
      onToast(`${passedCount}/${out.length} tests passed`);
      return out;
    } catch (err: any) {
      const msg = err?.message || 'Syntax error';
      const failed = currentProblem.tests.map((tc) => ({
        label: tc.label,
        expected: JSON.stringify(tc.expected),
        actual: `Error: ${msg}`,
        passed: false,
      }));
      setTestResults(failed);
      onToast(msg);
      return failed;
    }
  };

  const handleGradeCode = async () => {
    if (gradingCode) return;
    const latest = runUnitTests();
    const passedTests = latest.filter((r) => r.passed).length;
    setGradingCode(true);
    try {
      const res = await api.gradeCodingSubmission({
        problemTitle: currentProblem.title,
        language: 'JavaScript',
        code: codeInput,
        passedTests,
        totalTests: currentProblem.tests.length,
      });
      setCodeGrade(res.grade);
      onStateUpdate?.(res.state);
      onToast(`Code checked (+${passedTests === currentProblem.tests.length ? 30 : 15} XP)`);
    } catch (err: any) {
      onToast(err.message || 'Could not check code right now');
    } finally {
      setGradingCode(false);
    }
  };

  // AI Problem Solver state
  const [solveProblem, setSolveProblem] = useState('Two Sum');
  const [solveLanguage, setSolveLanguage] = useState('TypeScript');
  const [solveApproach, setSolveApproach] = useState('');
  const [solvingAi, setSolvingAi] = useState(false);
  const [solution, setSolution] = useState<AiProblemSolution | null>(null);

  // Prompt duel state
  const [duelTopic, setDuelTopic] = useState('REST API error handling & rate limiting');
  const [duelPrompt, setDuelPrompt] = useState('');
  const [duelBusy, setDuelBusy] = useState(false);
  const [duelResult, setDuelResult] = useState<PromptDuelResult | null>(null);

  // Aptitude state
  const [aptPhase, setAptPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [aptAnswers, setAptAnswers] = useState<Record<number, number>>({});
  const [aptSecLeft, setAptSecLeft] = useState(600);

  // Communication STAR composer
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [c3, setC3] = useState('');
  const [composed, setComposed] = useState('');

  const runAiSolve = async (customTitle?: string) => {
    const pTitle = (customTitle ?? solveProblem).trim();
    if (!pTitle || solvingAi) return;
    if (customTitle) {
      setSolveProblem(customTitle);
      setTab('solver');
    }
    setSolvingAi(true);
    try {
      const res = await api.solveDsaProblem(pTitle, solveLanguage, solveApproach);
      setSolution(res.solution);
      onStateUpdate?.(res.state);
      onToast(`AI solution generated (+15 XP)`);
    } catch (err: any) {
      onToast(err.message || 'AI solver unavailable');
    } finally {
      setSolvingAi(false);
    }
  };

  useEffect(() => {
    if (aptPhase !== 'run') return;
    const iv = setInterval(() => {
      setAptSecLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          finishAptitude();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aptPhase]);

  const finishAptitude = async () => {
    setAptPhase('done');
    const score = APTITUDE_QUESTIONS.filter(
      (q, i) => aptAnswers[i] === q.answerIndex
    ).length;
    await onSubmitAptitude(score);
  };

  const totalDsa = DSA_TOPICS.reduce((acc, t) => acc + t[1].length, 0);
  const solvedCount = state.dsaSolved.length;

  const fmtTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      <h1>Coding Test &amp; Practice</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Write real JavaScript code, run instant test checks, get clear AI help, and build confidence step by step.
      </p>

      <div className="opts">
        {(
          [
            ['coding', 'Live Coding Test'],
            ['solver', 'AI Code Helper'],
            ['dsa', 'DSA Checklist'],
            ['apt', 'Aptitude Quiz'],
            ['com', 'Speaking Prep'],
            ['duel', 'Prompt Duel'],
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

      {tab === 'coding' && (
        <div>
          <div className="hero-media-banner" style={{ minHeight: 165 }}>
            <img
              src={codingArenaBanner}
              alt="Live Coding Test Workspace"
              referrerPolicy="no-referrer"
              className="hero-bg"
            />
            <div className="hero-media-scrim" />
            <div className="hero-media-content">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div className="mute font-mono-num" style={{ fontSize: 12, marginBottom: 4 }}>
                    LIVE CODING TEST · JAVASCRIPT SANDBOX
                  </div>
                  <h2 style={{ margin: 0, color: '#ffffff', fontSize: 24 }}>
                    {currentProblem.title} ({currentProblem.difficulty})
                  </h2>
                  <p className="mute" style={{ margin: '4px 0 0', maxWidth: 560 }}>
                    {currentProblem.prompt}
                  </p>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="chip font-mono-num" style={{ margin: 0 }}>
                    <Timer size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                    {fmtTimer(codeSecLeft)}
                  </span>
                  <button
                    onClick={() => setCodeTimerRunning((r) => !r)}
                    style={{ minHeight: 34, padding: '4px 12px', fontSize: 13 }}
                  >
                    {codeTimerRunning ? 'Pause Timer' : 'Start Timer'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="opts" style={{ marginTop: 0 }}>
            {CODING_PROBLEMS.map((p, idx) => (
              <button
                key={p.id}
                className={`opt ${codingIdx === idx ? 'on' : ''}`}
                onClick={() => selectCodingProblem(idx)}
              >
                {p.title}
              </button>
            ))}
          </div>

          <div className="g2">
            <div className="pn" style={{ marginBottom: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Your JavaScript Code</h3>
                <button
                  onClick={() => {
                    setCodeInput(currentProblem.starterCode);
                    setTestResults([]);
                    setCodeGrade(null);
                  }}
                  style={{ minHeight: 30, padding: '2px 10px', fontSize: 12 }}
                >
                  <RotateCcw size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                  Reset Code
                </button>
              </div>
              <textarea
                className="code-editor"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                spellCheck={false}
                aria-label="Coding test editor"
              />
              <div className="row" style={{ marginTop: 10 }}>
                <button onClick={runUnitTests}>
                  <Play size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                  Run Tests
                </button>
                <button className="p" disabled={gradingCode} onClick={handleGradeCode}>
                  <Sparkles size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }} />
                  {gradingCode ? 'Checking Code…' : 'Check with AI (+30 XP)'}
                </button>
              </div>
            </div>

            <div className="pn" style={{ marginBottom: 0 }}>
              <h3 style={{ marginBottom: 8 }}>Test Cases &amp; AI Review</h3>
              {testResults.length === 0 ? (
                <p className="mute">
                  Click <b>Run Tests</b> to check your function against all 3 test cases right away.
                </p>
              ) : (
                testResults.map((tr) => (
                  <div key={tr.label} className="step">
                    {tr.passed ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--ok)', flex: 'none' }} />
                    ) : (
                      <XCircle size={16} style={{ color: 'var(--bad)', flex: 'none' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{tr.label}</div>
                      <div className="mute font-mono-num" style={{ fontSize: 12 }}>
                        Expected {tr.expected} · Got {tr.actual}
                      </div>
                    </div>
                    <span className={`chip ${tr.passed ? 'o' : 'g'}`}>
                      {tr.passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                ))
              )}

              {codeGrade && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div className="row" style={{ gap: 14, marginBottom: 8 }}>
                    <Ring percent={codeGrade.score} size={72} strokeWidth={7} />
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        AI Score: {codeGrade.score}/100
                      </div>
                      <div className="mute font-mono-num" style={{ fontSize: 12 }}>
                        Speed {codeGrade.timeComplexity} · Memory {codeGrade.spaceComplexity}
                      </div>
                    </div>
                  </div>
                  <p style={{ marginBottom: 8, fontSize: 13.5 }}>{codeGrade.feedback}</p>
                  <div className="mute" style={{ fontSize: 12, marginBottom: 4 }}>
                    Clean Reference Code:
                  </div>
                  <pre className="code-editor" style={{ minHeight: 0, margin: 0, overflowX: 'auto' }}>
                    <code>{codeGrade.optimizedSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'solver' && (
        <div>
          <div className="pn">
            <h2>AI Problem Solver &amp; Code Coach (Gemini)</h2>
            <p className="mute" style={{ marginBottom: 12 }}>
              Enter any LeetCode, HackerRank, or system coding problem to get intuition, optimal Big-O complexity, runnable code, and edge cases (+15 XP).
            </p>
            <div className="g2">
              <label>
                <span className="mute">Problem statement or title</span>
                <input
                  value={solveProblem}
                  onChange={(e) => setSolveProblem(e.target.value)}
                  placeholder="e.g. LRU Cache, Longest Substring Without Repeating Characters"
                />
              </label>
              <label>
                <span className="mute">Preferred language</span>
                <select
                  value={solveLanguage}
                  onChange={(e) => setSolveLanguage(e.target.value)}
                >
                  <option>TypeScript</option>
                  <option>Python</option>
                  <option>JavaScript</option>
                  <option>C++</option>
                  <option>Java</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 10 }}>
              <span className="mute">Your current approach or code draft (optional)</span>
              <textarea
                rows={3}
                value={solveApproach}
                onChange={(e) => setSolveApproach(e.target.value)}
                placeholder="Paste your brute-force idea or partial code to optimize it…"
              />
            </label>
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className="p"
                disabled={solvingAi || !solveProblem.trim()}
                onClick={() => runAiSolve()}
              >
                {solvingAi ? 'Solving with Gemini AI…' : 'Solve & Explain (+15 XP)'}
              </button>
              <button onClick={() => onLaunchInterview('DSA')}>
                Practice in DSA Mock Interview
              </button>
            </div>
          </div>

          {solution && (
            <div className="g2">
              <div className="pn">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>{solution.problem}</h2>
                  <span className="mute font-mono-num" style={{ fontSize: 12 }}>
                    Time {solution.timeComplexity} · Space {solution.spaceComplexity}
                  </span>
                </div>
                <h3>Intuition</h3>
                <p className="mute" style={{ marginTop: 4 }}>{solution.intuition}</p>
                <h3 style={{ marginTop: 10 }}>Optimal Strategy</h3>
                <p className="mute" style={{ marginTop: 4 }}>{solution.optimalApproach}</p>
                <h3 style={{ marginTop: 10 }}>Critical Edge Cases</h3>
                <ul style={{ paddingLeft: 18, marginTop: 4, marginBottom: 0 }}>
                  {solution.edgeCases.map((ec) => (
                    <li key={ec} className="mute">{ec}</li>
                  ))}
                </ul>
              </div>
              <div className="pn">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <h2 style={{ margin: 0 }}>Optimal Code ({solveLanguage})</h2>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(solution.codeSolution);
                      onToast('Solution copied');
                    }}
                  >
                    Copy Code
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--soft)',
                    border: '1px solid var(--line)',
                    overflowX: 'auto',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  <code>{solution.codeSolution}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'dsa' && (
        <div>
          <div className="pn">
            <div className="row" style={{ marginBottom: 10 }}>
              <h2 style={{ flex: 1, margin: 0 }}>DSA tracker</h2>
              <button onClick={() => setTab('solver')}>Open AI Problem Solver</button>
              <button className="p" onClick={() => onLaunchInterview('DSA')}>
                Start DSA mock interview
              </button>
            </div>
            <ProgressBar
              label="Solved"
              value={Math.round((solvedCount / totalDsa) * 100)}
            />
            <span className="mute font-mono-num">
              {solvedCount} of {totalDsa} problems
            </span>
          </div>

          {DSA_TOPICS.map(([topic, problems]) => (
            <div key={topic} className="pn">
              <h3 style={{ marginBottom: 8 }}>{topic}</h3>
              {problems.map(([title, slug]) => {
                const checked = state.dsaSolved.includes(slug);
                return (
                  <div key={slug} className="step">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${title} solved`}
                      style={{ width: 'auto', cursor: 'pointer' }}
                      checked={checked}
                      onChange={(e) => onToggleDsa(slug, e.target.checked)}
                    />
                    <span>{title}</span>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        onClick={() => runAiSolve(title)}
                        style={{ minHeight: 30, padding: '2px 10px', fontSize: 12 }}
                      >
                        AI Solve
                      </button>
                      <a
                        className="lnk"
                        href={`https://leetcode.com/problems/${slug}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ margin: 0, padding: '4px 12px', fontSize: 12 }}
                      >
                        LeetCode
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="pn">
            <h3 style={{ marginBottom: 8 }}>Complexity cheat sheet</h3>
            <table className="cx">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Typical cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Array index access</td>
                  <td className="font-mono-num">O(1)</td>
                </tr>
                <tr>
                  <td>Hash map lookup (average)</td>
                  <td className="font-mono-num">O(1)</td>
                </tr>
                <tr>
                  <td>Binary search</td>
                  <td className="font-mono-num">O(log n)</td>
                </tr>
                <tr>
                  <td>Efficient sorting</td>
                  <td className="font-mono-num">O(n log n)</td>
                </tr>
                <tr>
                  <td>BFS or DFS on a graph</td>
                  <td className="font-mono-num">O(V + E)</td>
                </tr>
                <tr>
                  <td>Heap push or pop</td>
                  <td className="font-mono-num">O(log n)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'apt' && (
        <div>
          {aptPhase === 'idle' && (
            <div className="pn">
              <h2>Aptitude test</h2>
              <p className="mute">
                10 questions across quant, logical and verbal. 10 minutes, like a campus placement
                round. Best saved score:{' '}
                <span className="font-mono-num">{state.user.aptitudeBest}/10</span>.
              </p>
              <button
                className="p"
                onClick={() => {
                  setAptAnswers({});
                  setAptSecLeft(600);
                  setAptPhase('run');
                }}
              >
                Start test
              </button>
              <p className="mute" style={{ marginTop: 12 }}>
                More practice:{' '}
                <a
                  className="lnk"
                  href="https://www.indiabix.com/aptitude/questions-and-answers/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  IndiaBix
                </a>
                <a
                  className="lnk"
                  href="https://www.youtube.com/results?search_query=aptitude%20preparation%20placements"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube
                </a>
              </p>
            </div>
          )}

          {aptPhase === 'run' && (
            <div className="pn">
              <div className="row" style={{ marginBottom: 12 }}>
                <span className="chip font-mono-num">{fmtTimer(aptSecLeft)}</span>
                <span style={{ flex: 1 }} />
                <button className="p" onClick={finishAptitude}>
                  Submit
                </button>
              </div>
              {APTITUDE_QUESTIONS.map((q, i) => (
                <fieldset
                  key={i}
                  style={{ border: 0, padding: 0, margin: '14px 0 0' }}
                >
                  <legend style={{ fontWeight: 600 }}>
                    {i + 1}. {q.question} <span className="chip">{q.section}</span>
                  </legend>
                  {q.options.map((opt, j) => (
                    <label
                      key={opt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={`apt-${i}`}
                        style={{ width: 'auto' }}
                        checked={aptAnswers[i] === j}
                        onChange={() =>
                          setAptAnswers((prev) => ({ ...prev, [i]: j }))
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          )}

          {aptPhase === 'done' && (() => {
            const score = APTITUDE_QUESTIONS.filter(
              (q, i) => aptAnswers[i] === q.answerIndex
            ).length;
            const bySec: Record<string, [number, number]> = {};
            APTITUDE_QUESTIONS.forEach((q, i) => {
              bySec[q.section] = bySec[q.section] || [0, 0];
              bySec[q.section][1]++;
              if (aptAnswers[i] === q.answerIndex) bySec[q.section][0]++;
            });
            return (
              <div>
                <div className="g2">
                  <div className="pn row">
                    <Ring percent={score * 10} size={120} />
                    <div>
                      <h2>{score} of 10</h2>
                      <p className="mute">
                        {score >= 8
                          ? 'Excellent accuracy'
                          : score >= 5
                            ? 'Good base. Review the misses below'
                            : 'Keep practising'}
                      </p>
                    </div>
                  </div>
                  <div className="pn">
                    <h2>By section</h2>
                    {Object.entries(bySec).map(([sec, [ok, tot]]) => (
                      <ProgressBar
                        key={sec}
                        label={sec}
                        value={Math.round((ok / tot) * 100)}
                      />
                    ))}
                  </div>
                </div>
                <div className="pn">
                  <h2>Review</h2>
                  {APTITUDE_QUESTIONS.map((q, i) => {
                    const ok = aptAnswers[i] === q.answerIndex;
                    return (
                      <div key={i} className="step">
                        <div className="dot" />
                        <div>
                          <h3>
                            {i + 1}. {q.question}
                          </h3>
                          <span className="mute">
                            Your answer:{' '}
                            {aptAnswers[i] === undefined
                              ? 'skipped'
                              : q.options[aptAnswers[i]]}{' '}
                            · Correct: {q.options[q.answerIndex]}. {q.explanation}
                          </span>
                        </div>
                        <span className={`chip ${ok ? 'o' : 'g'}`}>
                          {ok ? 'Correct' : 'Review'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button className="p" onClick={() => setAptPhase('idle')}>
                  Try again
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'com' && (
        <div>
          <div className="g2">
            {[
              [
                'Structure',
                'Open with the point, give two or three supporting details, then close with the result.',
              ],
              [
                'Pace and tone',
                'Aim for about 130 words a minute. Pause between ideas instead of using filler words.',
              ],
              [
                'Listening',
                'Repeat the question in your own words before answering. It buys thinking time and shows focus.',
              ],
            ].map(([title, desc]) => (
              <div key={title} className="pn">
                <h3>{title}</h3>
                <p className="mute" style={{ marginTop: 6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pn">
            <h2>Self-introduction builder</h2>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span className="mute">Who you are</span>
              <input
                value={c1}
                onChange={(e) => setC1(e.target.value)}
                placeholder="a final-year computer science student"
              />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span className="mute">What you have built or achieved</span>
              <input
                value={c2}
                onChange={(e) => setC2(e.target.value)}
                placeholder="I built a library tracker used by 40 students"
              />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span className="mute">What role you want</span>
              <input
                value={c3}
                onChange={(e) => setC3(e.target.value)}
                placeholder="start my career as a full stack developer"
              />
            </label>
            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="p"
                onClick={() => {
                  if (!c1.trim() || !c2.trim() || !c3.trim()) {
                    onToast('Fill all three fields');
                    return;
                  }
                  const text = `Hello, I’m ${state.user.name}, ${c1
                    .trim()
                    .replace(/\.$/, '')}. ${c2.trim().replace(/\.$/, '')}. I’m now looking to ${c3
                    .trim()
                    .replace(/\.$/, '')}.`;
                  setComposed(text);
                }}
              >
                Compose
              </button>
              <button onClick={() => onLaunchInterview('Communication')}>
                Start communication mock interview
              </button>
            </div>
            {composed && (
              <div style={{ marginTop: 12 }}>
                <p>{composed}</p>
                <span className="mute font-mono-num">
                  {composed.split(/\s+/).length} words · about{' '}
                  {Math.round(composed.split(/\s+/).length / 2.2)} seconds when spoken
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'duel' && (
        <div>
          <div className="pn">
            <h2>Prompt Duel arena</h2>
            <p className="mute" style={{ marginBottom: 12 }}>
              Write a clear, constraint-driven engineering prompt. Compete against the AI Challenger
              on lexical density, specificity, and verifiability.
            </p>
            <label style={{ display: 'block', marginBottom: 10 }}>
              <span className="mute">Challenge topic</span>
              <select
                value={duelTopic}
                onChange={(e) => setDuelTopic(e.target.value)}
              >
                <option>REST API error handling &amp; rate limiting</option>
                <option>SQL query optimization for slow joins</option>
                <option>React state management &amp; accessibility audit</option>
                <option>Behavioral STAR debugging story</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 10 }}>
              <span className="mute">Your prompt</span>
              <textarea
                rows={4}
                value={duelPrompt}
                onChange={(e) => setDuelPrompt(e.target.value)}
                placeholder="Specify role, constraints, edge cases, and output format…"
              />
            </label>
            <button
              className="p"
              disabled={duelBusy}
              onClick={async () => {
                if (duelPrompt.trim().split(/\s+/).length < 4) {
                  onToast('Write a prompt of at least 4 words');
                  return;
                }
                setDuelBusy(true);
                try {
                  const res = await onPromptDuel(duelTopic, duelPrompt);
                  setDuelResult(res);
                } finally {
                  setDuelBusy(false);
                }
              }}
            >
              {duelBusy ? 'Judging duel…' : 'Challenge AI'}
            </button>
          </div>

          {duelResult && (
            <div className="g2">
              <div className="pn">
                <h3>
                  Your score:{' '}
                  <span className="font-mono-num">{duelResult.userScore}</span> ·{' '}
                  {duelResult.winner === 'user'
                    ? 'You win'
                    : duelResult.winner === 'challenger'
                      ? 'Challenger wins'
                      : 'Draw'}
                </h3>
                <p className="mute font-mono-num" style={{ marginTop: 4 }}>
                  Unique keywords: {duelResult.uniqueTokensUser} vs{' '}
                  {duelResult.uniqueTokensChallenger}
                </p>
                <p style={{ marginTop: 8 }}>{duelResult.feedback}</p>
              </div>
              <div className="pn">
                <h3>
                  Challenger score:{' '}
                  <span className="font-mono-num">{duelResult.challengerScore}</span>
                </h3>
                <p className="mute" style={{ marginTop: 8 }}>
                  {duelResult.challengerPrompt}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResourcesView({
  state,
  onToast,
}: {
  state: AppState;
  onToast: (msg: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const q = encodeURIComponent;
  const filtered = RESOURCES_LIBRARY.filter(
    (r) => filter === 'All' || r[2] === filter
  );
  const categories = [...new Set(filtered.map((r) => r[0]))];

  return (
    <div>
      <h1>Resources</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Videos, courses and practice picked for {state.user.role}.
      </p>

      <div className="pn">
        <h2>Find anything</h2>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (!searchTerm.trim()) onToast('Type a skill or topic');
                else setSubmittedTerm(searchTerm.trim());
              }
            }}
            placeholder="e.g. React, SQL joins, system design"
          />
          <button
            className="p"
            onClick={() => {
              if (!searchTerm.trim()) onToast('Type a skill or topic');
              else setSubmittedTerm(searchTerm.trim());
            }}
          >
            Find
          </button>
        </div>
        {submittedTerm && (
          <div style={{ marginTop: 12 }}>
            <a
              className="lnk"
              href={`https://www.youtube.com/results?search_query=${q(
                `${submittedTerm} tutorial`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>
            <a
              className="lnk"
              href={`https://www.udemy.com/courses/search/?q=${q(submittedTerm)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Udemy
            </a>
            <a
              className="lnk"
              href={`https://www.coursera.org/search?query=${q(submittedTerm)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Coursera
            </a>
            <a
              className="lnk"
              href={`https://www.freecodecamp.org/news/search/?query=${q(
                submittedTerm
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              freeCodeCamp
            </a>
          </div>
        )}
      </div>

      <div className="pn">
        <h2>Recommended for your roadmap</h2>
        {state.roadmap.map((step) => (
          <div key={step.id} className="rr">
            <div>
              <h3>{step.title}</h3>
              <span className="mute font-mono-num">{step.hours} hours</span>
            </div>
            <div>
              <a
                className="lnk"
                href={`https://www.youtube.com/results?search_query=${q(
                  `${step.title} tutorial`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube
              </a>
              <a
                className="lnk"
                href={`https://www.udemy.com/courses/search/?q=${q(step.title)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Udemy
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="opts">
        {['All', 'YouTube', 'Udemy', 'Free course', 'Practice'].map((cat) => (
          <button
            key={cat}
            className={`opt ${filter === cat ? 'on' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {categories.map((cat) => (
        <div key={cat} className="pn">
          <h3 style={{ marginBottom: 6 }}>{cat}</h3>
          {filtered
            .filter((r) => r[0] === cat)
            .map((r) => (
              <div key={r[1]} className="rr">
                <div>
                  <h3>{r[1]}</h3>
                  <span className="mute">{r[4]}</span>{' '}
                  <span className="chip">{r[2]}</span>
                </div>
                <a
                  className="lnk"
                  href={r[3]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ margin: 0 }}
                >
                  Open
                </a>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

export function MeetView({
  state,
  onAddMeeting,
  onDeleteMeeting,
  onRewardEvent,
  onToast,
}: {
  state: AppState;
  onAddMeeting: (topic: string, whenMs: number, link: string) => Promise<void>;
  onDeleteMeeting: (id: number) => Promise<void>;
  onRewardEvent: (kind: 'meeting_join' | 'precall') => void;
  onToast: (msg: string) => void;
}) {
  const [joinInput, setJoinInput] = useState('');
  const [topic, setTopic] = useState('DSA');
  const [dateTime, setDateTime] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [preCheck, setPreCheck] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const normalizeMeetUrl = (raw: string): string | null => {
    let v = raw.trim();
    if (!v) return null;
    if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(v)) {
      return `https://meet.google.com/${v.toLowerCase()}`;
    }
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    try {
      const u = new URL(v);
      if (
        /(^|\.)(meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|whereby\.com)$/.test(
          u.hostname
        )
      ) {
        return u.href;
      }
    } catch {
      return null;
    }
    return null;
  };

  const validJoinUrl = normalizeMeetUrl(joinInput);

  const schedule = async () => {
    if (!dateTime) {
      onToast('Pick a date and time');
      return;
    }
    const normLink = linkInput.trim() ? normalizeMeetUrl(linkInput) : '';
    if (linkInput.trim() && !normLink) {
      onToast('That link is not a supported meeting link');
      return;
    }
    await onAddMeeting(topic, new Date(dateTime).getTime(), normLink || '');
    setDateTime('');
    setLinkInput('');
  };

  const fmtCalDate = (ms: number) =>
    new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, '');

  const checklistLabels = [
    'Camera and microphone tested',
    'Quiet space and good lighting',
    'Resume and notes open',
    'Water nearby, phone on silent',
  ];

  return (
    <div>
      <h1>Live mock meetings</h1>
      <p className="mute" style={{ marginBottom: 16 }}>
        Practise with a real person. Join a call or schedule one in Google Meet, Zoom or Teams.
      </p>

      <div className="g2">
        <div className="pn">
          <h2>Join a meeting</h2>
          <input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="Paste a link or a Meet code like abc-defg-hij"
          />
          <div className="row" style={{ marginTop: 10 }}>
            {validJoinUrl ? (
              <a
                className="lnk"
                href={validJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onRewardEvent('meeting_join')}
                style={{
                  background: 'var(--pri)',
                  color: 'var(--onpri)',
                  borderColor: 'var(--pri)',
                  fontWeight: 600,
                }}
              >
                Join now
              </a>
            ) : (
              <button
                className="p"
                onClick={() =>
                  onToast('Enter a Google Meet, Zoom, Teams or Whereby link or code')
                }
              >
                Join now
              </button>
            )}
          </div>
          <p className="mute" style={{ marginTop: 12 }}>
            Start a new one:
          </p>
          <div>
            <a
              className="lnk"
              href="https://meet.google.com/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Meet
            </a>
            <a
              className="lnk"
              href="https://zoom.us/start"
              target="_blank"
              rel="noopener noreferrer"
            >
              Zoom
            </a>
            <a
              className="lnk"
              href="https://teams.microsoft.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Teams
            </a>
          </div>
        </div>

        <div className="pn">
          <h2>Before you join</h2>
          {checklistLabels.map((lbl, idx) => (
            <label
              key={lbl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={preCheck[idx]}
                onChange={(e) => {
                  const next = [...preCheck];
                  next[idx] = e.target.checked;
                  setPreCheck(next);
                  if (next.every(Boolean)) onRewardEvent('precall');
                }}
              />
              <span>{lbl}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pn">
        <h2>Schedule a session</h2>
        <div className="g2">
          <label>
            <span className="mute">Topic</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {['DSA', 'Aptitude', 'Communication', 'Behavioral', 'Technical', 'HR'].map(
                (t) => (
                  <option key={t}>{t}</option>
                )
              )}
            </select>
          </label>
          <label>
            <span className="mute">Date and time</span>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </label>
        </div>
        <label style={{ display: 'block', marginTop: 10 }}>
          <span className="mute">Meeting link (optional)</span>
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste a Meet, Zoom or Teams link"
          />
        </label>
        <button className="p" style={{ marginTop: 12 }} onClick={schedule}>
          Add session
        </button>
      </div>

      <div className="pn">
        <h2>Your sessions</h2>
        {state.meetings.length === 0 ? (
          <p className="mute">
            No sessions yet. Schedule one with a friend, mentor or senior.
          </p>
        ) : (
          state.meetings.map((m) => {
            const diff = m.whenMs - Date.now();
            const rel =
              diff <= 0
                ? 'Started'
                : diff < 3600000
                  ? `in ${Math.ceil(diff / 60000)} min`
                  : diff < 86400000
                    ? `in ${Math.round(diff / 3600000)} h`
                    : `in ${Math.round(diff / 86400000)} days`;
            const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
              `place1ai mock interview: ${m.topic}`
            )}&dates=${fmtCalDate(m.whenMs)}/${fmtCalDate(
              m.whenMs + 45 * 60000
            )}&details=${encodeURIComponent(
              `Topic: ${m.topic}${m.link ? `\nJoin: ${m.link}` : ''}`
            )}${m.link ? `&location=${encodeURIComponent(m.link)}` : ''}`;

            return (
              <div key={m.id} className="rr">
                <div>
                  <h3>{m.topic}</h3>
                  <span className="mute font-mono-num">
                    {new Date(m.whenMs).toLocaleString()} · {rel}
                  </span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {m.link ? (
                    <a
                      className="lnk"
                      href={m.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onRewardEvent('meeting_join')}
                      style={{
                        margin: 0,
                        background: 'var(--pri)',
                        color: 'var(--onpri)',
                        borderColor: 'var(--pri)',
                        fontWeight: 600,
                      }}
                    >
                      Join
                    </a>
                  ) : (
                    <button disabled>Join</button>
                  )}
                  <a
                    className="lnk"
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ margin: 0 }}
                  >
                    Calendar
                  </a>
                  <button
                    onClick={() => {
                      const txt = `Mock interview (${m.topic}) on ${new Date(
                        m.whenMs
                      ).toLocaleString()}${m.link ? `\nJoin: ${m.link}` : ''}`;
                      navigator.clipboard
                        ?.writeText(txt)
                        .then(() => onToast('Invite copied'))
                        .catch(() => onToast('Copy not available'));
                    }}
                  >
                    Copy invite
                  </button>
                  <button
                    aria-label="Remove"
                    onClick={() => onDeleteMeeting(m.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudyView({
  state,
  onCompleteFocus,
  onToggleWeekly,
  onCardMastered,
}: {
  state: AppState;
  onCompleteFocus: (minutes: number) => Promise<void>;
  onToggleWeekly: (dayKey: string, checked: boolean) => void;
  onCardMastered: () => void;
}) {
  const [tab, setTab] = useState<'focus' | 'plan' | 'card'>('focus');

  // Focus timer
  const [mode, setMode] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(iv);
          setRunning(false);
          onCompleteFocus(mode);
          return mode * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, mode, onCompleteFocus]);

  // Flashcards
  const [deck, setDeck] = useState<keyof typeof FLASHCARDS>('DSA');
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownSession, setKnownSession] = useState(0);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(
      2,
      '0'
    )}`;

  const hrs = state.user.prof?.hrs || 8;
  const wdHrs = Math.max(0.5, Math.round(((hrs * 0.6) / 5) * 2) / 2);
  const weHrs = Math.max(0.5, Math.round(((hrs * 0.4) / 2) * 2) / 2);
  const weekPrefix = (() => {
    const m = new Date();
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return m.toISOString().slice(0, 10);
  })();

  const deckCards = FLASHCARDS[deck];
  const currentCard = deckCards[cardIdx % deckCards.length];

  return (
    <div>
      <h1>Study</h1>
      <p className="mute" style={{ marginBottom: 12 }}>
        Focus sessions, a weekly plan matched to your hours, and flashcards.
      </p>

      <div className="opts">
        {(
          [
            ['focus', 'Focus timer'],
            ['plan', 'Weekly plan'],
            ['card', 'Flashcards'],
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

      {tab === 'focus' && (
        <div className="pn" style={{ textAlign: 'center' }}>
          <span className="mute">Focus timer</span>
          <div
            className="font-mono-num"
            style={{
              fontSize: 64,
              fontWeight: 300,
              letterSpacing: '0.02em',
              margin: '6px 0',
            }}
          >
            {fmt(secondsLeft)}
          </div>
          <div
            className="xp"
            style={{ margin: '10px auto 16px', maxWidth: 360 }}
          >
            <b
              style={{
                width: `${100 - (secondsLeft / (mode * 60)) * 100}%`,
              }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <select
              style={{ width: 'auto' }}
              value={mode}
              onChange={(e) => {
                const next = Number(e.target.value);
                setRunning(false);
                setMode(next);
                setSecondsLeft(next * 60);
              }}
            >
              <option value={25}>25 min focus</option>
              <option value={50}>50 min deep work</option>
              <option value={15}>15 min quick sprint</option>
            </select>
            <button className="p" onClick={() => setRunning((r) => !r)}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setSecondsLeft(mode * 60);
              }}
            >
              Reset
            </button>
          </div>
          <p className="mute" style={{ marginTop: 14 }}>
            Now studying: <b>{state.roadmap[0]?.title || 'JavaScript fundamentals'}</b>
          </p>
          <p className="mute font-mono-num">
            {state.user.focus.sessions} sessions · {state.user.focus.minutes} min total
          </p>
        </div>
      )}

      {tab === 'plan' && (
        <div className="pn">
          <h2>This week · {hrs} hours</h2>
          {WEEK_DAYS.map((day, idx) => {
            const key = `${weekPrefix}-${day}`;
            const checked = state.user.weeklyDone.includes(key);
            const topicTitle =
              state.roadmap[idx % Math.max(1, state.roadmap.length)]?.title ||
              'JavaScript fundamentals';
            return (
              <label
                key={day}
                className="step"
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={checked}
                  onChange={(e) => onToggleWeekly(key, e.target.checked)}
                />
                <span>
                  <b>{day}</b> · {topicTitle}
                </span>
                <span className="chip font-mono-num">
                  {idx < 5 ? wdHrs : weHrs} h
                </span>
              </label>
            );
          })}
          <p className="mute" style={{ marginTop: 10 }}>
            Hours follow your profile. Edit them from Home.
          </p>
        </div>
      )}

      {tab === 'card' && (
        <div>
          <div className="opts">
            {(Object.keys(FLASHCARDS) as Array<keyof typeof FLASHCARDS>).map(
              (d) => (
                <button
                  key={d}
                  className={`opt ${deck === d ? 'on' : ''}`}
                  onClick={() => {
                    setDeck(d);
                    setCardIdx(0);
                    setFlipped(false);
                  }}
                >
                  {d}
                </button>
              )
            )}
          </div>
          <div
            className="pn"
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setFlipped((f) => !f);
            }}
            style={{
              textAlign: 'center',
              minHeight: 190,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span className="mute font-mono-num">
              Card {(cardIdx % deckCards.length) + 1} of {deckCards.length} ·{' '}
              {flipped ? 'Answer' : 'Question'} · tap to flip
            </span>
            <h2 style={{ margin: '12px 0 0' }}>
              {flipped ? currentCard[1] : currentCard[0]}
            </h2>
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              onClick={() => {
                setCardIdx((i) => i + 1);
                setFlipped(false);
              }}
            >
              Review again
            </button>
            <button
              className="p"
              onClick={() => {
                setKnownSession((k) => k + 1);
                setCardIdx((i) => i + 1);
                setFlipped(false);
                onCardMastered();
              }}
            >
              I know this
            </button>
          </div>
          <p className="mute font-mono-num" style={{ textAlign: 'center', marginTop: 10 }}>
            Known this session: {knownSession}
          </p>
        </div>
      )}
    </div>
  );
}
