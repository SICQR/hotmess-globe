# Chat schema migration — chat_threads/chat_messages → canonical

**Status: in progress · Deadline: 2026-05-21 drop**

## Background

`chat_threads` and `chat_messages` are deprecated (2026-05-07) with planned
DROP on/after **2026-05-21**. Canonical replacement:

- `public.chat_threads`  → `public.conversations` + `public.conversation_members`
- `public.chat_messages` → `public.messages`

## Current data (as of 2026-05-20)

| Table | Rows |
|---|---|
| chat_threads | 17 |
| chat_messages | 98 |
| conversations | 15 |
| conversation_members | 28 |
| messages | 43 |
| orphan chat_messages (thread_id IS NULL) | 0 |

The deprecated tables have **more data than canonical** — the app has been
dual-writing inconsistently. Without a backfill before drop, 17 threads
and ~55 messages disappear.

## Two paths to safety

### Path A — full app-code migration (preferred long-term)

Refactor all 13 call sites in the React app to use the new
`src/lib/chat/canonical.ts` adapter (already merged). The adapter exposes
the OLD shape (`LegacyThread`, `LegacyMessage`) so the JSX renderers don't
need to change — only the supabase.from() lines.

**Scope: 13 files**

| File | Sites | Priority |
|---|---|---|
| `src/components/sheets/L2ChatSheet.jsx` | 3 | P0 — Ghosted entry |
| `src/components/messaging/ChatThread.jsx` | 3 | P0 — message render |
| `src/components/messaging/NewMessageModal.jsx` | 2 | P0 — DM creation |
| `src/pages/Messages.jsx` | 1 | P0 — inbox |
| `src/components/messaging/NotificationBadge.jsx` | 1 | P1 — unread badge |
| `src/components/utils/supabaseClient.jsx` | 3 | P0 — helper API used elsewhere |
| `src/components/profile/QuickActions.jsx` | 1 | P1 |
| `src/components/social/MessageButton.jsx` | 2 | P1 |
| `src/pages/Social.jsx` | 1 | P1 |
| `src/components/sheets/L2RouteSheet.tsx` | 1 | P2 — directions side-effect |
| `src/components/sheets/L2UberSheet.jsx` | 2 | P2 — Uber side-effect |
| `src/pages/SquadChat.jsx` | 4 | P2 — squad threads (group conv) |
| `src/components/admin/AnalyticsDashboard.jsx` | 1 | P3 — internal only |

### Path B — DB-side compat layer (safety net, ready to deploy)

`supabase/migrations/20260521000000_chat_compat_views.sql` is **pre-written
but NOT applied**. When run, it:

1. Backfills missing `conversations` / `conversation_members` rows from
   `chat_threads`.
2. Backfills missing `messages` rows from `chat_messages`.
3. Drops the deprecated tables.
4. Re-creates them as **views** over canonical.
5. Adds `INSTEAD OF INSERT/UPDATE` triggers so legacy writes redirect to
   canonical transparently.

**App code keeps working unchanged.** This is the bulletproof move if Path A
slips past the deadline.

## Recommended sequence

1. **Now → May 21:** keep Path A migration moving in parallel PRs.
2. **At drop (May 21):** apply the compat-view migration as the safety net.
   Even if Path A is incomplete, the app stays up.
3. **Post-drop:** finish Path A at a calm pace, then drop the compat views
   in a final cleanup migration.

## Already landed (foundation)

- `src/lib/chat/canonical.ts` — adapter with `listMyThreads`,
  `getOrCreateDirectThread`, `listMessages`, `sendMessage`, `markThreadRead`,
  `subscribeToThread`. Returns objects in legacy shape so JSX is untouched.
- RLS mutual-boo gate on `messages`, `conversation_members`, `conversations`
  (already applied to prod).
- pg_cron `ghosted_location_sessions_sweep` + `consent_blocks_sweep`
  (already running).
