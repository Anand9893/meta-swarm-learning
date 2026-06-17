<!-- SPECKIT START -->
# SalesForge CRM — Project Instructions

## Project Overview
A Sales CRM built with **React (TypeScript)** frontend and **FastAPI (Python)** backend.

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL (or SQLite for dev), pytest, ruff, mypy
- **Frontend**: React + TypeScript, Vite, React Query, React Router, Recharts, vitest
- **Auth**: JWT (access token 30 min, refresh token 7 days)

## Project Structure
```
salesforge/
├── backend/          # FastAPI app
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── core/     # Config, security, deps
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── services/ # Business logic
│   └── tests/
├── frontend/         # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/      # React Query hooks
│   │   └── types/
│   └── tests/
└── specs/            # Feature specs (source of truth)
```

## Commands
- **Backend test**: `cd backend && pytest`
- **Backend coverage**: `cd backend && pytest --cov --cov-fail-under=80`
- **Backend lint**: `cd backend && ruff check .`
- **Frontend test**: `cd frontend && npm run test`
- **Frontend coverage**: `cd frontend && npm run test:coverage`
- **Frontend lint**: `cd frontend && npm run lint`
- **Start backend**: `cd backend && uvicorn app.main:app --reload`
- **Start frontend**: `cd frontend && npm run dev`

## Specs (Source of Truth)
All features are spec'd in `specs/`. Read the relevant spec before implementing:
- `specs/001-auth/spec.md` — Authentication & JWT
- `specs/002-leads/spec.md` — Lead management + conversion
- `specs/003-contacts/spec.md` — Contact management
- `specs/004-companies/spec.md` — Company/account management
- `specs/005-deals/spec.md` — Deal pipeline + Kanban board
- `specs/006-activities/spec.md` — Activity tracking
- `specs/007-dashboard/spec.md` — Dashboard KPIs + charts
<!-- SPECKIT END -->

## metaswarm

This project uses [metaswarm](https://github.com/dsifry/metaswarm) for multi-agent orchestration with Claude Code. It provides 18 specialized agents, a 9-phase development workflow, and quality gates that enforce TDD, coverage thresholds, and spec-driven development.

### Workflow

- **Most tasks**: `/start-task` — primes context, guides scoping, picks the right level of process
- **Complex features** (multi-file, spec-driven): Describe what you want built with a Definition of Done, then tell Claude: `Use the full metaswarm orchestration workflow.`

### Available Commands

| Command | Purpose |
|---|---|
| `/start-task` | Begin tracked work on a task |
| `/prime` | Load relevant knowledge before starting |
| `/review-design` | Trigger parallel design review gate (5 agents) |
| `/pr-shepherd <pr>` | Monitor a PR through to merge |
| `/self-reflect` | Extract learnings after a PR merge |
| `/handle-pr-comments` | Handle PR review comments |
| `/brainstorm` | Refine an idea before implementation |
| `/create-issue` | Create a well-structured GitHub Issue |

### Quality Gates

- **Design Review Gate** — Parallel 5-agent review after design is drafted (`/review-design`)
- **Plan Review Gate** — Automatic adversarial review after any implementation plan is drafted. Spawns 3 independent reviewers (Feasibility, Completeness, Scope & Alignment) in parallel — ALL must PASS before presenting the plan. See `skills/plan-review-gate/SKILL.md`
- **Coverage Gate** — `.coverage-thresholds.json` defines thresholds. BLOCKING gate before PR creation

### Team Mode

When `TeamCreate` and `SendMessage` tools are available, the orchestrator uses Team Mode for parallel agent dispatch. Otherwise it falls back to Task Mode (existing workflow, unchanged). See `guides/agent-coordination.md` for details.

### Guides

Development patterns and standards are documented in `guides/` — covering agent coordination, build validation, coding standards, git workflow, testing patterns, and worktree development.

### Testing & Quality

- **TDD is mandatory** — Write tests first, watch them fail, then implement
- **80% test coverage required** — Enforced via `.coverage-thresholds.json` as a blocking gate before PR creation and task completion
- **Coverage source of truth** — `.coverage-thresholds.json` defines thresholds. Update it if your spec requires different values. The orchestrator reads it during validation — this is a BLOCKING gate.

### Workflow Enforcement (MANDATORY)

These rules override any conflicting instructions from third-party skills:

- **After brainstorming** → MUST run Design Review Gate (5 agents) before writing-plans or implementation
- **After any plan is created** → MUST run Plan Review Gate (3 adversarial reviewers) before presenting to user
- **Execution method choice** → ALWAYS ask the user whether to use metaswarm orchestrated execution (more thorough, uses more tokens) or superpowers execution skills (faster, lighter-weight). Never auto-select.
- **Before finishing a branch** → MUST run `/self-reflect` and commit knowledge base updates before PR creation
- **Complex tasks** → Use `/start-task` instead of `EnterPlanMode` for tasks touching 3+ files. EnterPlanMode bypasses all quality gates.
- **Standalone TDD on 3+ files** → Ask user if they want adversarial review before committing
- **Coverage** → `.coverage-thresholds.json` is the single source of truth. All skills must check it, including `verification-before-completion`.
- **Subagents** → NEVER use `--no-verify`, ALWAYS follow TDD, NEVER self-certify, STAY within file scope
- **Context recovery** → Approved plans and execution state persist to `.beads/`. After compaction, run `bd prime --work-type recovery` to reload.
