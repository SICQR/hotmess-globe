# Mapbox Local Mode — Build Plan (scoping)

**Status: SCOPING, not build.** Build starts Sprint 2 after Phil reviews. **Goal:** deep zoom shows real streets/venues instead of a blurred sphere — the proper fix for the P0 the #294 zoom-cap currently only masks.

## Current state (verified from code)
- Live globe = `react-globe.gl` (three.js), `EnhancedGlobe3D.jsx`, `earth-night.jpg` texture. Beacons = `pointsData`; `FoundingTierLayer` = three.js arcs/labels.
- **`mapbox-gl@3.1.0` is installed but UNUSED** — referenced only in comments (`FoundingTierLayer.tsx`, `useLiveTierData.ts`) as the planned "P1 engine." So local mode is greenfield: dependency present, zero integration.
- `useLiveTierData.ts` is explicitly **engine-agnostic** (a field `emissiveStrength` is already annotated "Mapbox only") — a clean seam to feed a Mapbox layer.
- Interim shipped: #294 clamps zoom to the city band so users can't reach the blur. That stopgap stays until Phase A lands.

## Dependencies
- `mapbox-gl ^3.1.0` — already in `package.json` (no new npm dep for core; `react-map-gl` wrapper optional — decide in Phase A).
- **NEW secret:** `VITE_MAPBOX_TOKEN` (public client token, URL-restricted to `hotmessldn.com` in the Mapbox dashboard). Phil action.
- **Style:** Mapbox default dark/night (fast) vs a custom HOTMESS dark style in Mapbox Studio (on-brand: bg `#050507`, gold `#C8962C`). Phil decision.
- **CSP:** add Mapbox origins to `vercel.json` (`api.mapbox.com`, `events.mapbox.com`, `*.tiles.mapbox.com`) in `connect-src`/`img-src`/`worker-src`.

## Architecture — two engines, one camera-state source of truth
- **Overview/city** (altitude > threshold): three.js globe (`EnhancedGlobe3D`) — unchanged.
- **Local/detail** (below threshold): mount a `mapbox-gl` map at the focused lat/lng; fade out the globe.
- A single focus/camera store (`lat/lng/zoom/mode`) drives both; crossing the threshold triggers the transition (the `GLOBE_TO_LOCAL_TRANSITION` doc).
- Beacons render in both engines from the **same** `useRealtimeBeacons`/`useLiveTierData` data (globe points ↔ mapbox circle/symbol layers).

## Integration points
- `EnhancedGlobe3D.jsx`: add a zoom-threshold trigger (`pointOfView().altitude < X`) → emit "enter local mode"; the #294 `minDistance` floor already marks that boundary.
- **New** `src/components/globe/LocalMapboxView.tsx`: the mapbox-gl map (dark style, lazy-init), beacon layers, "back to globe" control.
- **New** `LocalModeContext` (or extend `GlobeContext`): holds `mode (globe|local)`, focus, transition state.
- `FoundingTierLayer`: port arcs/tier labels to mapbox layers in local mode — or hide founding arcs in local v1 (Phase C parity).
- `useLiveTierData`: feed mapbox paint configs directly (already engine-agnostic).

## Supabase schema additions
- **None required for v1.** Beacons/venues already carry lat/lng (PostGIS), sufficient for street-level. Optional later: per-venue detail metadata / indoor maps — defer.

## Tile quota / cost
- Mapbox bills by web **map loads** (~50k/mo free, then tiered ~$5/1k).
- **Lazy-init mapbox only on threshold cross** (never on page load) so overview-only sessions don't count. At current scale (157 profiles, low DAU) → comfortably in free tier.
- Model at scale: `DAU × local-entries/session × 30`. Set a Mapbox **billing alert + budget cap** before enabling broadly.

## Phased rollout (feature-flagged: `VITE_LOCAL_MODE_ENABLED`, ship dark)
- **Phase A — read-only local map (core, the blur fix):** threshold trigger + `LocalMapboxView` (dark style) + beacons layer + back-to-globe. **L (3–5d).**
- **Phase B — transition polish:** globe→local camera choreography + fade. **M (1–2d).**
- **Phase C — parity:** founding arcs/tier visuals + clustering (`GLOBE_MAPBOX_LAYER_STACK`) + custom HOTMESS style. **M–L.**

## Risk register
| Risk | Mitigation |
|---|---|
| Dual-engine memory/perf (three.js + mapbox mounted together) | Unmount/freeze globe when in local mode; lazy-init mapbox |
| CSP breakage (Mapbox domains) | Add origins to `vercel.json`; verify on preview before promote |
| Tile-cost runaway | Lazy-load + billing alert + budget cap |
| Mobile perf (low-end phones) | Verify at 360/390px; raster fallback if needed |
| Token exposure (VITE_ token is client-side) | URL-restrict the token to `hotmessldn.com` in Mapbox dashboard |
| Brand mismatch (default styles ≠ HOTMESS dark/gold) | Custom Studio style in Phase C; default dark acceptable for v1 |

## Effort
- Phase A: **L** · Phase B: **M** · Phase C: **M–L**. Core (A+B) ≈ 1.5 weeks; full ≈ 2.5–3 weeks → matches the Sprint 2 outline in `docs/SPRINT_PLAN_2026_05_23.md`.

## Decisions for Phil (scoping review)
1. Mapbox token + (default dark vs custom HOTMESS style) — his account/dashboard.
2. Keep the #294 zoom-cap stopgap live until Phase A ships? (Recommend: yes.)
3. `react-map-gl` wrapper vs raw `mapbox-gl` — minor; recommend raw for control.
