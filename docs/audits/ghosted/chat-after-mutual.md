# Ghosted audit — Chat after mutual

**Status:** working (on compat layer)
**Last verified in production:** 2026-05-20 — schema + RLS verification on prod.
**Evidence:** `chat_threads` + `chat_messages` are now VIEWS over canonical `conversations`/`conversation_members`/`messages` (compat migration applied 2026-05-20). INSERT routed via INSTEAD OF triggers. Mutual RLS enforced on both the views' underlying tables and canonical tables.

## Behaviour
- Message button only renders post-mutual (`canInteract`).
- Opening chat resolves/creates a direct thread, then opens `L2ChatSheet`.
- Sends go through canonical `messages` (via compat view + trigger). Every send re-checks mutual at write time server-side.
- If either party un-boos, future sends are RLS-rejected.

## Known caveats
- App code still references the deprecated table NAMES (now views) — 14 call sites. Functionally fine via compat layer; clean refactor is queued (Task #72 follow-up, `docs/migrations/CHAT_CANONICAL_MIGRATION.md`).
- `chat_threads`/`chat_messages` planned-drop comment said 2026-05-21 — now neutralised: they're views, not droppable tables in the old sense; the drop migration was superseded by the compat migration.

## Never Silent compliance: **Y (with one gap)**
- Send success/failure surfaces in `L2ChatSheet`.
- Gap: read receipts / delivery state for chat messages are partial (`metadata.read_by`); not a launch blocker but not a confirmed "delivered" state per Never Silent. Note for chat-polish sprint.
