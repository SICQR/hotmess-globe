# SUNDAY MORNING CHECKLIST — Founding Launch Eve

_Generated overnight Sat 17 → Sun 18 May 2026 by cofounder Claude._
_Read top to bottom over coffee, before anything else._

The Phase 3c provisioning pipeline is live and verified end-to-end.
Production DB had zero partner rows when this checklist was generated.
The webhook on `hotmess-founding` is signature-defended and reachable;
the portal verifier on `hotmess-globe` is HMAC-defended and reachable.

If something looks wrong before you reach "What to do if a partner pays
Sunday and provisioning fails" — read that section first.

---

## 1. Overnight payment monitor

What landed since you last checked? Run this against
`rfoftonnlwudilafhfkl` via Supabase MCP or the SQL Editor:

```sql
SELECT
  fpi.entity_name,
  fpi.tier_interest,
  fpi.paid_at,
  fpi.provisioned_at,
  b.id                       AS beacon_id,
  b.latitude,
  b.longitude,
  b.needs_manual_geocoding,
  b.globe_color,
  b.globe_pulse_type
FROM public.founding_partner_inquiries fpi
LEFT JOIN public.beacons b
  ON b.founding_partner_inquiry_id = fpi.id
WHERE fpi.created_at > now() - interval '12 hours'
ORDER BY fpi.created_at DESC;
```

What you want to see for every row that came in:

- `paid_at` populated → Stripe webhook fired
- `provisioned_at` populated → `provisionFoundingPartner()` ran
- `beacon_id` populated → beacon row inserted
- `latitude` + `longitude` populated → postcode geocoded cleanly
- `needs_manual_geocoding` = `false` → no Sunday-morning hand fixup

If `paid_at` is set but `provisioned_at` is `NULL` for any row, go to
section **6 — What to do if provisioning fails**.

---

## 2. Manual geocoding cleanup (only if needed)

Run this first to see if any beacons bounced:

```sql
SELECT
  b.id                            AS beacon_id,
  b.founding_partner_inquiry_id,
  fpi.entity_name,
  fpi.tier_interest,
  b.metadata->>'postcode_at_provision' AS postcode_attempted,
  b.created_at
FROM public.beacons b
JOIN public.founding_partner_inquiries fpi
  ON fpi.id = b.founding_partner_inquiry_id
WHERE b.needs_manual_geocoding = true
ORDER BY b.created_at DESC;
```

If the list is empty: skip this section.

