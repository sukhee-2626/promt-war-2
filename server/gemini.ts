import { GoogleGenAI, Type } from '@google/genai';
import { INTERVIEW_TIPS, SKILL_META } from './data.ts';
import type {
  AppState,
  InterviewQuestionReview,
  InterviewScore,
  InterviewType,
  SkillKey,
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

function buildKnowledgeChunks(state: AppState): Array<{ id: string; text: string }> {
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
  ];
}

function retrieveTopChunks(
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
