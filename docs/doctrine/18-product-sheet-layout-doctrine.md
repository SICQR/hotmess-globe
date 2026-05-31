# D18 — Product Sheet Layout Doctrine

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Scope:** Every product sheet in the app — Shop, Preloved, beacons that route to a buy. Cross-links D07 (Visual Hierarchy), D16 (Surface Layer Doctrine), D17 (anti-funnel rules).

---

## 0. The problem this doctrine fixes

Phil's screenshots, 2026-05-31:

1. Lube product sheet — ADD/BUY visible because the gallery thumbnails happened to be in view.
2. SUPERHUNG tank sheet — full-bleed model photo, **zero buy chrome on screen.**
3. After Midnight beacon — full-bleed editorial poster, **zero buy chrome on screen.**
4. Same sheet scrolled to bottom — buttons appear over thumbnails.

Phil's call: **"no full screen images. buttons over images. one would want that, right?"**

Yes. Nobody opens a product sheet to look at the product unobstructed. They open it to decide whether to buy. The buy decision needs the action chrome present at all times. A product sheet without a visible buy button is a billboard, not a product sheet.

This doctrine establishes the structural rules for product sheets so the failure mode above never recurs.

---

## 1. Sacred rule

**The Buy chrome is always visible.**

Both `ADD TO BAG` and `BUY NOW` (or the Preloved equivalents `MESSAGE` / `BUY NOW`) are rendered as a floating dock at the bottom of the sheet viewport, layered over the image. At every sheet state (peek, expanded), at every scroll position, at every screen size, on every product type — the dock is in view.

No exceptions. Not for editorial drops. Not for image-led launches. Not "above the fold". Not "after the first scroll". Always.

---

## 2. Layout zones

Every product sheet renders in four stacked zones, top to bottom:

### Zone A — Identity strip (fixed, top)
- Vendor + 18+ chip (if applicable). 11px caps, gold.
- No "PRODUCT" header. The sheet's own title bar carries the product name. A second "PRODUCT" word is redundant chrome and steals vertical budget from the image.
- Height: ~32px.

### Zone B — Hero image (lux-dominant, bounded, scrolls with content)
- Primary product image. Aspect ratio: square (`1/1`) for physical SKUs (lube, apparel), portrait (`4/5`) for editorial / lifestyle. Never full-bleed.
- **Max height: `70dvh`** — lux-dominant. The image is the hero of the surface. The 70dvh cap leaves ~22dvh for the buy dock + a glimpse of the price/title strip; together with the sheet's own header pip that's the entire visible budget at peek (`0.92dvh`). Anything less than 70dvh felt "small product card", which is not the HOTMESS feel.
- `object-contain` for SKU photography (don't crop the bottle / hem). `object-cover` for editorial.
- **Thumbnails are tappable** — tap any thumbnail to swap it into the primary slot. The previously-primary image takes the vacated thumbnail position. No swiping (Phil's standing call: simpler than carousel; tap-to-swap is the explicit gesture).

### Zone C — Decision content (scrolls)
- Title, price, variant selectors, story, accordions. Same density as today.
- This is the only zone that needs unbounded scroll. Long product descriptions are fine here — the user has already seen the image and the buy chrome before they reach here.

### Zone D — Buy dock (fixed, bottom, overlays image)
- Always present. `position: absolute; bottom: 0; left: 0; right: 0` inside the sheet container.
- Two buttons: secondary CTA (ADD TO BAG / MESSAGE) on the left, primary CTA (BUY NOW) on the right, sized ~1 : 1.3.
- Sits on a gradient backdrop (`bg-gradient-to-t from-black via-black/98 to-transparent`) so it stays readable over any underlying image.
- Bottom padding accounts for the iOS safe area (`pb-[max(24px,env(safe-area-inset-bottom))]`).
- Height: ~96px including padding. Scroll container above gets `padding-bottom: 128px` so the last accordion item never hides under the dock.

---

## 3. Sheet state behaviour

The sheet itself uses the L2 system. Two states matter:

### Peek (`peekFraction: 0.5` default, `0.92` for shop)
- D18 mandates `peekFraction: 0.92` for any `'shop'` / `'product'` sheet so the dock is in view from first open. Codified in `sheetSystem.ts` (shipped in PR #719).
- Even at the older 0.5 peek, Zone D would still be at the bottom of the visible sheet area — but the hero image would dominate. 0.92 is the doctrine default.

### Expanded
- Same layout, more height for Zone C.
- Zone B never grows past its `45dvh` cap.

### Drag-down
- Drag the sheet down to dismiss. Drag-up reaches expanded. Backdrop tap dismisses. No X button needed (D16).

---

## 4. What is NOT allowed

These patterns are doctrinally rejected:

- **Full-bleed product images.** No image render path that consumes the entire sheet viewport with no buy chrome on screen. If you find a state where this is possible, file it as a bug against D18.
- **Image-only "splash" screens** before the product detail loads. If the product is loading, show a skeleton with the dock already in place — never a full-screen image.
- **Buy chrome below an accordion or below the fold.** Buttons go in Zone D, period. Don't move ADD/BUY into the description section.
- **A second header that repeats the product name** ("PRODUCT" / "DETAILS" / etc.). The sheet's own title bar is the header.
- **Disabling the buy dock based on scroll position.** It does not fade out. It does not hide on scroll. It does not transition. It is always there.

---

## 5. Editorial drops (After Midnight, Legend Drop campaigns)

Editorial / poster-led product launches feel cinematic, which is in tension with the always-visible dock. The doctrine resolves the tension in favour of the dock:

- The editorial poster goes in Zone B at portrait aspect, capped at `45dvh`.
- A second editorial moment can live in Zone C (the description) as supporting media.
- The dock at Zone D is *the* surface the user touches when the poster does its job.

Editorial drives the emotion. The dock converts it.

---

## 6. Implementation contract (for the L2ShopSheet code)

1. Drop the "PRODUCT" header from the sheet title or wherever it appears. Sheet title bar carries product name only.
2. Wrap `<ImageGallery>` in a container with `max-height: 45dvh; overflow: hidden` (the gallery already uses `aspect-[1/1]` which respects max-height when supplied).
3. Confirm the action bar uses `absolute bottom-0` (it does today) with the gradient backdrop.
4. Confirm `pb-32` (or larger) on the scroll container so the last item never tucks under the dock.
5. Sheet registry: `peekFraction: 0.92` on every shop / product / preloved-product sheet (lube + apparel + preloved all route through the same component → one registry entry already covers them).

---

## 7. Cross-references

- **D07 Visual Hierarchy** — buy CTAs are the high-priority surface; they must read at glance.
- **D16 Surface Layer Doctrine** — Zone D dock lives in the sheet's own absolute layer; it does not conflict with the global shield/FAB stack.
- **D17 anti-funnel** — Phil's standing rule: HOTMESS is not a sales funnel. The dock being always visible is the opposite of a funnel — it lets the user buy whenever they decide to, with no drag-up gauntlet.
- **Drop Beacon Doctrine (D12)** — beacons that link to a product hand off to this sheet via `openSheet('product', { product })`. The dock contract applies to them too.

---

## 8. Acceptance test

A product sheet passes D18 if, and only if, at every moment from the first frame after open through any scroll position to the last frame before dismiss, the ADD TO BAG and BUY NOW buttons are both visible on the user's screen with readable contrast.

If a tester can produce a frame where one of those buttons is offscreen, hidden under the keyboard, or visually competing with the image to the point of being unreadable — the sheet fails D18 and the build does not ship.
