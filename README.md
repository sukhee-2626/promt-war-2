# place1ai — Autonomous AI Placement & Career Command Centre

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsukhee-2626%2Fpromt-war-2&env=GEMINI_API_KEY&project-name=place1ai&repository-name=promt-war-2)

**place1ai** is a full-stack, Apple Glass UI/UX placement readiness platform combining a **SQLite-backed Skill Twin**, **Built-in BM25/TF-IDF RAG**, a **6-Agent Career Orchestrator**, **Gemini ATS & XYZ Resume Rewriter**, **AI Problem Solver**, **Autonomous Batch Auto-Apply**, and **Live AI Mock Interviews** — packaged as a **1-click Vercel deployable** repository.

---

## Key Highlights

- **Above-the-Fold AI Command Deck**: Immediately opens into the 6 Flagship AI Glass Cards (`Built-in SQLite RAG`, `Multi-Agent Audit`, `AI Problem Solver`, `AI Resume Maker & ATS`, `Autonomous Auto-Apply`, `AI Mock Interview`), 12-workspace quick links, and 1-click practice drills (`AI Problem Solver`, `AI Resume Maker`, `2-Min BKT Quiz`, `1-Click Prompt Duel`, `60s Pitch Drill`, `AI Mock Interview`).
- **Built-in SQLite RAG + Custom Ingestion**: Indexes your Skill Twin profile, DSA progress, Projects, Applications, and custom pasted Job Descriptions or Study Notes (`POST /api/rag/ingest`) using BM25/TF-IDF chunk ranking with live citation inspection.
- **6-Agent Pipeline & Gemini Workspace Audit**: Orchestrates `Profiler -> Gap Analyst -> Planner <-> Critic -> Curator -> Resume Verifier -> Auto-Applier` plus a 1-click Gemini 3-Agent Audit (`POST /api/agents/audit`).
- **AI Problem Solver & Code Coach**: Generates intuition, optimal approach, Big-O time/space complexity, runnable multi-language code (`TypeScript`, `Python`, `JavaScript`, `C++`, `Java`), and edge cases (`POST /api/practice/solve`).
- **AI Resume Maker & Gemini ATS Studio**: Synthesizes a Skill Twin resume draft (`POST /api/resume/generate`), analyzes JD match + missing keywords, rewrites experience bullets in Google XYZ format (`POST /api/ats/analyze`), and supports 1-click `"Append to Resume"` and PDF print export.
- **Autonomous Batch Auto-Apply Agent**: Truthfully tailors your summary (preserving `(learning)` status for unverified skills), scores open roles, submits top-fit jobs directly into `tracker_entries` (`POST /api/jobs/auto-apply`), and awards XP.
- **AI Mock Interview**: Features company personas (`Brightwave Startup`, `FAANG Systems`, `Fintech Frontend`), live Gemini follow-up probes (`POST /api/interview/followup`), `"STAR Hint"` helper, camera/speech dictation, and 4-axis evaluation.
- **15-Second Interactive Fast Tour**: 7-step guided tour with `"Auto-Play (15s)"` timer highlighting every core workspace.

---

## System Architecture

```text
+-------------------------------------------------------------------+
|  Frontend (React 19 + TypeScript + Tailwind CSS v4 + Motion)      |
|  - Apple Glassmorphism UI (Light & Dark Themes)                   |
|  - Split Entry Showcase + Above-the-Fold Command Deck             |
|  - 12 Workspaces + 15s Fast Tour + Floating RAG Mentor            |
+---------------------------------+---------------------------------+
                                  | REST (/api/* + Bearer Session)
                                  v
+-------------------------------------------------------------------+
|  Shared Express API (/server/app.ts)                              |
|  - Local / Container: /server.ts (Vite Dev Middleware or dist/)   |
|  - Vercel Serverless: /api/index.ts (/vercel.json rewrites)       |
+---------------------------------+---------------------------------+
          |                       |                       |
          v                       v                       v
+-------------------+   +-------------------+   +-------------------+
| SQLite Engine     |   | Built-in RAG &    |   | Gemini AI Engine  |
| (/server/db.ts)   |   | BKT Mastery       |   | (/server/gemini)  |
| - Skill Twin      |   | - BM25/TF-IDF     |   | - @google/genai   |
| - XP Velocity     |   | - Custom JD Docs  |   | - 6-Agent Audit   |
| - Tracker / DSA   |   | - Mastery BKT     |   | - Deterministic   |
| (/tmp on Vercel)  |   |                   |   |   Fallbacks       |
+-------------------+   +-------------------+   +-------------------+
```

