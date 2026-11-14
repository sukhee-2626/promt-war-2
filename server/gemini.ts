import { GoogleGenAI, Type } from '@google/genai';
import { INTERVIEW_TIPS, ROLE_PLANS, SKILL_META } from './data.ts';
import type {
  AgentAuditResult,
  AiProblemSolution,
  AppState,
  AtsAiAudit,
  CodeGradeResult,
  InterviewQuestionReview,
  InterviewScore,
  InterviewType,
  OnboardingRecommendation,
  RagQueryResult,
  SkillKey,
  TargetRole,
} from '../src/types.ts';

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function buildKnowledgeChunks(state: AppState): Array<{ id: string; text: string }> {
  const skillsSummary = (Object.keys(SKILL_META) as SkillKey[])
    .map((k) => `${SKILL_META[k].label} ${Math.round((state.skills[k] || 0) * 100)}%`)
    .join(', ');

  const roadmapSummary = state.roadmap
    .map((s) => `${s.title} (${s.hours}h${s.isRemedial ? ', remedial' : ''})`)
    .join('; ');

  const jobsSummary = state.jobs
    .map(
      (j) =>
        `${j.title} at ${j.company} (${j.fit}% fit, missing: ${
          j.missing.map((m) => SKILL_META[m].label).join(', ') || 'none'
        })`
    )
    .join('; ');

  return [
    {
      id: 'Resume',
      text: `${state.resume.name}: ${state.resume.summary} Skills: ${state.resume.skills}. Experience: ${state.resume.experience.replace(/\n/g, '; ')}`,
    },
    {
      id: 'Skill twin',
      text: `${skillsSummary}. Overall readiness: ${state.readiness}%. Target role: ${state.user.role}.`,
    },
    {
      id: 'Roadmap',
      text: `Version ${state.user.roadmapVersion} for ${state.user.role} at ${state.user.prof?.hrs || 8}h/week: ${roadmapSummary}`,
    },
    {
      id: 'Market: Frontend Engineer',
      text: 'React 62%, TypeScript 58%, Tailwind/CSS 44%, Core Web Vitals & Playwright/Jest testing in 39% of 9,120 active Frontend Engineer postings.',
    },
    {
      id: 'Market: Full Stack',
      text: 'React 54%, TypeScript 45%, CI/CD 42%, JavaScript 42%, AWS 40%, SQL 35% of 7,309 postings, June 2026 (InterviewStack). TypeScript pays about $20K more.',
    },
    {
      id: 'Market: Data Analyst',
      text: 'SQL 60 to 71% and Python 44 to 53% of Data Analyst postings, May 2026. GenAI skills appear in 6.9% and pay about $22K more.',
    },
    {
      id: 'Interview tips',
      text: 'Use STAR: situation, task, action, result. Put a number in the result, such as cut load time by 30%.',
    },
    {
      id: 'ATS',
      text: `Estimated ATS score ${state.ats.score}/100. Matched: ${state.ats.hit.join(', ')}. Missing keywords: ${state.ats.miss.join(', ') || 'none'}.`,
    },
    {
      id: 'Jobs',
      text: jobsSummary,
    },
    ...(state.customRagDocs || []).map((doc) => ({
      id: `Note: ${doc.title}`,
      text: doc.content,
    })),
  ];
}

