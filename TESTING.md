# HOTMESS Globe — Testing Guide

## Local Supabase

### Start local Supabase
```bash
npx supabase start
```

### Apply all migrations + seed data
```bash
npx supabase db reset
```
This runs all migrations in `supabase/migrations/` and then applies `supabase/seed.sql`.

### Seed only (after migrations are applied)
```bash
bash scripts/db-seed.sh
# or equivalently:
npx supabase db reset --local
```

## Running Tests

### One-command verify (lint + typecheck + unit tests + build)
```bash
npm run verify
```
> Note: Playwright E2E tests are excluded from `verify` because they require a running dev server and installed browser binaries. Run E2E separately with the commands below.

### Unit / integration tests only (Vitest)
```bash
npm run test:run
```

### E2E tests (Playwright — requires dev server)
```bash
npm run test:e2e
```
Playwright will automatically start the dev server (`npm run dev:loopback`) on port 5173.

### E2E with mobile emulation
```bash
npm run test:e2e -- --project=mobile-chrome
npm run test:e2e -- --project=mobile-safari
```

### E2E with list reporter (verbose)
```bash
npm run test:e2e -- --reporter=list
```

### Full CI pipeline
```bash
npm run test:ci
# Runs: lint + typecheck + unit tests + e2e
```

## Release Checklist

Before every production deploy:

- [ ] Deploy migration `20260226000080_rls_critical_fixes.sql` to production Supabase
- [ ] Confirm `VITE_VAPID_PUBLIC_KEY` is set in Vercel dashboard (push notifications)
- [ ] Run `npm run verify` — must exit 0
- [ ] Run `npm run test:e2e` — all E2E tests must pass
- [ ] Confirm `npm run build` produces no type errors
- [ ] Smoke test on LAN device: `npm run dev -- --host` → http://192.168.0.102:5173/
- [ ] Verify brand color — no `#FF1493` (pink) anywhere; all CTAs use `#C8962C` (gold)
- [ ] Confirm SOS flow works end-to-end (long-press SOSButton → SOSOverlay visible)
- [ ] Confirm gated sheets (chat/video/travel) are blocked outside `/ghosted`
