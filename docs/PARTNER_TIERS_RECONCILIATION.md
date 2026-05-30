# Partner Tiers Reconciliation

**Status: PENDING** — owned by the `hotmess-founding` thread. The globe side does **not** change tier tables until this resolves.

## The conflict
`docs/GLOBE_PARTNER_SUBSCRIPTION_TIERS.md` proposes a partner-subscription scheme that contradicts two tier systems already live in Supabase (`rfoftonnlwudilafhfkl`):

- **`membership_tiers`** (member tiers): `mess` £0 / `hotmess` £7.99 / `connected` £19.99 / `promoter` £44.99 / `venue` £99.99
- **`venue_beacon_tiers`** (partner/venue tiers): `community` £0 / `standard` £29 / `pro` £79

Plus related: `membership_annual_pricing`, `venue_subscriptions`, and the `hotfix/partner-beacons-tier-discriminator` branch.

## Resolution lands here
When the founding thread settles the partner-tier model, the **globe-side reconciliation** is recorded in this file:
- which table(s)/names are canonical,
- any migration or rename,
- what (if anything) `GLOBE_PARTNER_SUBSCRIPTION_TIERS.md` should be edited to match.

Until then: **do not introduce a parallel partner-tier scheme on the globe side.** `docs/GLOBE_DOCS_INDEX.md` points here from the `contradicts` row.