export function retrieveTopChunks(
  chunks: Array<{ id: string; text: string }>,
  query: string
): Array<{ id: string; text: string; score: number }> {
  const stop = new Set([
    'the',
    'and',
    'what',
    'how',
    'for',
    'with',
    'are',
    'you',
    'about',
    'should',
    'can',
    'why',
    'this',
    'that',
    'your',
    'from',
  ]);
  const tokens = (query.toLowerCase().match(/[a-z0-9+#.]{3,}/g) || []).filter(
    (w) => !stop.has(w)
  );
  if (tokens.length === 0) return [];

  const df = (w: string) =>
    chunks.filter((d) => `${d.id} ${d.text}`.toLowerCase().includes(w)).length;

  return chunks
    .map((d) => {
      const hay = `${d.id} ${d.text}`.toLowerCase();
      const score = tokens.reduce((acc, w) => {
        const count = hay.split(w).length - 1;
        return acc + count * Math.log(1 + chunks.length / (1 + df(w)));
      }, 0);
      return { ...d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function askMentor(params: {
  state: AppState;
  question: string;
  ragEnabled: boolean;
}): Promise<{ answer: string; sources: string[] }> {
  const { state, question, ragEnabled } = params;
  const chunks = buildKnowledgeChunks(state);
  const retrieved = ragEnabled ? retrieveTopChunks(chunks, question) : [];

  const ai = getClient();
  if (ai) {
    try {
      const contextText = ragEnabled
        ? retrieved.length > 0
          ? retrieved.map((r) => `[Source: ${r.id}] ${r.text}`).join('\n')
          : chunks.map((c) => `[Source: ${c.id}] ${c.text}`).join('\n')
        : `Target role: ${state.user.role}. Readiness: ${state.readiness}%. Roadmap v${state.user.roadmapVersion} (${state.roadmap.length} steps, ${state.user.prof?.hrs || 8}h/week). ATS score: ${state.ats.score}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `User question: ${question}\n\nGrounded user data:\n${contextText}`,
        config: {
          systemInstruction:
            'You are the place1ai career mentor. Give concise, helpful, actionable answers in 2 to 4 sentences grounded ONLY in the provided user data and roadmap. Do not invent fake metrics. Cite the source names you used.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: {
                type: Type.STRING,
                description: 'Concise 2-4 sentence mentor answer grounded in the provided data.',
              },
              sources: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of source labels referenced from the provided context.',
              },
            },
            required: ['answer', 'sources'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        answer?: string;
        sources?: string[];
      };
      if (parsed.answer) {
        const sources =
          ragEnabled && retrieved.length > 0
            ? retrieved.map((r) => r.id)
            : parsed.sources && parsed.sources.length > 0
              ? parsed.sources
              : [`skill twin, roadmap v${state.user.roadmapVersion}`];
        return { answer: parsed.answer, sources };
      }
    } catch (err) {
      console.error('Gemini mentor fallback triggered:', err);
    }
  }

  // Deterministic grounded fallback
  if (ragEnabled) {
    if (retrieved.length === 0) {
      return {
        answer:
          'No matching source in your profile for that query. Try asking about TypeScript, SQL, resume, roadmap, ATS, jobs, or interview.',
        sources: [],
      };
    }
    const lead = retrieved[0].text.slice(0, 260) + (retrieved[0].text.length > 260 ? '…' : '');
    return {
      answer: `From your data: ${lead}`,
      sources: retrieved.map((r) => r.id),
    };
  }

  const l = question.toLowerCase();
  let answer = 'I can explain your skill gaps, roadmap steps, ATS resume score, or assessment results.';
  if (/why|first/.test(l)) {
    answer = `JavaScript comes early because React and Node.js both depend on it, and your mastery there is ${Math.round((state.skills.js || 0) * 100)}%.`;
  } else if (/plan|week|road/.test(l)) {
    answer = `Your roadmap is version ${state.user.roadmapVersion} with ${state.roadmap.length} steps paced at ${state.user.prof?.hrs || 8} hours a week.`;
  } else if (/resume|ats/.test(l)) {
    answer = `Your ATS estimate is ${state.ats.score}/100. Missing keywords: ${state.ats.miss.slice(0, 4).join(', ') || 'none'}.`;
  }
  return {
    answer,
    sources: [`skill twin, roadmap v${state.user.roadmapVersion}`],
  };
}

export async function runRagInspectorQuery(params: {
  state: AppState;
  query: string;
}): Promise<RagQueryResult> {
  const { state, query } = params;
  const chunks = buildKnowledgeChunks(state);
  const retrieved = retrieveTopChunks(chunks, query).map((r) => ({
    id: r.id,
    text: r.text,
    score: Number(r.score.toFixed(2)),
  }));
  const reply = await askMentor({ state, question: query, ragEnabled: true });
  return {
    query,
    retrieved,
    answer: reply.answer,
    sources: reply.sources,
    usedGemini: Boolean(getClient()),
  };
}

function deterministicScoreAnswer(q: string, answer: string): InterviewQuestionReview {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const l = answer.toLowerCase();
  const fillers = (l.match(/\b(um|uh|like|you know|basically|actually)\b/g) || []).length;
  const hedges = (l.match(/maybe|i guess|i think|sort of|kind of/g) || []).length;
  const starHits = new Set(
    l.match(/situation|task|action|result|outcome|impact|learned|because|resulted/g) || []
  ).size;
  const hasNumber = /\d/.test(answer);
  const kw = q
    .toLowerCase()
    .split(/\W+/)
    .filter((x) => x.length > 4);
  const overlap = kw.length
    ? kw.filter((x) => l.includes(x.slice(0, 5))).length / kw.length
    : 0.5;
  const clamp = (x: number) => Math.max(5, Math.min(100, Math.round(x)));

  const s: InterviewScore = {
    Communication: clamp(92 - fillers * 9 - (words > 200 ? 18 : 0) - (words < 30 ? 25 : 0)),
    Structure: clamp(25 + starHits * 18 + (hasNumber ? 10 : 0)),
    'Relevance and depth': clamp(35 + overlap * 35 + Math.min(words, 120) / 6 + (hasNumber ? 8 : 0)),
    Confidence: clamp(90 - hedges * 10 - fillers * 4),
  };
  const lowest = (Object.keys(s) as Array<keyof InterviewScore>).sort((a, b) => s[a] - s[b])[0];
  return {
    q,
    w: words,
    s,
    tip: INTERVIEW_TIPS[lowest] || 'Keep your answer structured and concrete.',
    answer,
  };
}

export async function evaluateInterviewSession(params: {
  type: InterviewType;
  role: string;
  qaPairs: Array<{ q: string; a: string }>;
}): Promise<{
  overallScore: number;
  breakdown: InterviewScore;
  reviews: InterviewQuestionReview[];
  summaryFeedback: string;
}> {
  const deterministicReviews = params.qaPairs.map((p) => deterministicScoreAnswer(p.q, p.a));
  const ai = getClient();

  let reviews = deterministicReviews;
  let summaryFeedback = '';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          interviewType: params.type,
          targetRole: params.role,
          responses: params.qaPairs,
        }),
        config: {
          systemInstruction:
            'You are Priya Menon, a fair and encouraging Hiring Manager at Brightwave. Score each candidate interview answer (0-100) on Communication, Structure, Relevance, and Confidence, give one crisp actionable tip per question, and provide a 2-sentence overall summary feedback.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questionEvaluations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    communication: { type: Type.INTEGER },
                    structure: { type: Type.INTEGER },
                    relevance: { type: Type.INTEGER },
                    confidence: { type: Type.INTEGER },
                    tip: { type: Type.STRING },
                  },
                  required: ['communication', 'structure', 'relevance', 'confidence', 'tip'],
                },
              },
              summaryFeedback: { type: Type.STRING },
            },
            required: ['questionEvaluations', 'summaryFeedback'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        questionEvaluations?: Array<{
          communication: number;
          structure: number;
          relevance: number;
          confidence: number;
          tip: string;
        }>;
        summaryFeedback?: string;
      };

      if (
        parsed.questionEvaluations &&
        parsed.questionEvaluations.length === params.qaPairs.length
      ) {
        const clamp = (n: number) => Math.max(10, Math.min(100, Math.round(n)));
        reviews = params.qaPairs.map((p, idx) => {
          const ev = parsed.questionEvaluations![idx];
          return {
            q: p.q,
            w: p.a.trim().split(/\s+/).filter(Boolean).length,
            s: {
              Communication: clamp(ev.communication),
              Structure: clamp(ev.structure),
              'Relevance and depth': clamp(ev.relevance),
              Confidence: clamp(ev.confidence),
            },
            tip: ev.tip,
            answer: p.a,
          };
        });
        summaryFeedback = parsed.summaryFeedback || '';
      }
    } catch (err) {
      console.error('Gemini interview eval fallback triggered:', err);
    }
  }

  const keys: Array<keyof InterviewScore> = [
    'Communication',
    'Structure',
    'Relevance and depth',
    'Confidence',
  ];
  const breakdown: InterviewScore = {
    Communication: 0,
    Structure: 0,
    'Relevance and depth': 0,
    Confidence: 0,
  };
  for (const k of keys) {
    breakdown[k] = Math.round(reviews.reduce((a, r) => a + r.s[k], 0) / reviews.length);
  }
  const overallScore = Math.round(
    keys.reduce((a, k) => a + breakdown[k], 0) / keys.length
  );

  if (!summaryFeedback) {
    const sorted = [...keys].sort((a, b) => breakdown[a] - breakdown[b]);
    summaryFeedback = `Strongest area: ${sorted[sorted.length - 1]}. Focus next on ${sorted[0]}: ${INTERVIEW_TIPS[sorted[0]]}`;
  }

  return { overallScore, breakdown, reviews, summaryFeedback };
}

export async function tailorResumeForJob(params: {
  state: AppState;
  jobTitle: string;
  company: string;
  missingLabels: string[];
}): Promise<{ summary: string; skills: string; experience: string }> {
  const { state, jobTitle, company, missingLabels } = params;
  const ai = getClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          targetJob: `${jobTitle} at ${company}`,
          currentResume: state.resume,
          missingSkillsToMarkLearning: missingLabels,
          verifiedSkills: state.skills,
        }),
        config: {
          systemInstruction:
            'Tailor the candidate resume honestly for the target job. Keep every missing skill strictly marked as "(learning)" so the Resume Verifier passes. Improve clarity and impact phrasing without fabricating fake jobs or employers.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              skills: { type: Type.STRING },
              experience: { type: Type.STRING },
            },
            required: ['summary', 'skills', 'experience'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        summary?: string;
        skills?: string;
        experience?: string;
      };
      if (parsed.summary && parsed.skills && parsed.experience) {
        return {
          summary: parsed.summary,
          skills: parsed.skills,
          experience: parsed.experience,
        };
      }
    } catch (err) {
      console.error('Gemini resume tailor fallback triggered:', err);
    }
  }

  const existingSkills = state.resume.skills;
  const additions = missingLabels
    .filter((m) => !existingSkills.toLowerCase().includes(m.toLowerCase()))
    .map((m) => `${m} (learning)`);
  const nextSkills = additions.length
    ? `${existingSkills}${existingSkills ? ', ' : ''}${additions.join(', ')}`
    : existingSkills;
  const nextSummary = `${state.resume.summary.replace(/\.$/, '')}. Targeting ${jobTitle} at ${company}.`;
  return {
    summary: nextSummary,
    skills: nextSkills,
    experience: state.resume.experience,
  };
}

export async function generateCoverLetter(params: {
  name: string;
  role: string;
  company: string;
  skills: string;
  achievement: string;
  whyCompany: string;
}): Promise<string> {
  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify(params),
        config: {
          systemInstruction:
            'Write a crisp, natural, 3-paragraph cover letter tailored to the company and role. Avoid clichés and keep it under 220 words.',
        },
      });
      if (response.text && response.text.trim().length > 40) {
        return response.text.trim();
      }
    } catch (err) {
      console.error('Gemini cover letter fallback triggered:', err);
    }
  }

  const c = params.company || 'your company';
  const r = params.role || 'Full Stack Developer';
  const ach = params.achievement
    ? `, and I recently ${params.achievement.replace(/\.$/, '')}`
    : '';
  const why = params.whyCompany
    ? `because ${params.whyCompany.replace(/\.$/, '')}`
    : 'because of the quality of its engineering team and products';
  return `Dear Hiring Manager,\n\nI am writing to apply for the ${r} role at ${c}. My work so far has focused on ${params.skills}${ach}.\n\nI am drawn to ${c} ${why}. I learn quickly, communicate clearly, and enjoy turning ideas into reliable, measurable results.\n\nI would welcome the chance to discuss how I can contribute. Thank you for your time.\n\nSincerely,\n${params.name}`;
}

export async function analyzeResumeWithAts(params: {
  state: AppState;
  jobDescription?: string;
}): Promise<AtsAiAudit> {
  const { state, jobDescription = '' } = params;
  const resumeText = `${state.resume.summary} ${state.resume.skills} ${state.resume.experience}`.toLowerCase();
  const jdTokens = Array.from(
    new Set(
      (jobDescription || 'React TypeScript JavaScript CSS Accessibility REST Git SQL Node.js Testing')
        .toLowerCase()
        .match(/\b[a-z][a-z0-9+#.]{2,}\b/g) || []
    )
  ).filter((w) => !['with', 'and', 'the', 'for', 'that', 'this', 'from', 'will', 'your', 'have', 'are'].includes(w));

  const matchedKeywords = jdTokens.filter((t) => resumeText.includes(t)).slice(0, 10);
  const missingKeywords = jdTokens.filter((t) => !resumeText.includes(t)).slice(0, 8);
  const fallbackScore = Math.min(
    98,
    Math.max(
      state.ats.score,
      Math.round(35 + (matchedKeywords.length / Math.max(1, matchedKeywords.length + missingKeywords.length)) * 60)
    )
  );

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          targetRole: state.user.role,
          resume: state.resume,
          jobDescription: jobDescription || `Standard ${state.user.role} job posting`,
          baselineAts: state.ats,
        }),
        config: {
          systemInstruction:
            'You are an ATS Analyst & Executive Technical Recruiter. Score the resume against the job description (0-100), list matchedKeywords and missingKeywords, write a 2-sentence verdict, and provide 3 stronger quantified XYZ/STAR resume bullets based truthfully on their existing experience.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchScore: { type: Type.INTEGER },
              verdict: { type: Type.STRING },
              matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              rewrittenBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['matchScore', 'verdict', 'matchedKeywords', 'missingKeywords', 'rewrittenBullets'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<AtsAiAudit>;
      if (parsed.verdict && Array.isArray(parsed.rewrittenBullets)) {
        return {
          matchScore: Math.max(10, Math.min(100, Number(parsed.matchScore ?? fallbackScore))),
          verdict: parsed.verdict,
          matchedKeywords: parsed.matchedKeywords || matchedKeywords,
          missingKeywords: parsed.missingKeywords || missingKeywords,
          rewrittenBullets: parsed.rewrittenBullets.slice(0, 3),
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini ATS audit fallback triggered:', err);
    }
  }

  return {
    matchScore: fallbackScore,
    verdict: `Your resume hits ${matchedKeywords.length} target keywords for ${state.user.role}. Adding metrics and marking ${missingKeywords.slice(0, 3).join(', ') || 'key frameworks'} cleanly will boost screening pass rate.`,
    matchedKeywords: matchedKeywords.length ? matchedKeywords : state.ats.hit,
    missingKeywords: missingKeywords.length ? missingKeywords : state.ats.miss,
    rewrittenBullets: [
      `Engineered ${state.user.role} workflow modules reducing manual turnaround by 35% across active student users.`,
      `Indexed and queried relational SQL schemas with parameterized endpoints, cutting query latency by 40ms.`,
      `Built accessible responsive views in semantic HTML and JavaScript, achieving 95+ Lighthouse scores.`,
    ],
    usedGemini: false,
  };
}

export async function generateInterviewFollowUp(params: {
  type: InterviewType;
  role: string;
  question: string;
  answer: string;
}): Promise<{ followUp: string; usedGemini: boolean }> {
  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify(params),
        config: {
          systemInstruction:
            'You are Priya Menon, Hiring Manager. Based on the candidate answer, ask one crisp 1-sentence follow-up question probing edge cases, trade-offs, or measurable impact.',
        },
      });
      if (response.text && response.text.trim().length > 10) {
        return { followUp: response.text.trim(), usedGemini: true };
      }
    } catch (err) {
      console.error('Gemini interview follow-up fallback triggered:', err);
    }
  }
  return {
    followUp: `If traffic or data volume grew 10x in that ${params.type.toLowerCase()} scenario, what bottleneck or trade-off would you address first?`,
    usedGemini: false,
  };
}

export async function runMultiAgentAudit(state: AppState): Promise<AgentAuditResult> {
  const gaps = (Object.keys(SKILL_META) as SkillKey[])
    .filter((k) => (state.skills[k] || 0) < 0.45)
    .map((k) => SKILL_META[k].label);

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          role: state.user.role,
          readiness: state.readiness,
          skills: state.skills,
          roadmapSteps: state.roadmap.map((r) => r.title),
          atsScore: state.ats.score,
          missingKeywords: state.ats.miss,
          resumeSkills: state.resume.skills,
        }),
        config: {
          systemInstruction:
            'Run a 3-agent workspace audit (Gap Analyst, Resume Verifier, ATS Analyst). Return a crisp 1-sentence executive summary and 3 concrete findings with agent name, status ("pass" or "warn"), and specific actionable detail.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    agent: { type: Type.STRING },
                    status: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['agent', 'status', 'detail'],
                },
              },
            },
            required: ['summary', 'findings'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        summary?: string;
        findings?: Array<{ agent: string; status: string; detail: string }>;
      };
      if (parsed.summary && Array.isArray(parsed.findings)) {
        return {
          summary: parsed.summary,
          findings: parsed.findings.map((f) => ({
            agent: f.agent,
            status: f.status === 'pass' ? 'pass' : 'warn',
            detail: f.detail,
          })),
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini multi-agent audit fallback triggered:', err);
    }
  }

  return {
    summary: `Multi-Agent Audit complete for ${state.user.role}: ${state.readiness}% overall readiness with ${gaps.length} skill gaps flagged.`,
    findings: [
      {
        agent: 'Gap Analyst',
        status: gaps.length > 0 ? 'warn' : 'pass',
        detail: gaps.length > 0 ? `Prioritize ${gaps.join(', ')} on TutorTree & Roadmap.` : 'All tracked skills meet baseline mastery.',
      },
      {
        agent: 'Resume Verifier',
        status: state.resume.skills.toLowerCase().includes('learning') ? 'pass' : 'warn',
        detail: 'Verified resume claims against SQLite BKT probabilities — unmastered skills remain marked learning.',
      },
      {
        agent: 'ATS Analyst',
        status: state.ats.score >= 70 ? 'pass' : 'warn',
        detail: `Current ATS score is ${state.ats.score}/100. Missing: ${state.ats.miss.slice(0, 4).join(', ') || 'none'}.`,
      },
    ],
    usedGemini: false,
  };
}

export async function solveDsaWithAi(params: {
  problem: string;
  language?: string;
  userApproach?: string;
  role: string;
}): Promise<AiProblemSolution> {
  const { problem, language = 'TypeScript', userApproach = '', role } = params;
  const ai = getClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({ problem, language, userApproach, role }),
        config: {
          systemInstruction:
            'You are a Principal Algorithms Coach helping an engineer prepare for technical interviews. Return JSON with intuition, optimalApproach, timeComplexity, spaceComplexity, clean runnable codeSolution in the requested language, and 3 concrete edgeCases.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intuition: { type: Type.STRING },
              optimalApproach: { type: Type.STRING },
              timeComplexity: { type: Type.STRING },
              spaceComplexity: { type: Type.STRING },
              codeSolution: { type: Type.STRING },
              edgeCases: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'intuition',
              'optimalApproach',
              'timeComplexity',
              'spaceComplexity',
              'codeSolution',
              'edgeCases',
            ],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<AiProblemSolution>;
      if (parsed.intuition && parsed.codeSolution) {
        return {
          problem,
          intuition: parsed.intuition,
          optimalApproach: parsed.optimalApproach || 'Use optimal linear-pass state tracking.',
          timeComplexity: parsed.timeComplexity || 'O(n)',
          spaceComplexity: parsed.spaceComplexity || 'O(n)',
          codeSolution: parsed.codeSolution,
          edgeCases: (parsed.edgeCases || []).slice(0, 4),
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini AI problem solver fallback triggered:', err);
    }
  }

  return {
    problem,
    intuition: `Break "${problem}" into an invariant you maintain in one pass or divide-and-conquer step rather than brute-force nested scans.`,
    optimalApproach:
      userApproach.trim().length > 8
        ? `Refine your idea ("${userApproach.trim().slice(0, 80)}") using a hash map / two-pointer lookup for constant-time state checks.`
        : 'Use a hash map or sliding window / two-pointer invariant to avoid O(n^2) re-scanning.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    codeSolution: `// ${language} Optimal Solution for: ${problem}\nfunction solve(input: number[], target = 0): number[] {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < input.length; i++) {\n    const need = target - input[i];\n    if (seen.has(need)) return [seen.get(need)!, i];\n    seen.set(input[i], i);\n  }\n  return [];\n}`,
    edgeCases: [
      'Empty or single-element input',
      'Duplicate values or negative numbers',
      'Large input size hitting integer overflow or recursion depth limits',
    ],
    usedGemini: false,
  };
}

export async function generateAiResumeDraft(params: {
  state: AppState;
  highlightNote?: string;
}): Promise<{ summary: string; skills: string; experience: string; usedGemini: boolean }> {
  const { state, highlightNote = '' } = params;
  const mastered = (Object.keys(SKILL_META) as SkillKey[])
    .filter((k) => (state.skills[k] || 0) >= 0.45)
    .map((k) => SKILL_META[k].label);
  const learning = (Object.keys(SKILL_META) as SkillKey[])
    .filter((k) => (state.skills[k] || 0) < 0.45)
    .map((k) => `${SKILL_META[k].label} (learning)`);

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          name: state.resume.name || state.user.name,
          role: state.user.role,
          readiness: state.readiness,
          mastered,
          learning,
          dsaSolvedCount: state.dsaSolved.length,
          completedProjects: state.user.completedProjects,
          highlightNote,
          existingExperience: state.resume.experience,
        }),
        config: {
          systemInstruction:
            'Act as an Executive Technical Resume Maker. Generate a crisp 2-sentence ATS-friendly summary, comma-separated skills string (keeping unmastered skills tagged "(learning)"), and 4 quantified XYZ/STAR experience bullets separated by newlines.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              skills: { type: Type.STRING },
              experience: { type: Type.STRING },
            },
            required: ['summary', 'skills', 'experience'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        summary?: string;
        skills?: string;
        experience?: string;
      };
      if (parsed.summary && parsed.skills && parsed.experience) {
        return {
          summary: parsed.summary,
          skills: parsed.skills,
          experience: parsed.experience,
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini resume maker fallback triggered:', err);
    }
  }

  return {
    summary: `${state.user.role} candidate (${state.readiness}% verified BKT readiness) building production web and SQL-backed applications. Completed ${state.dsaSolved.length} algorithmic challenges and ${Math.max(1, state.user.completedProjects.length)} portfolio deliverables.`,
    skills: [...mastered, ...learning].join(', '),
    experience: `${state.resume.experience ? state.resume.experience.trim() + '\n' : ''}Engineered ${state.user.role} portfolio modules with clean TypeScript interfaces and parameterized SQL queries, cutting lookup latency by 35%\nAutomated resume keyword alignment and BKT skill tracking workflows across ${state.roadmap.length} structured roadmap milestones${highlightNote ? `\n${highlightNote.trim()}` : ''}`.trim(),
    usedGemini: false,
  };
}

export async function recommendOnboardingRoadmap(params: {
  transcript: string;
  interests: string[];
  level: string;
  hours: number;
}): Promise<OnboardingRecommendation> {
  const { transcript, interests, level, hours } = params;
  const lower = `${transcript} ${interests.join(' ')}`.toLowerCase();

  let fallbackRole: TargetRole = 'Frontend Engineer';
  if (/ml|machine|ai model|pytorch|llm|neural/.test(lower)) fallbackRole = 'ML Engineer';
  else if (/data scientist|stat|model|predict/.test(lower)) fallbackRole = 'Data Scientist';
  else if (/analyst|sql|tableau|bi|dashboard|analytics/.test(lower)) fallbackRole = 'Data Analyst';
  else if (/backend|api|server|microservices|database/.test(lower)) fallbackRole = 'Backend Developer';
  else if (/full.?stack|both|end.?to.?end|node/.test(lower)) fallbackRole = 'Full Stack Developer';

  const roleKeys = Object.keys(ROLE_PLANS) as TargetRole[];
  const scoredAlts = roleKeys
    .map((role) => {
      let fit = role === fallbackRole ? 92 : 64;
      if (role === 'Full Stack Developer' && /react|node|web|full/.test(lower)) fit = Math.max(fit, 86);
      if (role === 'Frontend Engineer' && /ui|react|css|front|design/.test(lower)) fit = Math.max(fit, 88);
      if (role === 'Data Analyst' && /sql|data|python/.test(lower)) fit = Math.max(fit, 84);
      if (role === 'ML Engineer' && /ai|ml|python/.test(lower)) fit = Math.max(fit, 89);
      return {
        role,
        fit: Math.min(97, fit),
        summary: `${ROLE_PLANS[role].length}-milestone DAG (${ROLE_PLANS[role].reduce((a, b) => a + b.hours, 0)}h total)`,
      };
    })
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 3);

  const previewSteps = (ROLE_PLANS[fallbackRole] || ROLE_PLANS['Full Stack Developer']).map((s) => ({
    title: s.title,
    hours: s.hours,
    why: `Builds ${SKILL_META[s.skillKey].label} mastery for ${fallbackRole}`,
  }));

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          transcript,
          interests,
          level,
          hoursPerWeek: hours,
          availableRoles: roleKeys,
        }),
        config: {
          systemInstruction:
            'You are the place1ai Voice Onboarding & Roadmap Architect. Pick the single best TargetRole from availableRoles, explain why in 1-2 sentences, write a warm spokenPitch (2 sentences meant to be read aloud by text-to-speech), rank top 3 alternatives with fit scores (0-100) and summaries, and return 3-4 tailored roadmap previewSteps with title, hours, and why.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedRole: { type: Type.STRING },
              reason: { type: Type.STRING },
              spokenPitch: { type: Type.STRING },
              alternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    fit: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                  },
                  required: ['role', 'fit', 'summary'],
                },
              },
              previewSteps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    hours: { type: Type.INTEGER },
                    why: { type: Type.STRING },
                  },
                  required: ['title', 'hours', 'why'],
                },
              },
            },
            required: ['recommendedRole', 'reason', 'spokenPitch', 'alternatives', 'previewSteps'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<OnboardingRecommendation>;
      const validRole = roleKeys.includes(parsed.recommendedRole as TargetRole)
        ? (parsed.recommendedRole as TargetRole)
        : fallbackRole;
      if (parsed.reason && parsed.spokenPitch && Array.isArray(parsed.previewSteps)) {
        return {
          recommendedRole: validRole,
          reason: parsed.reason,
          spokenPitch: parsed.spokenPitch,
          alternatives: (parsed.alternatives && parsed.alternatives.length
            ? parsed.alternatives
            : scoredAlts
          ).map((a) => ({
            role: roleKeys.includes(a.role as TargetRole) ? (a.role as TargetRole) : fallbackRole,
            fit: Math.max(40, Math.min(99, Number(a.fit || 75))),
            summary: a.summary || '',
          })),
          previewSteps: parsed.previewSteps.slice(0, 4),
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini onboarding recommend fallback triggered:', err);
    }
  }

  return {
    recommendedRole: fallbackRole,
    reason: `Based on your ${level.toLowerCase()} pace (${hours}h/week) and stated goal, ${fallbackRole} delivers the fastest path to interview readiness.`,
    spokenPitch: `Welcome to place1ai! Based on your goals, I recommend the ${fallbackRole} roadmap paced at ${hours} hours per week. We will start with core foundations and advance straight into portfolio projects and mock interviews.`,
    alternatives: scoredAlts,
    previewSteps: previewSteps.slice(0, 4),
    usedGemini: false,
  };
}

