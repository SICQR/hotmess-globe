# Visibility State Architecture

Locked Phil 2026-05-27. **This document gates #213 incognito_week.** No incognito code ships until this spec is reviewed.

> Incognito is not "hide me." It is a distributed visibility policy engine. Treat it like auth or payments.

## 1. The state model

Three discrete states. A user is in exactly one at any time. Stored on `profiles.visibility_state` (text, not-null, default `'visible'`).

| State | Stored as | Meaning |
|---|---|---|
| Visible | `visible` | Default. Appears everywhere subject to existing privacy settings. |
| Trusted-only | `trusted_only` | Appears only to TRUSTED contacts. Invisible to MESS/CONNECT. |
| Invisible | `invisible` | Appears to nobody except mutual-boo'd contacts (Exception A) and moderation (Exception M). |

**Why three, not two:** "Invisible" is a hard cut. "Trusted-only" is a soft cut — for the user who wants out of discovery but still wants their close circle to see them. Without the middle state, invisible mode becomes binary and people stop using it.

State transitions are audited (see §11). A user MAY transition freely between the three.

## 2. The per-surface contract

For each surface that exposes user presence or identity, this table is the binding contract. **Any new surface added to the app must extend this table before merging.**

| Surface | visible | trusted_only | invisible |
|---|---|---|---|
| Pulse map — own beacons render | Yes | Yes (only to TRUSTED viewers) | No (beacon hidden from globe) |
| Pulse map — own approximate location dot | Yes | Yes (only to TRUSTED viewers) | No |
| Pulse map — others' beacons render to ME | Yes | Yes | Yes (I can still see — invisibility is one-way) |
| Ghosted grid — I appear in nearby/recent | Yes | Only to TRUSTED viewers | Only to mutual-boo'd viewers |
| Ghosted grid — I see others | Yes | Yes | Yes |
| Ghosted recent stories | Yes | Only to TRUSTED viewers | Only to mutual-boo'd viewers |
| Profile preview sheet (someone opens my profile) | Yes | Show 'Trusted only' state instead of details unless viewer is TRUSTED | Show 'Off the grid' card unless viewer is mutual-boo'd |
| Search/discovery indexes | Indexed | Excluded from public index, included in TRUSTED-scoped index | Excluded from all indexes |
| Chat — I can send/receive | Yes | Yes | Yes (chat is consent-gated, visibility-orthogonal) |
| Chat — I appear "online" indicator | Yes | Only to TRUSTED viewers | Never |
| Notifications — I receive push to my devices | Yes | Yes | Yes |
| Notifications — others get pushed about MY actions | Yes (per existing fanout rules) | Only TRUSTED recipients | Only mutual-boo'd recipients |
| `last_active` timestamp surfaced to others | Yes | Only TRUSTED viewers | Never (returns null) |
| Beacon publication (creating new beacons) | Allowed, rendered per row 1 | Allowed, rendered per row 1 | Allowed, but beacon stored with `visibility_state='invisible'` snapshot and NOT rendered until user goes visible |
| Analytics events (server-side) | Logged with user_id | Logged with user_id | Logged with user_id (we still need to understand the product) |
| Public analytics dashboards (any user-visible aggregate) | Counted | Counted only in aggregated bucket (no individual cells) | Counted only in aggregated bucket |
| Sacred Invariant #7 (fuzzy ≤200m, no trails) | Applies | Applies | Applies + above |

**Rule of construction:** If you can't fit a new surface into one of these three columns, the surface itself is wrong — either too leaky (no `invisible` column exists for it) or too prescriptive (no `visible` column makes sense).

## 3. Exception A — mutual-boo

A user marked `invisible` IS visible to anyone with whom they have a mutual boo, on Ghosted grid + Ghosted recent + Pulse map + push fanout.

**Why:** Invisibility means "I want out of discovery." It does NOT mean "I want to break my existing bonds." Without this exception, going invisible accidentally ghosts your closest connections, which converts the feature from privacy-tool into relationship-grenade.

The mutual-boo lookup must run server-side. **Never** trust client to enforce.

## 4. Exception T — TRUSTED tier

A user marked `trusted_only` IS visible to anyone whose relationship to them is at TRUSTED tier (mutual boo + 24h cool-down past, per relationship doctrine §3).

A user marked `invisible` is NOT visible to TRUSTED contacts who are not also mutual-boo'd-recent (invisible > trusted_only in privacy strength).

## 5. Exception M — moderation

Moderation tools always see all users in all states. Moderation queries route through a dedicated SECURITY DEFINER function `moderation_visible_users()` which:
- Bypasses RLS
- Logs every read to `moderation_audit` table (who looked at what, when, why)
- Is granted ONLY to roles `service_role` and the future `moderator` role (not authenticated/anon)

**Compliance posture:** Moderation override exists. It is audited. Users are told in onboarding that moderation can see them regardless of visibility state.

## 6. Websocket / realtime broadcasts

Supabase realtime channels broadcast row-level changes. RLS applies to broadcasts. Visibility state must be encoded into broadcast filters:

- A row change for a user in `invisible` state must not broadcast their owner_id, location, or any identifying field to clients UNLESS the listening client is authenticated as a mutual-boo'd peer or moderation.
- Implementation: a database-level `BEFORE UPDATE` trigger or RLS policy on the broadcast channel itself, NOT a client-side filter. Client-side filtering means the data is already on the wire and we've already leaked.

## 7. Beacon serialization

`toPublicSafeFeatureCollection()` (the function that turns beacon rows into Mapbox features) must accept the viewer's user_id and call `should_render_beacon(viewer_id, beacon_owner_id, beacon_visibility_snapshot)`. The RPC returns boolean.

