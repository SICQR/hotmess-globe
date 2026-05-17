# Sprint 0 closeout — Care infrastructure palette audit

**Brief:** `03_care_palette_audit.md`  
**Branch:** `audit/care-palette-sprint0`  
**Audited against:** `main` @ `56d7fa9` (live on hotmessldn.com)  
**Audited:** 2026-05-17, Cowork  
**Outcome:** **PASS — no drift, 6/6 tiers manifesto-compliant**

---

## TIER_VISUAL_CONFIG — verbatim from `src/hooks/useLiveTierData.ts`

This is the single canonical tier-to-visual-token map. `src/components/globe/FoundingTierLayer.tsx` and `src/pages/PortalPage.jsx` both import from here. No drift between consumers.

```ts
export const TIER_VISUAL_CONFIG: Record<FoundingTier, {
  label: string;
  cap: number;
  color: string;            // base pin color
  ringColor?: string;       // present on Anchor (named-label tier)
  accentColor?: string;     // present on Promoter (magenta stroke)
  glowColor?: string;       // present on Wellness/Recovery (muted glow)
  pulse: 'none' | 'breath' | 'ring' | 'migration' | 'glow' | 'steady';
  sizeBase: number;         // baseline sprite size multiplier
  persistentLabel: boolean; // Anchor only
  emissiveStrength: number; // Mapbox only — 1.0 max under night lightPreset
}> = {
  founding_venue: {
    label: 'Founding Venue', cap: 50,
    color: '#C8962C', pulse: 'steady', sizeBase: 1.0,
    persistentLabel: false, emissiveStrength: 0.9,
  },
  founding_signal: {
    label: 'Founding Signal', cap: 25,
    color: '#C8962C', pulse: 'breath', sizeBase: 1.2,
    persistentLabel: false, emissiveStrength: 1.0,
  },
  founding_anchor: {
    label: 'Founding Anchor', cap: 10,
    color: '#C8962C', ringColor: '#C8962C',
    pulse: 'ring', sizeBase: 1.5,
    persistentLabel: true, emissiveStrength: 1.0,
  },
  founding_promoter: {
    label: 'Founding Promoter', cap: 15,
    color: '#C8962C', accentColor: '#FF4F9A',
    pulse: 'migration', sizeBase: 1.1,
    persistentLabel: false, emissiveStrength: 1.0,
  },
  founding_chain: {
    label: 'Founding Chain', cap: 5,
    color: '#C8962C', pulse: 'steady', sizeBase: 1.3,
    persistentLabel: false, emissiveStrength: 0.9,
  },
  founding_wellness: {
    label: 'Founding Wellness', cap: 10,
    color: '#9aaab8', glowColor: '#7a8b9a',
    pulse: 'glow', sizeBase: 0.9,
    persistentLabel: false, emissiveStrength: 0.7,
  },
};
```

## Tier → dot → glow → notes

| Tier | Dot (`color`) | Glow (`glowColor`) | Accent | Pulse | Manifesto bucket |
|---|---|---|---|---|---|
| `founding_venue` | `#C8962C` | — | — | steady | nightlife (gold) |
| `founding_signal` | `#C8962C` | — | — | breath | nightlife (gold) |
| `founding_anchor` | `#C8962C` | — | `ringColor=#C8962C` | ring | nightlife (gold) |
| `founding_promoter` | `#C8962C` | — | `accentColor=#FF4F9A` | migration | nightlife (gold + magenta) |
| `founding_chain` | `#C8962C` | — | — | steady | nightlife (gold) |
| `founding_wellness` | `#9aaab8` | `#7a8b9a` | — | glow | **care (blue-grey)** |

## Manifesto compliance

V2_MANIFESTO.md → V2_ROADMAP.md "Cross-cutting concerns → Care infrastructure → Sprint 0":

> Recovery + Wellness tiers render with muted blue-grey palette (`#7a8b9a` glow, `#9aaab8` dot). Distinct from gold club tiers.

| Check | Result |
|---|---|
| All 5 nightlife tiers use the gold palette (`#C8962C` family) | **PASS** — 5/5 |
| Wellness tier uses `#7a8b9a` glow + `#9aaab8` dot | **PASS** — exact match |
| Wellness pulse differs from nightlife pulses (not `steady`/`breath`/`ring`/`migration`) | **PASS** — `glow` is unique to Wellness |
| Wellness `emissiveStrength` lower than club tiers (manifesto: "stable, not aggressive") | **PASS** — `0.7` vs `0.9–1.0` for nightlife |
| Promoter accent (magenta `#FF4F9A`) doesn't bleed into care | **PASS** — Promoter-only |

**6/6 tiers compliant.**

## Recovery cohort — observation, not drift

Brief 03 named "Recovery + Wellness". TIER_VISUAL_CONFIG only has `founding_wellness`. Why no `founding_recovery`?

Confirmed against the live schema (`rfoftonnlwudilafhfkl`, 2026-05-17):

```
founding_partner_inquiries_tier_interest_check:
  CHECK (tier_interest IN ('founding_venue', 'founding_signal', 'founding_anchor',
                           'founding_promoter', 'founding_chain', 'founding_wellness',
                           'unsure'))

profiles_founding_status_check:
  CHECK (founding_status IN ('original_50', 'founding', 'early'))
```

- No `founding_recovery` value allowed on `founding_partner_inquiries.tier_interest` → Recovery is not a partner tier.
- No `recovery` value allowed on `profiles.founding_status` → Recovery is not yet a member cohort either.

The `glowColor // present on Wellness/Recovery (muted glow)` TYPE comment anticipated a future Recovery tier. Per V2_ROADMAP cohort-math reconciliation ("175 → 115 paid + 25 Recovery"), Recovery is a planned MEMBER cohort, deferred. Brief 02 (reentry campaign) confirms this — the race-to-claim only allocates `original_50 / founding / early`, no Recovery.

**Not a drift on its own.** When Recovery lands (Sprint 1+), the schema needs:
- New CHECK value on `profiles.founding_status`: `'recovery'`
- New entry in `TIER_VISUAL_CONFIG` mirroring `founding_wellness` if Recovery members render with the same care visual (or a dedicated config if they get a unique treatment).

Logged here for the Sprint 1 brief author. Not actionable in Sprint 0.

## Fix applied

None. Branch closes without merge.

## Summary

**PASS — no drift.** All five gold nightlife tiers and the one blue-grey care tier (`founding_wellness`) match the manifesto. The Recovery cohort doesn't exist in code or schema yet — that's a Sprint 1+ build, not a Sprint 0 drift.