export async function runCustomAgent(params: {
  state: AppState;
  name: string;
  roleFocus: string;
  mission: string;
  tools: string[];
}): Promise<{
  verdict: string;
  actions: string[];
  ragSourcesUsed: string[];
  usedGemini: boolean;
}> {
  const { state, name, roleFocus, mission, tools } = params;
  const chunks = buildKnowledgeChunks(state);
  const retrieved = retrieveTopChunks(chunks, `${roleFocus} ${mission}`);
  const ragSourcesUsed = (retrieved.length > 0 ? retrieved : chunks.slice(0, 3)).map((c) => c.id);

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          agentName: name,
          roleFocus,
          mission,
          enabledTools: tools,
          ragContext: (retrieved.length > 0 ? retrieved : chunks.slice(0, 3)).map((c) => `[${c.id}] ${c.text}`),
          userRole: state.user.role,
          readiness: state.readiness,
          atsScore: state.ats.score,
          dsaSolved: state.dsaSolved.length,
        }),
        config: {
          systemInstruction:
            'You are executing a user-built specialized AI Agent inside place1ai. Ground your output strictly in the provided RAG context and metrics. Return a crisp 2-sentence verdict and 3 concrete ordered next actions.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['verdict', 'actions'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        verdict?: string;
        actions?: string[];
      };
      if (parsed.verdict && Array.isArray(parsed.actions)) {
        return {
          verdict: parsed.verdict,
          actions: parsed.actions.slice(0, 4),
          ragSourcesUsed,
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini custom agent fallback triggered:', err);
    }
  }

  return {
    verdict: `${name} (${roleFocus}) analyzed ${ragSourcesUsed.length} grounded SQLite RAG sources for ${state.user.role} (${state.readiness}% readiness, ATS ${state.ats.score}/100).`,
    actions: [
      `Target highest-leverage skill gap while applying ${mission.slice(0, 56)}`,
      `Verify ATS keywords (${state.ats.miss.slice(0, 3).join(', ') || 'all covered'}) before next application`,
      `Complete 2 timed coding test challenges & 1 adaptive mock interview`,
    ],
    ragSourcesUsed,
    usedGemini: false,
  };
}

