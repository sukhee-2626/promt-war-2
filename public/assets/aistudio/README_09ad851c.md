# SkillForge

> AI-powered personalized learning platform with Skill Digital Twins, Bayesian Knowledge Tracing, and multi-agent roadmap planning.

## 🏆 Differentiators

| Feature | What it does |
|---|---|
| **Skill Graph** | Skills as nodes with prerequisite edges. Roadmap = shortest path. |
| **Mastery as probability** | Bayesian KT updates mastery after every quiz. No checkboxes. |
| **Agent Debate** | Planner proposes → Critic attacks → revised plan shown. |
| **Career Pivot Diff** | Switch goals, see what transfers/wastes/is-new instantly. |

## 🏗️ Architecture

```
Event → Orchestrator (LangGraph) → Evaluator (BKT) → Gap Analyst
      → Planner ⇄ Critic (max 2 rounds) → Resource Curator (RAG)
      → save roadmap → Mentor explains
```

## 📦 Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI + SQLModel + SQLite |
| Graph | NetworkX DiGraph |
| Vector DB | ChromaDB + bge-small-en-v1.5 |
| Agents | LangGraph |
| LLM | Ollama llama3.1:8b (or Groq via env) |
| Frontend | Next.js 14 + Tailwind + Recharts |

## 🚀 Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set LLM_PROVIDER=groq and GROQ_API_KEY=... for quick start
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Ingest resources into ChromaDB (once):
```bash
python -m app.rag.ingest
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Demo Seed

```bash
python backend/seed_demo.py
# Prints user ID and all demo URLs
```

## 📚 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /profile | Create profile + run Profiler Agent |
| GET | /profile/{id} | Get profile + skills |
| GET | /profile/{id}/skill-analysis | Radar chart + node colors |
| GET | /match/{id}?role= | Career match % + ranked gaps |
| GET | /roadmap/{id} | Build + return roadmap |
| GET | /assess/{id}/{skill} | Generate quiz |
| POST | /assess/{id}/{skill} | Submit answers + BKT update |
| POST | /events/{id} | Trigger replanning event |
| GET | /events/{id}/logs | Agent activity logs |
| POST | /mentor/{id} | Mentor chat |
| GET | /mentor/{id}/debate/{roadmap_id} | Planner⇄Critic debate transcript |
| POST | /pivot/{id} | Career pivot diff + new roadmap |

## 🧪 Run Tests

```bash
cd backend
pytest tests/test_graph.py -v
```

## 🎬 Demo Script (5 min)

1. **Onboarding**: Enter "Alex" — knows Python, SQL, HTML → target Full Stack
2. **Skill Twin**: Show radar chart with 3 skills detected, rest grey
3. **Career Match**: 35% match, top gaps: JavaScript, React, Node.js
4. **Roadmap**: Timeline shows JS → React → Node.js order
5. **Assessment**: Take JS quiz → score low → "remedial" action
6. **Replanning**: POST `/events/{id}` with `assessment_failed` → new roadmap v2 with remedial JS node
7. **Agent Debate**: Show Planner vs Critic transcript
8. **Career Pivot**: Switch to Data Analyst → 70% transfers, hours saved shown

## 📂 Key Files

```
backend/app/agents/     — 8 agents (profiler, gap_analyst, planner, critic,
                          resource_curator, assessor, evaluator, mentor, orchestrator)
backend/app/api/        — 8 route handlers
backend/app/graph/      — NetworkX loader + path functions
backend/app/rag/        — ChromaDB ingestion
data/skills.json        — 90 skill nodes
data/skill_edges.json   — 88 prerequisite edges
data/roles.json         — 4 target roles
data/resources.json     — 120 real learning resources
docs/HISTORY.md         — Full build log (all phases)
docs/CONTEXT.md         — Always-current project summary
```

## 🔄 Multi-Tool Session Continuity

Paste at start of any new AI session:
```
Read: docs/PRD.md, docs/CONTEXT.md, last 3 entries of docs/HISTORY.md.
Do not redo finished work. Stack is LOCKED. Task: ...
```
