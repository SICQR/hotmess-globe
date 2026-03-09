# HOTMESS Audit Swarm — 2026-03-09

Each agent gets its own file. Agents read AUDIT_STATE.md for global state, write results to their own file, then update AUDIT_STATE.md when done.

## Agent Files
- `agent-a.md` — Intention bar + Notifications + Profile completion (#4, #7, #12)
- `agent-b.md` — Radio + Pulse FEED button (#8, #2)
- `agent-c.md` — Market + Beacon FAB (#10, #11)
- `agent-d.md` — Chat flow + Profile mode code audit (#5, #6)
- `agent-e.md` — SOS system (#9)

## Coordination Rules
1. Read `AUDIT_STATE.md` first
2. Write your findings to YOUR agent file
3. Commit any fixes
4. Update `AUDIT_STATE.md` (move bug from open to fixed)