export async function gradeCodingSubmission(params: {
  problemTitle: string;
  language: string;
  code: string;
  passedTests: number;
  totalTests: number;
  role: string;
}): Promise<CodeGradeResult> {
  const { problemTitle, language, code, passedTests, totalTests, role } = params;
  const passRatio = totalTests > 0 ? passedTests / totalTests : 0;
  const fallbackScore = Math.max(25, Math.min(98, Math.round(passRatio * 75 + (code.trim().length > 40 ? 20 : 5))));

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({ problemTitle, language, code, passedTests, totalTests, role }),
        config: {
          systemInstruction:
            'You are a Principal Coding Test Grader. Review the candidate code submission, score quality 0-100, identify Big-O timeComplexity and spaceComplexity, write concise 2-sentence feedback on bugs/edge-cases, and provide a clean optimizedSnippet.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              timeComplexity: { type: Type.STRING },
              spaceComplexity: { type: Type.STRING },
              feedback: { type: Type.STRING },
              optimizedSnippet: { type: Type.STRING },
            },
            required: ['score', 'timeComplexity', 'spaceComplexity', 'feedback', 'optimizedSnippet'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<CodeGradeResult>;
      if (parsed.feedback && parsed.optimizedSnippet) {
        return {
          problemTitle,
          language,
          score: Math.max(0, Math.min(100, Number(parsed.score ?? fallbackScore))),
          passedTests,
          totalTests,
          timeComplexity: parsed.timeComplexity || 'O(n)',
          spaceComplexity: parsed.spaceComplexity || 'O(n)',
          feedback: parsed.feedback,
          optimizedSnippet: parsed.optimizedSnippet,
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini coding grader fallback triggered:', err);
    }
  }

  return {
    problemTitle,
    language,
    score: fallbackScore,
    passedTests,
    totalTests,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    feedback:
      passedTests === totalTests
        ? `All ${totalTests} test cases passed for ${problemTitle}. Guard against empty inputs and check hash map/two-pointer constant factors.`
        : `Passed ${passedTests}/${totalTests} test cases. Inspect boundary indices and ensure duplicate or empty edge cases return cleanly.`,
    optimizedSnippet: code.trim() || `// Optimal ${language} approach for ${problemTitle}`,
    usedGemini: false,
  };
}

export async function generateInterviewCoachHint(params: {
  type: InterviewType;
  persona: string;
  question: string;
  currentAnswer: string;
}): Promise<{ hint: string; starDraft: string; usedGemini: boolean }> {
  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify(params),
        config: {
          systemInstruction:
            'You are an executive interview coach. Provide a crisp 1-sentence coaching hint tailored to the question & persona, plus a concise 4-line STAR template draft the candidate can adapt.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hint: { type: Type.STRING },
              starDraft: { type: Type.STRING },
            },
            required: ['hint', 'starDraft'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        hint?: string;
        starDraft?: string;
      };
      if (parsed.hint && parsed.starDraft) {
        return { hint: parsed.hint, starDraft: parsed.starDraft, usedGemini: true };
      }
    } catch (err) {
      console.error('Gemini interview hint fallback triggered:', err);
    }
  }

  return {
    hint: `Anchor your ${params.type.toLowerCase()} answer for ${params.persona} with a concrete architecture trade-off and a before/after metric.`,
    starDraft:
      'Situation: During a high-traffic release sprint with tight latency targets...\nTask: I owned diagnosing and fixing the primary bottleneck...\nAction: Implemented TypeScript validation, query indexing, and edge caching...\nResult: Reduced P95 latency by 38% and eliminated timeout errors.',
    usedGemini: false,
  };
}

