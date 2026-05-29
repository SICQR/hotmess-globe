# Doctrine 14 — Routing as Continuity

**Locked 2026-05-29 — Phil Gizzie.**
Status: doctrine-only at lock. No code shipped. Implementation slices follow this doctrine, not the other way around.

Prerequisite: Doctrine 12 (Drop Beacon & the Four Signal Axes) must be in production before D14 implementation begins. Route is the fourth signal axis — it cannot be written on muddy signal semantics. As of this lock, D12 is live on `514d781ace9b`.

---

## 0. The rule

> **Never eject the user from the night.**

Everything in this doctrine is a consequence of that rule. When the rule and a feature conflict, the rule wins.

Phil-level sentence:

> "HOTMESS is carrying me through the city."

That is the test. A user who taps Directions, walks ten minutes, and arrives at their destination must never feel they *left* HOTMESS to travel. Movement is part of the night, not a pause from it.

## 1. What HOTMESS routing is NOT

Negative space first. These are the drifts the doctrine forbids:

1. **Not logistics software.** No commuter-grade optimisation. No multi-modal trip planners with infinite settings.
2. **Not a rideshare clone.** No fare estimates. No driver pings. No "your driver is 3 minutes away."
3. **Not a commuter app.** No "last train at 00:43" certainty claims. (See Sacred Invariant #6 — never overclaim transit accuracy we can't substantiate.)
4. **Not a delivery-app UX.** No ETA-as-headline. No "track your route" anxiety loops. No notifications that shame.
5. **Not surveillance routing.** No always-on social graph. No "5 friends spotted on route" by default. No history of every path the user took.
6. **Not quantified social tracking.** No "you walked 12.4km in nightlife last week" gamification. No streaks. No leaderboards.

If a routing feature drifts toward any of the above, it is wrong by definition.

## 2. What HOTMESS routing IS

Positive space, in the same order:

1. **Continuity.** The thread from preview → commit → route → movement → arrival is one emotional arc. (D13: Spatial Continuity Doctrine.)
2. **Atmosphere.** Routes carry the texture of the city around them — beacon density, time of day, weather, sound.
3. **Movement.** A route is a *moving* signal, not a static plan. The fourth signal axis after Person, Place, and Event.
4. **Care.** Aftercare, safety beacons, trusted contacts surface *on* the route, not in a separate Care section.
5. **Nightlife flow.** Routes understand that 2am and 2pm are different cities. Night Route is not Day Route with the lights off.
6. **Emotional geography.** The user's path through the city is a felt thing. The route line reflects what's happening, not just what's optimal.

## 3. The five modes — and their copy

The Drive / Walk / Transit triad is replaced. Each mode answers a different emotional question, not a different transport question.

| Mode | Subtitle | When the user reaches for it |
|---|---|---|
| **Walk** | "12 min walk" | Default — quiet, simple, present. |
| **Fastest** | "7 min by bike" | The user has somewhere to be and means it. |
| **Night Route** | "Safer late-night route" | After dark — the city is different and the route should be too. |
| **Follow The Signal** | "Passing through active nightlife" | The user wants the night, not the destination. |
| **Quiet Route** | "Lower-density path home" | The user has had enough — route home through the calm streets. |

Phil constraint: mode chips reframe first, routing-algo rewrite later. Renaming "Transit" to "Night Route" *psychologically* changes the experience even before the routing engine becomes aware of nightlife density. Slice 1 ships the renames. Slice 4 ships the algorithm.

## 4. Atmospheric routing — the route is a moving signal

The route line itself carries texture:

- **Beacon glow on path.** The line glows brighter where it passes near active beacons. Cluster-density bleed onto the polyline.
- **Care pins on-route.** Aftercare beacons (D12 intent: `aftercare`) surface as pins along the path, not as a separate layer.
- **Trusted venues on-route.** Curated district beacons (D12 metadata: `curated`) light up when the route passes within their pull radius.
- **Late-night food on-route.** Same pattern, gated on time-of-day.
- **Signal-building / signal-thinning text cues.** "Signal building ahead" / "quiet after this block" — anticipatory copy (D11), never certainty claims.

What we do NOT do here:
- We do not claim live venue density we don't have. If we don't know how many people are at the venue, we don't say a number.
- We do not show real-time crowd counts. Beacon presence is enough. Aggregate signal, not surveillance.

## 4.5. The density trap — anti-gamification clause

Once routing renders beacon density along the path, the next failure mode is treating density itself as the score. That drift produces:

- **"Busy route = good route"** as an implicit user heuristic.
- **Density addiction** — users routing toward crowds because the line glowed brighter, not because they wanted to be there.
- **Heat-chasing behaviour** — chasing whichever corridor pulses strongest.
- **Optimisation loops** — the user starts treating their own night as a metric to maximise.

Locked rule:

> **HOTMESS does not rank human value by density.**

Doctrine consequences:

- **Density is texture, never a leaderboard.** The route may glow brighter near active beacons. It must never label that "Top Corridor," "Hottest Route," "Most Active Path," or any equivalent ranking copy. Brightness is mood, not score.
- **No streaks, no totals, no nightlife distance counters.** "You walked 12.4km in nightlife last week" is the failure mode. Movement is not measured.
- **A quiet route is not a lesser route.** Quiet Route and Follow The Signal are equal modes. The UI must never imply one is "more HOTMESS" than the other.
- **No suggested routes ranked by density.** When the user is offered alternatives, the alternatives are framed by mood ("quieter back streets," "passes through more nightlife"), never by score ("busier route," "more active path").
- **Curated atmosphere never reads as winning.** District editorial pins (D12 metadata.curated) light up where they pull the route gently, never as "you should be here instead."

This clause reinforces Sacred Invariant #6 (the system never pretends activity) by closing the inverse drift: the system also never *rewards* activity. Care, atmosphere, and continuity are the values. Density is one of several textures that serves them.

If a routing PR introduces ranking, scoring, leaderboarding, or streak language anywhere on the movement surface, it violates this clause and does not ship.

## 5. Care as spatial property of the city

This was the unlock during the D14 conversation: **care is no longer a section of the app. It is a spatial property of the city.**

Doctrine consequences:

- Aftercare beacons, safety beacons, and trusted-venue pins are all on the route layer by default. The user does not have to *go to* Care to know it's nearby. The route surfaces it.
- "Active corridor + aftercare 5 min off-route" is the differentiator. Density paired with care, never density alone.
- The Care Suite (#288) remains as a home for explicit care actions. The Route layer is where care becomes *ambient*.

Sacred Invariant #7 still applies: ≤200m fuzz on all locations the route surfaces, including care pins.

## 6. Social routing — gated, opt-in, mutual-only

"3 people heading toward Vauxhall" is the moat *and* the privacy minefield. There is no middle ground. Therefore:

**Doctrine rule:** social routing is OFF by default, opt-in per route (not globally), and visible only between mutual-boo connections.

Specifics:
- The user must tap "share this route" on a per-route basis to expose it to anyone. No global "share my movement" toggle.
- Visibility is restricted to mutual-boo connections (D12 visibility-state architecture + #287 boo-first chat gate).
- The exposure terminates when the user arrives, exits the route, or after 4 hours — whichever is sooner. Routes never persist as social-graph history.
- Receivers see "Phil is heading toward Vauxhall" with the same ≤200m fuzz that applies everywhere else. No live GPS dot.

What this is NOT: an always-on friend-finder. Friend-finder ≠ HOTMESS. Movement is consensual, ephemeral, and route-scoped.

## 7. Safety layer — consent first, then features

Safety lives on the route, not adjacent to it. But every safety feature is consent-gated.

- **Escort mode.** User opts in per route. Shares route + ETA + start/end times with one trusted contact (D12 trusted_contacts). Auto-terminates on arrival.
- **Check-in timers.** User opts in per route. Quiet ping at midpoint and arrival.
- **"Got home?" prompt.** User opts in once globally (or per route). One soft prompt, no shame, no escalation if ignored. (The boundary where care becomes surveillance if frequency is wrong.)
- **One-tap SOS from nav.** Already wired (#216 cost-cap, #196 Telegram dispatcher). The Route view surfaces the SOS shield in the same right-rail position as everywhere else (D13 spatial continuity).
- **Route expiry.** Routes auto-expire after their declared duration. No undead routes lingering in the social graph.

What we do NOT do:
- We do not assume the user wants check-ins. Default off.
- We do not surveil. "Got home?" is one prompt, not five.
- We do not categorically claim confidentiality of crisis paths. (Per the same wellbeing principle that applies to crisis resources: never overpromise on involvement-of-authorities or confidentiality.)

## 8. Audio bleed + arrival ritual

Two pieces that round the doctrine out:

**Audio bleed.** If HOTMESS RADIO is on a corridor the route passes through (Soho mix in Soho, etc.), the radio bleeds softly under the route. Atmosphere = sound, not just visuals. The route view is not silent unless the user has muted explicitly.

**Arrival ritual.** When the route ends, the app does not go silent. The destination beacon (if any) surfaces. Nearby crowd presence appears. Aftercare within walking radius is named. Arrival becomes a continuation of the night, not its end.

Both of these reinforce the rule in Section 0: never eject the user from the night.

## 9. Slice sequencing

D14 implementation is six slices, not a sprint. Each is small enough to ship and verify before the next.

| Slice | What | Size |
|---|---|---|
| **1** | Mode chips reframe — rename Drive/Walk/Transit to Walk/Fastest/Night Route + soft copy under each. + Aftercare beacons on the route line (D12 data already present). | small, 1 PR |
| **2** | Atmospheric overlay — route glow follows beacon density along the path. Uses data we already have. | medium, 1 PR |
| **3** | Audio bleed + arrival ritual — radio under route, destination presence on arrival. | medium, 1 PR |
| **4** | Quiet Route algorithm — real routing logic that avoids high-density corridors. Biggest engineering slice. | large, multi-PR |
| **5** | Social routing — opt-in per route, mutual-boo gated. Privacy spec PR before code PR. | large, gated |
| **6** | Safety layer — escort mode, got-home, SOS-from-nav. May spawn D15. | large, gated |

Slices 1–3 can ship in Q2. Slices 4–6 span Q3.

Do not bundle slices. Each one is a doctrine pressure-test of D14 in isolation.

## 10. Forbidden moves

Cross-linked from D13 (Spatial Continuity) and the negative space in Section 1:

- **Do not embed Google Maps.** (Constraint #313.) Even if shorter. Even if "just temporary." InAppDirections is not Google Maps.
- **Do not navigate to an external maps app.** Routes do not eject the user to Apple Maps, Citymapper, or any other surface.
- **Do not break the visual thread between the route and the rest of the app.** Same dark surface. Same gold #C8962C. Same right-rail. Same sheet semantics (D13 unified peek+expand).
- **Do not claim transit certainty we can't substantiate.** No "last train at X" unless we partner with a real-time transit API. Until then: anticipatory copy ("trains thinning out") not certainty claims.
- **Do not bolt routing onto Beacon.** Route is the fourth signal axis (D12). It has its own creation surface, its own data shape, its own RLS. It is not a beacon variant.

## 11. The company-level sentence

> "The user should never feel: 'I left HOTMESS to travel.'
> They should feel: 'HOTMESS is carrying me through the city.'"

That is the line. Every routing PR must pass that test before it merges.

## Cross-references

- `docs/doctrine/11-arrival-state-doctrine.md` — Pulse Doctrine (probability + momentum, not occupancy). Routing inherits this: route atmosphere is anticipatory, never certainty-claiming.
- `docs/doctrine/12-drop-beacon-doctrine.md` — Four signal axes (Person / Place / Event / Route). Route is the fourth axis. This doctrine cannot be implemented until D12 is locked, which it is as of `514d781ace9b`.
- `docs/doctrine/13-spatial-continuity-doctrine.md` — Four primitives (preview → commit → route → movement). D14 is the route + movement primitives expressed at city scale.
- `docs/doctrine/07-visual-hierarchy.md` — Monetisation never overrides relational truth. Routing is never monetised by surfacing paid placements *on* the route.
- Sacred Invariant #6 — System never pretends activity. No fake density, no fake transit certainty, no fake friend-on-route data. Section 4.5 (the density trap) is the inverse drift of the same invariant: the system never *rewards* activity either.
- Sacred Invariant #7 — No exact tracking, ≤200m fuzz. Inherited by all route-surfaced location data including care pins and social-routing exposures.
- Constraint #313 — InAppDirections must not become Google Maps. Doctrine ratifies and extends this.

— end doctrine —