The current function strips `owner_id` from public-safe features; the visibility filter applies BEFORE that, deciding whether the feature exists at all.

**Critical:** beacon visibility is captured *at publish time* into a snapshot column on the beacon row. If a user publishes a beacon while visible, then goes invisible, that specific beacon stays visible — they meant to publish it. If they publish while invisible, it's invisible until they go visible. This avoids the "I went invisible and all my old beacons disappeared from the map mid-event" surprise.

## 8. Ghosted inclusion

The `useGhostedGrid` hook query must include a visibility filter:

```sql
WHERE (
  visibility_state = 'visible'
  OR (visibility_state = 'trusted_only' AND $viewer_id IN (SELECT user_id FROM trusted_contacts WHERE trusted_of = users.id))
  OR (visibility_state = 'invisible' AND $viewer_id IN (SELECT mutual_user_id FROM mutual_boos WHERE owner_id = users.id))
)
```

The filter must live in the RPC (`get_ghosted_grid`), not in client-side `.filter()`. RLS belt-and-braces it.

## 9. Search / discovery

Any future search index (Algolia, pg full-text, etc.) is built from a view that already applies the visibility filter — `invisible` users are not in the index at all. `trusted_only` users live in a separate scoped index queried only when the searcher is authenticated.

## 10. Notification fanout

`api/notifications/dispatcher.js` already loads trusted contacts with `.limit(3)` for SOS. Notification fanout for ALL events involving an `invisible` user must intersect the recipient set with the mutual-boo set. For `trusted_only` users, intersect with TRUSTED tier.

Push tokens are per-device, not per-relationship — the filter applies to recipient *users*, then their tokens are looked up.

## 11. Audit retention

Every visibility-state transition writes to `visibility_audit`:
- `user_id`
- `from_state`
- `to_state`
- `changed_at`
- `source` (`user_setting` / `boost_purchase` / `boost_expiration` / `moderation`)
- `actor_id` (null for self-change, moderator user_id for moderation override)

Retention: indefinite. This is the trail we will need if a user later disputes "I was invisible but they still saw me." Without it, every visibility complaint is unfalsifiable.

## 12. Analytics persistence

Server-side analytics events (`/api/analytics/event`) keep recording user_id regardless of visibility. We need to understand the product. **Public** analytics dashboards (`/admin/analytics`) aggregate `invisible`/`trusted_only` users into bucket counts only — no per-user rows in any surface a non-moderator could reach.

## 13. Map cache invalidation

When a user toggles to `invisible`, three caches must be invalidated:
- Client-side `useGhostedGrid` react-query cache key
- Client-side PulseMap GeoJSON source (`hm-public`) — re-fetched on next data load
- Server-side `night_pulse_realtime` materialized view — refreshed on its existing cron cadence (already runs every minute via pg_cron job #5)

The first two are user-of-toggler-only updates. The third propagates to other viewers within ≤60s.

**Trade-off accepted:** for ≤60 seconds after toggling invisible, other viewers may still see a cached version of you. The matview cadence is the budget. Acceptable for V1; if user feedback hits this, the path forward is to add a pg-notify on `visibility_state` change that forces an off-cadence refresh.

## 14. The boost interaction (incognito_week)

`incognito_week` is one purchase path that sets `visibility_state='invisible'` for 7 days and reverts on expiration. It is NOT the only path. The boost is convenience — the underlying state machine is the product.

This means:
- Boost-driven state changes write to `visibility_audit` with `source='boost_purchase'` / `'boost_expiration'`
- Manual toggle (a settings switch) is always available, free, and doesn't conflict with an active boost (manually going visible mid-boost is allowed; the boost just keeps the row alive until it expires)
- A user can buy incognito_week while already invisible — it just extends the floor

## 15. What we are NOT shipping

- "Stealth mode" with selective per-person hides. State is universal modulo exceptions A/T/M. No per-person blocklists masquerading as visibility.
- Toggling visibility from inside someone else's flow (e.g. "go invisible to this user"). The user owns their state, not their relationships.
- Background/automatic visibility changes (e.g. "go invisible at 2am"). Phil-rejected — automation here is a surface for abuse.

## 16. Implementation order (when #213 unfreezes)

1. `profiles.visibility_state` column + `visibility_audit` table — migration only, no behaviour change.
2. `should_render_beacon()` + `get_ghosted_grid()` + `moderation_visible_users()` RPCs.
3. Plumb visibility filter through `toPublicSafeFeatureCollection`, `useGhostedGrid`, notification dispatcher.
4. Settings UI (free manual toggle).
5. ONLY THEN: unhide `incognito_week` boost.

Each step is its own PR. Each step is verified live before the next begins.

## 17. Open questions for Phil (need decision before code)

- **Q1.** When a user goes invisible mid-conversation, does the chat partner see them go offline in the chat thread? Suggested: yes — chat is consent-gated, online state is part of presence. Lying about presence inside a consented conversation breaks trust more than it protects.
- **Q2.** Trusted contacts (used in SOS fanout) — are they the same set as TRUSTED-tier contacts (mutual-boo + 24h cool-down)? Suggested: yes, single source of truth. If we let them diverge, users have two trust lists to manage.
- **Q3.** Beacon visibility snapshot — do we store the visibility state of the publisher at publish time, or apply current state at render time? Spec proposes snapshot (§7). Confirm.
- **Q4.** Map cache 60s gap (§13) — acceptable for V1, or do we ship the pg-notify off-cadence refresh from day one? Suggested: ship V1 with the 60s gap, document the trade-off in onboarding ("can take up to a minute to apply"), upgrade if feedback demands.
