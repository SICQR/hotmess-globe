# Slice — Editorial 4:5 hero aspect for poster-led products

**Status:** Scoped, not built.
**Origin:** Task #415.
**Trigger:** Phil 2026-05-31. The After Midnight beacon poster, the SUPERHUNG vest editorial, the "JUST THE MESS" series — these are PORTRAIT compositions (4:5 ratio, sometimes 9:16). They render in the current Zone B square (`1/1` aspect, `70dvh` max) with `object-contain`, which letterboxes them top and bottom and shrinks the actual editorial moment to maybe 50% of the slot. Cinematic content stops feeling cinematic the moment it's letterboxed.

## Problem

Zone B currently locks aspect ratio to `1/1` for every product. SKU photography (bottle, garment) wants square. Editorial / poster product types want portrait. One aspect ratio doesn't serve both.

## Goal

Zone B accepts two aspect modes — `square` (1/1, default) and `editorial` (4/5 portrait) — chosen automatically based on the product type or an explicit metafield. The 70dvh ceiling holds in both modes so the buy dock stays visible.

## Acceptance criteria

1. **SKU products unchanged.** Lube, apparel, gear render at `1/1` `70dvh` — no regression from current state.
2. **Editorial products at 4/5.** After Midnight beacon, SUPERHUNG vest editorial, JUST THE MESS — render at `4/5` portrait inside the 70dvh ceiling. No letterbox.
3. **Detection is data-driven.** Either a `metadata.editorial: true` flag on the product, or a category match (`category === 'editorial'` / `productType` includes `EDITORIAL`). Falls back to `square` if signal absent.
4. **Doctrine fit.** D18 §1 sacred rule holds — dock still visible. D18 §7 media hierarchy holds — campaign image in primary, product shot in thumbs. Editorial mode doesn't override either.
5. **Thumbnail behaviour preserved.** Tap-to-swap still works. If a 4/5 editorial is in primary and a 1/1 product shot is in thumbs, tapping the thumb swaps it into primary — the slot aspect ratio adapts (recommendation: aspect-snap to the active image's aspect, with a smooth `transition` so the change feels considered, not jarring).

## Design

### Detection
Single helper in `L2ShopSheet.jsx`:
```js
function getHeroAspectMode(product, currentImageUrl) {
  // 1. Explicit metadata wins.
  if (product?.metadata?.editorial === true) return 'editorial';
  // 2. Category / productType signal.
  const t = String(product?.category || product?.productType || '').toUpperCase();
  if (/EDITORIAL|POSTER|BEACON|CAMPAIGN/.test(t)) return 'editorial';
  // 3. Per-image: if the image itself has aspect metadata > 1.2, treat as editorial.
  //    Deferred — image-level aspect needs intrinsic dimensions from Shopify.
  return 'square';
}
```

### Aspect snap on swap
When a thumbnail is tapped into the primary slot, the new image may have a different natural aspect than the previously primary. Options:

- **A. Fixed slot, object-contain.** Slot stays `editorial` or `square`, swapped image letterboxes if it doesn't match. Simple, safe, ugly for the wrong image.
- **B. Adaptive slot.** Slot aspect snaps to the current primary's effective aspect. The container animates between `1/1` and `4/5` over ~250ms. Lux feel, complexity is real.

Recommend **B** for the editorial slice — the whole point is cinematic.

### CSS
```jsx
const aspect = heroAspect === 'editorial' ? '4 / 5' : '1 / 1';
<div
  className="rounded-2xl overflow-hidden bg-black border border-white/5"
  style={{
    aspectRatio: aspect,
    maxHeight: '70dvh',
    transition: 'aspect-ratio 250ms cubic-bezier(.4,0,.2,1)',
  }}
>
```

`aspect-ratio` transitions work in Safari 17+ / Chrome 120+. Fallback degrades gracefully — older browsers snap without animation.

### object-contain vs object-cover
- Editorial mode: `object-cover` (the composition is already framed; crop to fill is the lux move).
- Square mode: `object-contain` (don't crop the bottle / hem).

## Doctrine fit

- D18 §1 — dock visibility: 70dvh ceiling held in both modes. 4/5 at 70dvh ≈ 56% of viewport width on a portrait phone, which on an iPhone (390 wide) is ~218px wide × 273px tall. Still well below the dock zone. PASS.
- D18 §2 Zone B — current text says "Aspect ratio: square (`1/1`) for physical SKUs, portrait (`4/5`) for editorial / lifestyle. Never full-bleed." So this slice is just the implementation of an already-documented spec.
- D17 surface layer — no new fixed elements, no shield/dock collision.

## Data dependency

Editorial products need to be flagged. Two paths:

1. **Shopify product type / tag.** Tag a campaign poster product with `editorial` and the resolver picks it up. Shopify-admin work, no migration.
2. **Beacon-linked products.** Beacons that link to a product (After Midnight, etc.) carry `entity_kind: 'event'` / `intent: 'arrive'`. These ALWAYS render editorial mode regardless of the product flag. Detection at the openSheet site (BeaconCard).

Recommend ship 1 first, layer 2 on later.

## Out of scope

- Per-image aspect metadata from Shopify (deferred — would need media query to Shopify Storefront API).
- Vertical 9:16 video product hero (separate slice).
- Animated aspect-snap on thumbnail tap (deferred to v2 if v1 feels too static).

## Risk

- Aspect-ratio transition is a relatively new CSS feature. iOS Safari <17 won't animate. Acceptable — content still renders correctly, just without the smooth snap.
- Thumb-tap-to-swap with adaptive aspect could feel jarring if used on a product with mixed-aspect images. Mitigation: editorial products curated upstream to have aspect-consistent image sets.

## Implementation order

1. `getHeroAspectMode` helper in L2ShopSheet.
2. Wire it to gallery container `aspectRatio` style.
3. Switch `object-contain` / `object-cover` based on mode.
4. Add CSS transition.
5. Tag one product (After Midnight beacon poster) `editorial` in Shopify.
6. Smoke test live, screenshot for Phil.

## Open questions

None blocking. Detection logic is conservative — when in doubt, square.
