# HOTMESS Agent Swarm

This folder is the permanent coordination layer for all Claude agents working on this codebase.
Each agent — whether it's a one-off audit, a recurring task, or a specialist — gets its own file here.

## Convention

Each agent file is named `agent-[id].md` and contains:
- What the agent owns (bugs, features, tasks)
- Findings (what it discovered)
- Commits it made
- Final summary

The global audit state lives in `../AUDIT_STATE.md`.

---

## Active Agent Roster

### Audit Swarm — 2026-03-09

| File | Agent | Purpose | Status |
|------|-------|---------|--------|
| `agent-a.md` | Agent A | Intention bar · Notifications · Profile completion | ✅ DONE |
| `agent-b.md` | Agent B | Radio · Pulse FEED button | 🔄 RUNNING |
| `agent-c.md` | Agent C | Market · Beacon FAB | 🔄 RUNNING |
| `agent-d.md` | Agent D | Chat flow · Profile mode | 🔄 RUNNING |
| `agent-e.md` | Agent E | SOS system | 🔄 RUNNING |

---

## Future Agent Types (examples)

| Suggested file | Purpose |
|----------------|---------|
| `agent-rls-auditor.md` | Periodic RLS policy scan — run before each production deploy |
| `agent-brand-enforcer.md` | Scan for pink/XP/wrong bg colours in new PRs |
| `agent-perf-monitor.md` | Bundle size regression checks, sheet animation audit |
| `agent-content-moderation.md` | Sweep marketplace listings / right_now_status for TOS violations |
| `agent-push-infra.md` | VAPID key rotation, push subscription health |
| `agent-db-migration.md` | Pre-deploy migration dry-run + rollback plan |
| `agent-e2e-smoke.md` | Post-deploy smoke test runner results |

---

## How to Add a New Agent

1. Create `agent-[descriptive-name].md` in this folder
2. Give it clear owned tasks and files to check
3. Run it with full context pointing to this README and AUDIT_STATE.md
4. Agent writes findings back here, commits changes, updates AUDIT_STATE.md