If a row appears: look up the partner's actual postcode on
[postcodes.io](https://postcodes.io/) (paste it into the search box) or
Google Maps. Then update the beacon and clear the flag:

```sql
UPDATE public.beacons
SET geo_lat = <real_latitude>,
    geo_lng = <real_longitude>,
    city_slug = '<admin_district from postcodes.io, e.g. Hackney>',
    needs_manual_geocoding = false
WHERE id = '<beacon_id>';
```

`latitude`, `longitude`, and `city` are GENERATED columns — they mirror
`geo_lat`, `geo_lng`, and `city_slug` automatically. Do not try to UPDATE
the mirrors directly; Postgres will reject it with "cannot insert a
non-DEFAULT value into column".

---

## 3. Real-device QA — iPhone PWA + Android

Open hotmessldn.com on the actual device, not just on desktop. Tick
each:

- [ ] AgeGate persists across close/reopen (PWA backgrounded → foregrounded)
- [ ] Globe loads with tier sprites visible
- [ ] Anchor named labels visible at zoom altitude ≤ 1.5 (pinch in close)
- [ ] Tap a Chain pin → list-view sheet opens with the per-location rows
- [ ] 60-second pan/zoom session — watch the FPS counter (or just
      feel for jank). Should stay above ~45fps on iPhone 12+, no
      degradation as more sprites enter view
- [ ] Synthetic safety_event INSERT (see SQL below) → red expanding
      SOS ring appears on the globe within ~2s, auto-dismisses ≤5 min later
- [ ] Hard refresh during an animation (pull-down PWA reload) → no
      stuck spinner, no console errors, globe reloads to the same camera

Synthetic SOS INSERT (use a real lat/lng so the ring is visible):

```sql
INSERT INTO public.safety_events (event_type, latitude, longitude, source)
VALUES ('test_sos', 51.5074, -0.1278, 'sunday_qa_synthetic')
RETURNING id;
-- delete it after you've confirmed the ring rendered:
DELETE FROM public.safety_events WHERE source = 'sunday_qa_synthetic';
```

If any of these fail: take a screenshot, note the device + OS version,
add to the launch-blockers doc rather than fixing in-place.

---

## 4. Env var sanity check

Both projects should be intact. From a terminal:

```bash
vercel env ls --project hotmess-founding \
  --team team_ctjjRDRV1EpYKYaO9wQSwRyv

vercel env ls --project hotmess-globe \
  --team team_ctjjRDRV1EpYKYaO9wQSwRyv
```

Spot-check that these keys are present (don't print values):

**hotmess-founding** (Next.js, payment + provisioning side):

- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_FOUNDING_VENUE` ... `_CHAIN` (all 6)
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `PORTAL_COOKIE_SECRET` (must match hotmess-globe — see below)
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

**hotmess-globe** (Vite + serverless API, portal + globe side):

- `SUPABASE_URL` / `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- `PORTAL_COOKIE_SECRET` (must match hotmess-founding)
- `STRIPE_SECRET_KEY` (used by globe-side checkout flows)

Cross-repo invariant: `PORTAL_COOKIE_SECRET` MUST be identical across
both projects. If they drift, every welcome-email link will return 401.
The webhook on hotmess-founding mints with one value; the verifier on
hotmess-globe verifies with another. Mismatch → no portal access.

---

## 5. Token rotation status check (Phil's hand only)

Rotate any of these that have been pasted into chat or shipped as
plaintext anywhere — most have been. Do it in this order so nothing
catastrophic breaks mid-rotation:

1. **Anthropic API key** — anthropic.com/console/keys
   - Safe to rotate first; nothing in production depends on it.

2. **GitHub PAT** — github.com/settings/tokens
   - After rotating: update `GH_TOKEN` in GitHub Actions secrets
     (if any), update local `~/.gitconfig` or `gh auth login`.

3. **Supabase service role key** — Supabase Studio → Project
   Settings → API → Service Role Key → Reveal/Rotate
   - After rotating: update `SUPABASE_SERVICE_ROLE_KEY` in BOTH
     Vercel projects (`hotmess-founding` + `hotmess-globe`).
   - Trigger a redeploy on both (push an empty commit, or hit
     the redeploy button on the latest production deployment).

4. **Vercel token (`vcp_...`)** — vercel.com/account/tokens
   - After rotating: update anywhere you have CI/scripts using
     it. Cowork scripts in `.cowork/` carry the old value
     hard-coded — rotate scripts AFTER the token rotation.

5. **Stripe live keys** — dashboard.stripe.com/apikeys
   - WARNING: rotating the live secret key invalidates
     in-flight checkout sessions. Don't do this during a
     business-hour window. The webhook signing secret can be
     rotated without invalidating checkouts.
   - If you rotate the webhook secret: update
     `STRIPE_WEBHOOK_SECRET` on hotmess-founding immediately
     after, then re-send a test event from the Stripe dashboard
     to confirm the new signature verifies.

6. **Stripe account password** — dashboard.stripe.com/settings/user
   - Change last. After this, log back in via 2FA and confirm
     you can still see the webhook endpoint + the products.

---

## 6. What to do if a partner pays Sunday and provisioning fails

The webhook is replay-safe via `founding_partner_inquiries.provisioned_at`.
If `paid_at IS NOT NULL AND provisioned_at IS NULL` for any row, the
partner has paid but their beacon was never inserted.

**Option A — Stripe replay (cleanest):**

1. dashboard.stripe.com → Developers → Webhooks
2. Click the production endpoint
   (`https://hotmess-founding.vercel.app/api/stripe/webhook`)
3. Scroll the recent events list, find the failed
   `checkout.session.completed` for that customer
4. Click "Resend"
5. Wait 5–10 seconds, re-run the section-1 monitor query
6. Confirm `provisioned_at` is now set

**Option B — Manual provisioning call (if Stripe replay won't fire):**

From a terminal in the hotmess-founding repo, with `.env.local`
populated, run a one-off node script that mirrors the webhook's call to
`provisionFoundingPartner()`. The synthetic test harness from yesterday's
build is a good template:

```bash
cd ~/Downloads/hotmess-founding
# 1. Build the lib/ to dist-test/ if not already built:
./node_modules/.bin/tsc \
  --outDir dist-test --rootDir . --target es2022 \
  --module nodenext --moduleResolution nodenext \
  --esModuleInterop --skipLibCheck --strict \
  lib/portal-token.ts lib/geocode.ts lib/founding-tier-visuals.ts \
  lib/founding-provisioning.ts lib/email-templates.ts lib/tiers.ts

# 2. Run the manual provisioning:
node --input-type=module -e "
  import fs from 'node:fs';
  for (const l of fs.readFileSync('.env.local','utf8').split(/\\r?\\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)\$/i.exec(l);
    if (m) process.env[m[1]] = m[2].replace(/^\"(.*)\"\$/, '\$1');
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { provisionFoundingPartner } = await import('./dist-test/lib/founding-provisioning.js');
  const INQUIRY_ID = 'PASTE_THE_INQUIRY_UUID_HERE';
  const POSTCODE = 'PARTNER_POSTCODE';
  const { data: inq } = await supabase
    .from('founding_partner_inquiries').select('*').eq('id', INQUIRY_ID).single();
  const r = await provisionFoundingPartner({
    supabase, inquiryId: inq.id, tier: inq.tier_interest, entityName: inq.entity_name,
    session: { id: inq.stripe_session_id,
      customer_details: { address: { postal_code: POSTCODE, country: 'GB' } } },
  });
  console.log(JSON.stringify(r, null, 2));
"
```

`provisionFoundingPartner()` is idempotent on `provisioned_at`, so
re-running it is safe.

**Option C — Email Phil immediately if neither A nor B recovers it.**

The partner has paid but isn't on the platform. Treat that as a P0:

- Reply to the customer from `founding@hotmessldn.com` within the
  hour: "Payment received and confirmed, we've got you. Your portal
  link is on its way within a few hours while I make sure everything's
  perfect — I'm on this personally."
- Add their inquiry id to a launch-day-incidents log so it doesn't
  get lost.
- Phil works the recovery in person from his desk before anything else.

---

## Footer

If this checklist runs clean: Monday morning Phil opens a coffee, opens
the section-1 query, watches the first 2–3 real partners come through
live, and only intervenes if a row stays at `provisioned_at IS NULL`
for more than a minute.

Stay sharp. Care over campaign.
