# GODFATHER BACKEND AUTONOMY CONTRACT

> Version: 1.0 — Effective from 2026-02-21  
> Authority: Enforced by Copilot Agent on every backend mutation

---

## What This Is

This contract governs all automated and agent-driven backend changes to the
HOTMESS Supabase project. It is not advisory. It is architectural law.

Every migration, RPC, trigger, index, and policy must satisfy this contract
before it is committed.

---

## 1. Inspection Rights (Always Permitted)

The agent may at any time, without restriction, inspect:

- All tables, columns, constraints
- All RLS policies
- All functions and triggers
- All indexes
- All realtime publications
- All secrets and environment variables (read-only, never logged)
- All existing migrations
- All frontend `supabase.from()` and `supabase.rpc()` call sites

Inspection never mutates. It is always safe.

---

## 2. Automatic Mutation Rights

The agent may add the following **without requesting approval**, provided the
Mutation Rule (§4) is satisfied:

| Permitted Action | Condition |
|---|---|
| Add a missing table | Frontend `.from('table_name')` references it |
| Add a missing column | Frontend `select('col')` or `insert({col})` references it |
| Add an index | Query plan shows sequential scan on >1k rows |
| Add a safe RLS policy | New table lacks user-scoped access control |
| Add a compatibility view | Column casing mismatch causes runtime 400 |
| Add a missing RPC function | Frontend `rpc('fn_name')` references it |
| Normalize `created_at` ordering | `created_date` vs `created_at` mismatch |
| Add PostGIS extension | Frontend queries geography columns |
| Enable realtime on a table | Frontend `.channel()` subscribes to it |

---

## 3. Prohibited Mutations (Never Without Explicit Human Approval)

The agent MUST NOT, under any circumstances:

- `DROP TABLE` any table with production data
- `DROP COLUMN` any column with existing data
- `RENAME` tables or columns without a compatibility alias migration
- Remove or replace existing RLS policies without adding equivalent coverage
- Remove secrets or environment variable references
- Disable realtime publication on a channel the frontend subscribes to
- Introduce polling where realtime already exists
- Add tables that no frontend code references
- Add abstraction layers (views on views, functions wrapping functions)
  without a demonstrated performance or safety justification

---

## 4. Mutation Rule

**A backend change is only valid if it satisfies at least one of:**

1. **Frontend reference** — `.from('table')` or `.rpc('fn')` exists in `src/` or `api/`
2. **Runtime error** — 400/404/42P01 (undefined table) proven in logs
3. **Performance** — EXPLAIN shows seq-scan that an index would eliminate
4. **Safety** — RLS gap allows data leakage or GDPR violation
5. **Revenue regression** — payment/order flow broken without the change

If a change satisfies none of the above → do not add it.

---

## 5. Stability Law

Before committing any backend mutation, verify:

- [ ] No schema conflict with existing tables or columns
- [ ] No RLS policy leakage (user A cannot read user B's rows)
- [ ] No revenue flow regression (orders, payments, subscriptions unaffected)
- [ ] No GPS/location layer regression (location_shares, emergency_locations intact)
- [ ] No realtime channel duplication or double-subscription
- [ ] Migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `DO $$ IF NOT EXISTS`)

---

## 6. Legal Constraints (GDPR + Privacy)

Every migration that stores user data must include:

- An RLS policy scoping reads/writes to `auth.uid()`
- A deletion path (CASCADE or explicit `DELETE` policy)
- No storage of raw credentials, tokens, or PII beyond what the feature requires
- Visibility mode respect (ghosted users must not appear in public queries)
- Consent gate compliance: data collected only after explicit user consent

---

## 7. Layer Contract (Backend Serves Frontend)

The data model follows the UI, not the other way around.

```
UI Layer Need → Frontend Query → Backend Table
```

Never:

```
Backend Table → Inferred Frontend Use → Migration
```

If schema drift is detected (table exists in DB but frontend never queries it),
the agent should **note it** but never delete it without human confirmation.

---

## 8. Migration Naming Convention

```
YYYYMMDDHHMMSS_purpose_scope.sql
```

Examples:
- `20260221010000_frontend_contract_tables.sql` — tables required by frontend contract
- `20260221020000_add_index_products_view_count.sql` — performance index
- `20260221030000_rls_stories_visibility.sql` — RLS gap fix

---

## 9. Definition of Autonomy

Autonomy is not "add things freely."

**Autonomy means:**
- Detect drift between frontend contract and backend reality
- Repair drift with minimal, targeted migrations
- Enforce safety (RLS, GDPR) on every new surface
- Preserve system identity — the app must behave identically before and after

**Autonomy is not:**
- Over-modeling schema beyond UI needs
- Over-indexing columns that are never filtered
- Adding helper tables "for future use"
- Restructuring working tables for aesthetic reasons

---

## 10. Audit Trail

Every migration committed by the agent must include:

1. A header comment naming the frontend file(s) that reference it
2. The specific `supabase.from()` or `supabase.rpc()` call that justified it
3. The RLS policies applied
4. Whether realtime was enabled (and why)

Example:
```sql
-- Referenced by: src/components/social/Stories.jsx
-- Frontend call: supabase.from('stories').select(...)
-- RLS: owner write, public read (non-expired only)
-- Realtime: enabled (Stories.jsx subscribes to inserts)
```

---

*Backend should always serve UI. Never lead it.*