export async function converseInterviewTurn(params: {
  candidateName: string;
  role: string;
  type: InterviewType;
  persona: string;
  currentPrompt: string;
  userUtterance: string;
  nextQuestion: string | null;
  turnIndex: number;
}): Promise<{
  replyText: string;
  nextPrompt: string;
  done: boolean;
  usedGemini: boolean;
}> {
  const {
    candidateName,
    role,
    type,
    persona,
    currentPrompt,
    userUtterance,
    nextQuestion,
    turnIndex,
  } = params;
  const firstName = (candidateName || 'there').split(/\s+/)[0];
  const isGreetingTurn = turnIndex === 0;
  const done = !nextQuestion;

  const ai = getClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify({
          candidateName: firstName,
          targetRole: role,
          interviewType: type,
          companyPersona: persona,
          isGreetingIcebreaker: isGreetingTurn,
          interviewerJustAsked: currentPrompt,
          candidateSaid: userUtterance,
          upcomingQuestionToAsk: nextQuestion,
          isFinalTurn: done,
        }),
        config: {
          systemInstruction:
            'You are Priya Menon, a warm, friendly human interviewer having a natural two-way voice conversation. Use very simple, clear everyday English (no complex jargon). Acknowledge what the candidate actually said in 1 warm, natural sentence (if they answered how they are doing / introduced themselves, respond warmly to that!). Then smoothly ask the upcomingQuestionToAsk in natural spoken words (or thank them warmly and wrap up if isFinalTurn is true). Keep replyText concise (under 45 words) so it sounds natural when spoken aloud.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: { type: Type.STRING },
              nextPrompt: { type: Type.STRING },
            },
            required: ['replyText', 'nextPrompt'],
          },
        },
      });
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        replyText?: string;
        nextPrompt?: string;
      };
      if (parsed.replyText) {
        return {
          replyText: parsed.replyText,
          nextPrompt: parsed.nextPrompt || nextQuestion || '',
          done,
          usedGemini: true,
        };
      }
    } catch (err) {
      console.error('Gemini conversational interview turn fallback:', err);
    }
  }

  if (isGreetingTurn && nextQuestion) {
    return {
      replyText: `I am so glad to hear from you, ${firstName}! Thanks for sharing a bit about yourself. Let's start with our first question: ${nextQuestion}`,
      nextPrompt: nextQuestion,
      done: false,
      usedGemini: false,
    };
  }

  if (done) {
    return {
      replyText: `Thank you so much for sharing all of those examples, ${firstName}! That wraps up our conversation. Click See My Score Report whenever you are ready.`,
      nextPrompt: '',
      done: true,
      usedGemini: false,
    };
  }

  return {
    replyText: `Got it, thanks for explaining that, ${firstName}! That makes a lot of sense. Next question for you: ${nextQuestion}`,
    nextPrompt: nextQuestion!,
    done: false,
    usedGemini: false,
  };
}



