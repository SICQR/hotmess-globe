# Sprint 0 closeout — /market React #300 repro + fix

**Brief:** `04_market_react_300.md`  
**Branch:** `fix/market-react-300-crash`  
**Audited against:** `main` @ `56d7fa9` (live on hotmessldn.com)  
**Audited:** 2026-05-17, Cowork  
**Outcome:** **GREEN — crash is no longer reproducible on current production**

---

## What was reported

Long-standing userMemories P0 flag: `/market` throws React error #300 ("Rendered more hooks than during the previous render"). The flag had survived multiple deploys without explicit verification because the SPA shell returns HTTP 200 server-side — the crash only surfaces after React hydrates client-side.

## What the test does

`e2e/11-market-react-300.spec.ts` — single Playwright spec, chromium project, no auth required.

1. Opens `https://hotmessldn.com/market` (or `$BASE_URL/market`)
2. Attaches `console` and `pageerror` listeners before navigation
3. Waits 12 seconds for React hydration + MarketMode lazy-chunk load + Shopify/Preloved/Drops data composition
4. Asserts: no console message or pageerror matches `/Minified React error #300|react\.dev\/errors\/300/i`
5. Always logs last 30 console messages + pageErrors to the report for triage

## Initial test outcome against current production

```
Running 1 test using 1 worker
--- /market console (last 30) ---
[warning] WARNING: Multiple instances of Three.js being imported.
--- /market pageErrors ---
(none)
--- summary --- console:1 errors:0 #300_hits:0
  ✓  1 [chromium] › 11-market-react-300.spec.ts ›
       does not throw Minified React error #300 on initial load (13.7s)
  1 passed (14.9s)
```

**Single observation:** one console warning ("Multiple instances of Three.js being imported") — informational, not a crash. The globe imports Three twice; that's a known eager-bundle issue tracked separately under the V2 manifesto's "single authoritative Three runtime" rule (Sprint 1 work, NOT in scope here).

**No React #300 hit. No errors. No pageerrors.**

## What changed (likely)

Brief 04 anticipated the crash was real and probably caused by hook-order violations in MarketMode's composition of Shopify + Preloved + Drops. That root cause didn't need fixing — by the time this brief ran, production was no longer reproducing the crash. The most plausible implicit fix is the SW v6 + nav `cache: 'reload'` change in PR #268 ensuring users land on a fresh `index.html` + matching hashed bundle, eliminating the stale-shell + new-component race that often produces hook-count mismatches.

No code change applied in this brief.

## What ships

- `e2e/11-market-react-300.spec.ts` — regression guard, runs against any `$BASE_URL`. Catches future hook-count regressions on /market within a 12s post-hydration window.
- This deliverable doc.

## CI wiring

The repo already has `test:e2e` and `test:e2e:prod` npm scripts wired to Playwright (`playwright.config.ts` testDir `./e2e`). The new spec picks up automatically — no separate CI integration needed. The brief mentions `tests/e2e/market.spec.ts` as the path, but project convention is `e2e/NN-name.spec.ts` and the Playwright config is anchored to `./e2e`; the spec was placed there to be picked up by the existing runner.

To re-run manually against prod:
```bash
BASE_URL=https://hotmessldn.com npx playwright test e2e/11-market-react-300.spec.ts --project chromium
```

## userMemories flag resolution

The next session brief can drop the "/market #300" P0 flag. The behavior is now covered by a regression test rather than relying on bug-report memory.

## Summary

**GREEN.** Current production does not throw React #300 on `/market`. Regression test shipped to keep it that way.
