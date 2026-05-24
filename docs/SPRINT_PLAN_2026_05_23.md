# HOTMESS Globe — Sprint Plan (2026-05-23)

Builds on `docs/GLOBE_BUILD_PLAN_2026_05_23.md` §2.6/§2.8. Governance (Item 0) is complete and enforced, so **every ticket below runs under the new flow**: branch → preview → PR → review → merge to `main` → `main → production` promote. Phil is the merge/approval node; Cowork drives the code.

**Effort:** S ≤ half-day · M ≈ 1–2 days · L ≈ 3–5 days.
**Owner:** *Cowork* (autonomous code) · *Phil* (credential/dashboard/device — agent can't).

---

## SPRINT 1 — "SOS production-safe" (proposed: 2 weeks)

The mission: make live SOS dispatch trustworthy, then flip `VITE_SOS_ENABLED=true` behind a real go/no-go. SOS is currently flagged **off** (crisis-resources only), so none of this is actively-broken-in-prod — it's the prerequisite stack for turning live dispatch on.

### Already in flight (close these first)
| # | Item | State | Action |
|---|---|---|---|
| S1-0a | SOS FAB top-right (#289) | preview READY | Phil reviews preview → merge → promote |
| S1-0b | CHANNEL-chip fix (#290) | preview building | Phil merge → promote |
| S1-0c | Sprint brief §2.8 (#292) | open (docs) | Phil merge |
| S1-0d | data-retention cron | live; verify scheduled | 02:20 UTC task confirms + backfills |
| S1-0e | #284 pre-release audit | open, rebased | Close (superseded by new audit) |

### Build tickets (toward the flag flip)
| # | Ticket | Files / approach | Effort | Owner | Acceptance |
|---|---|---|---|---|---|
| **S1-1** | **Twilio delivery receipts** | New `api/safety/twilio-status.js` receiving Twilio `MessageStatus` callbacks; set per-message `statusCallback` in `api/notifications/channels/sms.js`; update `safety_delivery_log.delivered_at` by `provider_id` (Twilio SID). | M | Cowork | A real SMS to a valid number flips its `safety_delivery_log` row to `delivered_at` set within ~30s. |
| **S1-2** | **WhatsApp delivery receipts** | Extend `api/whatsapp/webhook.js` to handle Meta `statuses[]` (sent/delivered/read) → update `delivered_at` by `provider_id` (wamid). | M | Cowork (code) + Phil (subscribe Meta webhook to the `message_status` field — dashboard, may 2FA) | A WhatsApp send to a valid number records `delivered_at`. |
| **S1-3** | **Confirm `acked_at` path** | Verify `api/safety/ack/[id].js` populates `acked_at` end-to-end; fix gaps. (Ack-link flow already exists — this is verification + patch.) | S | Cowork | Clicking a contact ack link sets `acked_at`. |
| **S1-4** | **Trusted-contact E.164 validation** | Add `libphonenumber-js`; validate+normalise on save in `api/safety/test-contact.js` and the contacts insert path; mirror validation in the Safety contacts UI. | M | Cowork | Invalid numbers can't be saved; stored numbers are E.164. |
| **S1-5** | **Bad-number sweep** | One-off: validate all `trusted_contacts`, produce affected-user-ID list; flag those profiles so the app prompts re-entry next session. **No silent deletion.** | S | Cowork | Affected users get a re-entry prompt; nothing deleted. |
| **S1-6** | **Credential expiry monitoring** | Replace Meta WhatsApp token with a long-lived/system token (Phil); add `api/cron/cred-expiry-check.js` (+ `vercel.json` cron) warning ≥7 days before expiry for Meta / Twilio / Apple. | M | Phil (token swap) + Cowork (monitor) | Monitor alerts when any tracked credential is within 7 days of expiry. |
| **S1-7** | **Shake-SOS discoverability** | `useShakeSOS`/`ShakeSOS.tsx` exist but are buried. Surface the opt-in in onboarding (a BLK-06 step) and Profile → Safety settings. | M | Cowork | A new user sees the shake-SOS opt-in in onboarding and in settings. |
| **S1-8** | **Blurry-zoom stopgap** | Higher-res earth/night texture + camera zoom cap in `EnhancedGlobe3D` (interim before Sprint 2's Mapbox handoff). | S | Cowork | Deep zoom no longer degrades to a blurred sphere. |

### Sprint 1 gate — `VITE_SOS_ENABLED=true` go/no-go (Phil, real devices)
Only after S1-1…S1-7 pass. Two-device protocol from §2.8: trigger SOS via FAB on device A → SMS/WhatsApp/email lands on device B within 30s → `safety_delivery_log` shows `delivered_at` **and** `acked_at` → repeat via shake-SOS. **The flip itself gets its own dedicated review** (live safety-of-life duty-of-care). Doubles as the quarterly regression check.

### Suggested two-week shape
- **Week 1:** S1-0* close-outs · S1-1, S1-2, S1-3 (receipts) · S1-4, S1-5 (validation).
- **Week 2:** S1-6 (token + monitor) · S1-7 (shake discoverability) · S1-8 (blur stopgap) · then the device go/no-go.
- **Gating dependencies on Phil:** merges/promotes (ongoing), Meta token swap + webhook subscription (S1-2/S1-6), the device test (gate). Everything else is Cowork-autonomous.

---

## SPRINT 2 — "Local mode" (outline; ~2–3 weeks)

Fixes the most visible globe defect properly: deep zoom shows real streets/venues, not a sphere. `mapbox-gl@3.1.0` is already a dependency.

| # | Ticket | Depends on | Effort | Notes |
|---|---|---|---|---|
| **S2-1** | **Mapbox Local Mode** — globe→local-detail handoff | — | L | Foundational; this is the doc that resolves "zoom goes blurry" (replaces the S1-8 stopgap). |
| **S2-2** | **Mapbox Layer Stack** — layer order, privacy, perf contract | S2-1 | M | Per `GLOBE_MAPBOX_LAYER_STACK.md`. |
| **S2-3** | **Globe→Local Transition Animation** — camera choreography | S2-1, S2-2 | M | Per `GLOBE_GLOBE_TO_LOCAL_TRANSITION_ANIMATION_SYSTEM.md`. |
| **S2-4** | **Design-token foundation** (companion) | — | M | Re-derive the salvaged #279 tokens + **z-index scale** (`docs/DESIGN_TOKENS_FROM_PR279.md`) and wire to `src/lib/layerSystem.ts`; ban arbitrary `z-[NNN]`. This is what structurally prevents the FAB/sheet collision class. Do it alongside the Mapbox work since both touch layering. |

**Sprint 2 brief gets fully scoped at the end of Sprint 1**, per §2.6 — this is the outline so the runway is visible. Each ticket runs under the same preview→PR→merge→promote flow.

---

## Explicitly NOT in these sprints (parked, per audit §1.8 / build plan)
- Third-party integration health deep-dives (Mapbox tile quotas, Sentry rates, RadioKing) — revisit if S2 surfaces a quota issue once local mode is live.
- The 9 `MISSING · new build` docs beyond Mapbox (audio reactivity, beacon reputation, event archive, district editorial, weather, emotional rendering) — future sprints; menu in build plan §2.3.
- Partner-tier reconciliation — owned by the `hotmess-founding` thread, hands-off here.