---

## 12 Integrated Workspaces

1. **Command Centre** — 6 Flagship AI Glass Cards, 12-workspace launcher, KPI telemetry, 7-Day XP Velocity, and Skill Twin map.
2. **Built-in SQLite RAG Hub** — Live BM25 chunk inspector, citation scoring, and custom Job Description / Study Notes ingestion.
3. **6-Agent Pipeline** — Multi-agent workflow graph, automated career audit, and verifiable guardrails.
4. **DSA Arena + AI Problem Solver** — 24+ curated problems, 1-click `"AI Solve"` assistant, Prompt Duel, and complexity breakdown.
5. **Core Concepts** — CS fundamentals & system design mastery modules with BKT calibration.
6. **Aptitude Lab & 2-Min Quiz** — Timed quantitative, logical, and verbal calibration drills.
7. **AI Mock Interview** — Company persona interviews, Gemini follow-up probes, STAR hints, and 4-axis grading.
8. **AI Resume Maker** — Skill Twin resume synthesis, live Markdown editor, and print-ready PDF export.
9. **Gemini ATS Studio** — Paste target JD for ATS match scoring, keyword gap analysis, and 1-click XYZ bullet rewrites.
10. **Autonomous Auto-Apply & Jobs** — Fit-scored job board with 1-click batch auto-apply and pipeline tracker.
11. **Daily Challenge & TutorTree** — Daily streak challenges, XP quest loops, and structured concept tree.
12. **My Progress Hub & Leaderboard** — Peer percentile tracking, cohort standings, and verified readiness scores.

---

## Core API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Server health and SQLite readiness probe |
| `/api/auth/login` | `POST` | Passwordless demo / user sign-in with session token |
| `/api/state` | `GET` | Hydrates full Skill Twin, XP velocity, tasks, RAG chunks, and tracker |
| `/api/rag/ingest` | `POST` | Ingest custom Job Descriptions or study notes into SQLite RAG |
| `/api/rag/ingest/:id` | `DELETE` | Remove a custom RAG document |
| `/api/rag/query` | `POST` | Run BM25/TF-IDF retrieval + grounded Gemini RAG response |
| `/api/practice/solve` | `POST` | AI Problem Solver returning intuition, code, and Big-O analysis |
| `/api/resume/generate` | `POST` | Generate tailored resume draft from live SQLite Skill Twin |
| `/api/ats/analyze` | `POST` | Gemini JD match audit + XYZ bullet rewrites |
| `/api/jobs/auto-apply` | `POST` | Autonomous batch tailoring and job tracker submission |
| `/api/interview/followup` | `POST` | Persona-aware live interview follow-up probe |
| `/api/agents/audit` | `POST` | 3-Agent workspace audit across Skill Twin, DSA, and Tracker |
| `/api/daily/submit` | `POST` | Complete daily challenge and record XP velocity event |

---

## Quick Start & 1-Click Deployment

### Option 1: 1-Click Deploy to Vercel

Click the **Deploy with Vercel** button at the top of this README, add `GEMINI_API_KEY` in the Vercel Environment Variables prompt, and deploy. `/vercel.json` automatically builds the React Vite frontend (`dist/`) and routes `/api/*` requests to `/api/index.ts`.

### Option 2: Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/sukhee-2626/promt-war-2.git
   cd promt-war-2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Set `GEMINI_API_KEY` in `.env` (get one from Google AI Studio). If omitted, deterministic built-in fallbacks remain active for offline/demo reliability.

4. **Start development server (Frontend + Express API on port 3000)**
   ```bash
   npm run dev
   ```

5. **Typecheck & Production Build**
   ```bash
   npm run lint
   npm run build
   npm start
   ```
