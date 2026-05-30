# Ziaullah22/Hotmess-website merge — dev commit history

This file preserves the commit-message archive of work imported in the squashed merge.
Source repo: `Ziaullah22/Hotmess-website` (private fork on dev's personal GitHub).
Merge date: 2026-04-30.
Merge strategy: file-level cherry-pick (disjoint git histories — copy-paste fork from 2025-12-30).

Last 100 commits from `ziaullah/main` (most recent first):

```
02b5ae22 2026-04-28 feat: complete v5 safety features and whatsapp integration
e82ab710 2026-04-24 fix: finalize Safety Hub integration and routing
f3dead29 2026-04-24 docs: finalize Safety and Community status in README
8f995b70 2026-04-24 feat: deploy NA/AA recovery pins, UI seeding, and Elite Globe UX stabilization
8b9752f1 2026-04-23 fix: resolve case-sensitive import error for Select component in Safety.jsx
67a020f8 2026-04-23 fix: resolve ambiguous Tailwind duration class to fix Vercel build warning
371d10ee 2026-04-23 feat: implemented localized pull-to-refresh for sheets and sub-pages; fixed right_now_status schema mismatches
44d82767 2026-04-23 Docs: Added Global Pull-to-Refresh to README.
61713580 2026-04-23 UI: Implemented global Noir Pull-to-Refresh system across the entire OS.
e61ecf35 2026-04-23 Fix: Increased heartbeat frequency (30s) for faster nearby discovery.
71529ae5 2026-04-23 Fix: Improved cross-device nearby discovery logic (24h window).
b70feaa0 2026-04-23 Chunk 9: GPS & Adaptive Location complete. Fixed Real-time chat sync, Uber fallback, and neighborhood geocoding.
914eec9a 2026-04-23 feat: finalize Chunk 8 Transactional Emails for production Vercel
2aa1c80d 2026-04-23 feat: implement Chunk 8 Transactional Emails with Noir design system
df22c127 2026-04-23 Stabilization: Resolve mobile scroll traps, fix notification badge persistence, and calibrate header layout
73b612a4 2026-04-21 fix: remove update-readme.js, workflow now uses inline Python only
c6c024a6 2026-04-21 feat: auto-update README on every push to main
09ada980 2026-04-20 Fix: Marketplace inventory management, notification badge UI, and top banner spacing fixes
09a56ae1 2026-04-18 feat: optimistic location sharing and hardened mobile maps redirection
ed52007d 2026-04-18 feat: finalized messaging suite with instant photo previews, maps integration, and desktop scaling
dec79436 2026-04-18 debug: add verbose storage upload logging to track chat attachments
0daf3d2f 2026-04-18 feat: hardened messaging engine with robust thread resolution and diagnostic logging
a2e2c23f 2026-04-17 debug: finalized geolocation persistence with verbose diagnostic logging
a2d09135 2026-04-17 feat: comprehensive UI Polish Sprint & Navigation Refactor
c76f6fd9 2026-04-17 Fix membership sync, webhook logic, and profile updates
92d0d64f 2026-04-14 feat: redesign ghosted audio, radio player, and music mini-player with premium aesthetics and persistent playback controls
71ce111c 2026-04-14 fix: make Shopify mirroring bulletproof by removing type restrictions
a78ad75d 2026-04-14 fix: smarter Shopify item detection in webhook using variant IDs
b5612c90 2026-04-14 fix: sync order status across all tables and ensure Shopify mirroring in webhook
efa31a2a 2026-04-14 fix: resolve syntax error in webhook.js causing 500 errors
5d18c7fb 2026-04-14 chore: cleanup backup and temporary mode files
e3b79898 2026-04-14 feat: Integrate Shopify Admin API order mirroring and premium reusable TrackPlayer component
4121b33a 2026-04-13 Update vercel cron configurations and minor UI cleanup
eb15d992 2026-04-12 Fix: Removed multi-region configuration for Vercel Hobby plan
4c168cbd 2026-04-12 Fix: Adjusted cron jobs for Vercel Hobby plan compatibility
837689a6 2026-04-12 UI: Standardization of scrollbars, cart selection logic, and redesign of Home/Ghosted/Pulse tab teasers
8b836a68 2026-04-11 Fix blank screen by reverting top-level template literals and adding dynamic cache-busting
bbd369eb 2026-04-11 Add cache-busting to live radio stream URL
c4fcd468 2026-04-11 Initialize project with Live Radio and Navigation fixes
7c829312 2026-04-11 chore: redeploy — RESEND_API_KEY added, whatsapp daily brief live
84f7d662 2026-04-11 fix(whatsapp): use send.hotmessldn.com as Resend sending subdomain
42aae1cb 2026-04-11 fix(whatsapp): use valid claude-sonnet-4-20250514 model id in daily brief cron
947bc8f9 2026-04-11 chore: redeploy — fix WHATSAPP_VERIFY_TOKEN trailing newline
cd96a9a6 2026-04-11 feat(whatsapp): Business API webhook + daily Claude brief
0e3fcb73 2026-04-07 fix(ghosted): resolve merge conflict + verified field name in PreviewSheet
0410671a 2026-04-07 chore: single-source cleanup — card normalization, schema rename, hero collapse, SOS verify (#189)
b3d2f1de 2026-04-06 feat(music): carousel layout — releases as scrollable cards, no duplicate list
67080e34 2026-04-06 fix(ghosted): verified → is_verified — fixes Ghosted crash on production
c55a4811 2026-04-06 fix(ghosted): verified → is_verified — fixes Ghosted crash on production
629a4029 2026-04-06 feat(auth): phone OTP flow + enable Apple Sign-In
404cc4cb 2026-04-06 docs: v3.0 handover pack — QA-verified at fe52338, 14/14 E2E passing
bd6240d3 2026-04-06 fix(e2e): QA-07 deep-link directly to seeded e2e chat thread
20a0f2e7 2026-04-06 fix(e2e): bypass cookie banner in auth helper, QA-07 use dialog-scoped locator
01823425 2026-04-06 fix(e2e): QA-07 150s timeout, auth.ts 5s click timeouts to prevent 30s hangs
93331641 2026-04-06 fix(e2e): QA-05 debug logs, QA-06 use conversations table, QA-07 120s timeout
90ba11bc 2026-04-06 fix(e2e): QA-06 messages schema (conversation_id/sender_id), QA-13 market locator
2453fddc 2026-04-06 fix(ghosted): verified→is_verified, drop right_now_status column ref
3934afaa 2026-04-06 fix(ghosted): remove profiles.last_lat/last_lng — column does not exist
fe52338d 2026-04-06 fix(ghosted): remove profiles.photos column refs — column does not exist
2c54a019 2026-04-06 docs: QA results — 14/14 API pass, 5/5 browser pass, 16 manual tests remaining
66867277 2026-04-06 docs: freeze baseline 456e0e5, add real-device QA checklist
456e0e52 2026-04-06 feat(grid): photo completion + trust multiplier for ranking
5cc00c76 2026-04-06 docs: update PROJECT-STATE — T-11 through T-15 complete
d41348e5 2026-04-06 fix(T-15): HNH MESS page — meaning first, product second, CTA third
f0a939fd 2026-04-06 fix(T-14): music/radio dedup — enforce single-surface rule
1294d670 2026-04-06 fix(privacy): T-13 round GPS coords in match-probability API
7ad570af 2026-04-06 fix(push): T-12 push notification QA fixes
a588f3ac 2026-04-06 fix(photos): T-11 photo moderation truth pass
c51ce793 2026-04-06 docs: add PROJECT-STATE.md — live launch-hardening dashboard
c2224974 2026-04-06 fix(db): create profile_overrides with correct profiles FK + RLS
9f317990 2026-04-06 feat(seed): 30 London test profiles with presence + photos
af4fcf1d 2026-04-06 feat(photos): report photo targets specific photo + flags via RLS
819c674d 2026-04-06 feat(taps): migrate taps table from email FK to UUID FK
27842cd9 2026-04-06 fix(radio): remove legacy radio system, unify on RadioContext.tsx
d58fdecb 2026-04-06 fix(privacy): P0 GPS coordinate rounding + user_presence RLS
003ecfa1 2026-04-06 docs(handover): v2.1 polish — status discipline, downgraded overpromises, cross-ref fix
b3c47f58 2026-04-06 docs(handover): v2 handover pack + photo moderation pipeline
0759cb05 2026-04-06 fix: remove accidentally staged worktree from index
f2f55c0e 2026-04-06 merge(stupefied-bardeen): 12-commit audit branch — Ghosted V3, boo/match/meet, photos, safety, dead code
d3bb32f4 2026-04-06 fix(safety): SOS push to trusted contacts, presence heartbeat on boot
9dc21981 2026-04-06 fix(photos): upload validation, chat upload fix, storage consolidation
3f5b58a0 2026-04-06 feat(meet): midpoint calculation, halfway meet, match chat prefill
bbbf0950 2026-04-06 feat(ghosted): mutual boo detection, match overlay, grid badges
8018d53c 2026-04-06 fix(hnh): restructure HNH MESS hero — meaning-first hierarchy
01a89200 2026-04-06 fix(music): dedup consent modal, clean RadioMode/MusicTab hierarchy
ff838fa0 2026-04-06 feat(ghosted): add Now Playing context strip above grid
1552caed 2026-04-06 fix: QA trust pass — fix 8 broken/misleading user-facing issues
f4076fd5 2026-04-06 chore: dead code cleanup — remove 135 unused files, ~30k lines
21494cbf 2026-04-06 refine(membership): calm upgrade surfaces — remove highlights, tighten copy, drop noise
87d118d4 2026-04-06 feat(safety): control surface calming — quieter FAB, tighter hierarchy, calmer copy
372823b6 2026-04-06 feat(home): content compression — faster above-fold, fewer sections, clearer hierarchy
b0a056f1 2026-04-06 feat(market): commerce loop tightening — hierarchy, cart, copy, preloved flow
d471f2b0 2026-04-05 feat(pulse): drawer intelligence + nearby signal + stronger Ghosted bridge
dca3caec 2026-04-05 feat(radio): radio→ghosted live refinement — context strip, chat radio awareness, listener sort
05501404 2026-04-05 feat(movement): movement interception polish — cards, preview, chat, suggest-stop flow
91378639 2026-04-05 feat(launch): tighten Home→Pulse→Ghosted flow — single dominant CTA, no competing paths
f3bda7c4 2026-04-05 feat(ghosted): interaction quality pass — preview sheet + Boo flow + chat context
975ad1a0 2026-04-05 fix(assets): enforce consistent fallback hierarchy across all surfaces
85d5c4c8 2026-04-05 fix(consolidation): enforce single source of truth per surface
32dd5937 2026-04-05 fix(cleanup): duplicate removal + hierarchy enforcement across all screens
```

Full history: 1738 commits between 2025-12-30 and 2026-04-28.

Rollback target if this merge breaks production:
```
git reset --hard pre-ziaullah-merge-snapshot
git push --force-with-lease origin main
```
