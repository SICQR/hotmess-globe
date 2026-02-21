# BACKEND_CONTRACT.md

> **Governance document. Do not delete. Do not speculate.**

---

## Purpose

This document is the authoritative contract between the Hotmess Globe frontend
and its Supabase backend. It defines exactly which tables, RPCs, and policies
the UI depends on at runtime — no more, no less.

**Rule: Backend serves UI. The UI defines what is needed. The backend provides it.**

---

## Mutation Rule

> The backend schema must change only in response to a verified UI call-site.

Before adding any table, column, RPC, or policy:

1. Identify the exact component / hook that calls it.
2. Verify the call is live in the main branch.
3. Write an idempotent `IF NOT EXISTS` migration.
4. Add RLS policies that cover all access patterns.

**Never add speculative schema. Never model assumptions.**

---

## Stability Law

> A migration that has been applied to production is immutable.

- Never `DROP` a production column without a deprecation window.
- Never rename a column in a running migration.
- Additive-only changes are safe. Destructive changes require a separate ticket.

---

## Legal Constraints

All tables storing personal data must:

- Include a `deleted_at TIMESTAMPTZ` column (soft-delete for GDPR erasure).
- Support the `delete_user_data(user_id UUID)` RPC for right-to-erasure.
- Apply RLS policies that restrict read/write to `auth.uid() = user_id`.

---

## Active Tables (UI Contract)

The following 6 tables are called by the frontend at runtime:

| Table | Owner Feature | Notes |
|-------|--------------|-------|
| `spatial_motion_log` | MotionOrchestrator diagnostics | Opt-in telemetry; GDPR path via `deleted_at` |
| `user_spatial_prefs` | Spatial / motion preferences per user | `reduced_motion`, `preferred_layer` |
| `user_badges` | Gamification — badge awards | See `20260214000000_user_badges.sql` |
| `user_check_ins` | Safety — check-in records | GDPR path required |
| `realtime_presence` | NowSignal — live presence | TTL-purged; no PII |
| `system_settings` | Admin — feature flags & overrides | Service-role write; anon read |

---

## Active RPCs (UI Contract)

The following 2 RPCs are executed by the frontend at runtime:

| RPC | Signature | Caller |
|-----|-----------|--------|
| `get_user_spatial_context` | `(user_id UUID) → JSON` | `useMotionOrchestrator`, shell boot |
| `delete_user_data` | `(user_id UUID) → void` | GDPR erasure flow in account settings |

---

## Prohibited Patterns

The following patterns are **never** acceptable in migrations:

```sql
-- ❌ Speculative table
CREATE TABLE IF NOT EXISTS future_feature (...);

-- ❌ DROP without deprecation window
ALTER TABLE users DROP COLUMN legacy_field;

-- ❌ RPC with no UI caller
CREATE OR REPLACE FUNCTION compute_analytics() ...

-- ❌ Hardcoded service-role bypass in client code
supabase.from('admin_table').select('*') -- no RLS
```

---

## Emergency Override

If a production incident requires a schema hotfix:

1. Open a `[HOTFIX]` PR with the migration.
2. Tag `@SICQR` and one backend reviewer.
3. Apply only after two approvals.
4. Document the incident in `docs/RUNLOG.md`.

---

## Z-Index Contract

The UI layer stack is enforced by `src/ui/tokens.ts` and `src/styles/tokens.ts`.
No component may use an arbitrary z-index value. All layers must use canonical
constants:

| Layer | Z | Constant |
|-------|---|----------|
| L0 Globe | 0 | `Z.globe` |
| Page content | 10 | `Z.page` |
| L1 HUD | 50 | `Z.hud` |
| L2 Sheets | 80 | `Z.sheet` |
| Modals | 90 | `Z.modal` |
| L3 Interrupts | 100 | `Z.interrupt` |

**No inline `z-[9999]`, `z-[1000]`, `z-[500]`, or similar values are permitted.**
Violations will be caught by the CI linter.

---

## Motion Contract

All animated fixed-position elements must:

1. Acquire a `MotionToken` via `MotionOrchestrator.request(domain)` before
   beginning their animation.
2. Release the token via `MotionOrchestrator.release(token)` when complete
   (including on error/unmount).
3. Declare a `SpatialElement` descriptor in `src/types/spatial.ts`.

This prevents competing animation stacks (sheet open during camera fly, etc.)
and ensures the sequence: **Enter → Settle → Exit**.

---

*Last updated: 2026-02-21. Maintained by: @SICQR / Copilot Coding Agent.*
