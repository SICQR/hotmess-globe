# Globe Partner Subscription Tiers

Purpose: define subscription architecture, entitlements, limits, governance, verification relationships, and monetisation boundaries for HOTMESS Globe partners.

This document governs:

- vendor subscriptions;
- creator subscriptions;
- venue partner plans;
- event operator access;
- analytics entitlements;
- boost eligibility;
- district capabilities;
- moderation-linked restrictions.

The subscription system exists to:

- support sustainable operations;
- support independent culture;
- support venue infrastructure;
- unlock operational tooling;
- reduce spam and abuse.

NOT to:

- create social hierarchy;
- create pay-to-win visibility;
- gate safety;
- gate accessibility;
- gamify nightlife.

---

# Core philosophy

Subscriptions should feel like:

```txt
professional infrastructure access
```

NOT:

```txt
buying dominance over the city
```

Subscriptions unlock:

- workflow tools;
- campaign controls;
- integrations;
- analytics;
- operational capacity.

Subscriptions must NEVER unlock:

- moderation immunity;
- trust immunity;
- safety override;
- district takeover;
- hidden promotion;
- fake popularity.

---

# Canonical partner tiers

```txt
Community
Creator
Venue
Partner
City
Enterprise
```

Tiers should feel:

- operational;
- calm;
- non-elite;
- non-gamified.

---

# Community tier

Purpose:
- lightweight access for small operators.

Examples:
- independent hosts;
- popup organisers;
- small collectives;
- emerging creators.

Capabilities:

- limited scheduled beacons;
- basic analytics;
- limited boosts;
- basic profile customisation;
- simple event management.

Restrictions:

- smaller quotas;
- shorter analytics retention;
- limited integrations.

---

# Creator tier

Purpose:
- support DJs, artists, hosts, labels, and cultural contributors.

Capabilities:

- creator analytics;
- district visibility insight;
- merch/drop integrations;
- HOTMESS RADIO integrations;
- creator profile enhancements;
- campaign scheduling;
- moderate boost access.

Ideal for:

- DJs;
- labels;
- nightlife personalities;
- radio collaborators.

---

# Venue tier

Purpose:
- operational tooling for nightlife spaces.

Capabilities:

- multi-event scheduling;
- queue analytics;
- guestlist integrations;
- accessibility management;
- moderation dashboard;
- realtime district insight;
- ticket integrations;
- venue verification workflow.

Optional:

- multi-room support;
- venue staff accounts;
- district campaign management.

---

# Partner tier

Purpose:
- larger operational campaigns and ecosystem integrations.

Capabilities:

- advanced analytics;
- multi-campaign orchestration;
- sponsorship tooling;
- district activations;
- partner API integrations;
- campaign reporting exports;
- priority operational support.

Designed for:

- festivals;
- large collectives;
- city-wide nightlife projects;
- major partner campaigns.

---

# City tier

Purpose:
- district-scale orchestration.

Capabilities:

- district heat oversight;
- city activation tooling;
- multi-venue orchestration;
- transport coordination integrations;
- accessibility overlays;
- moderation escalation tools;
- emergency coordination support.

City tier must remain:

- heavily governed;
- moderation-bound;
- non-commercially dominant.

---

# Enterprise tier

Purpose:
- large-scale infrastructure partnerships.

Examples:
- festivals;
- transport networks;
- major event organisations;
- large venue groups.

Capabilities:

- enterprise integrations;
- SLA support;
- advanced reporting;
- realtime operational exports;
- large-scale event coordination.

Enterprise access must NEVER:

- override safety systems;
- suppress independents;
- dominate district visibility.

---

# Entitlement categories

| Category | Examples |
|---|---|
| Beacon limits | scheduled/live quota |
| Analytics | retention and detail |
| Integrations | ticketing/radio/API |
| Profiles | venue and creator tools |
| Teams | multi-user access |
| District tools | campaigns and overlays |
| Boosts | eligibility and limits |
| Support | operational assistance |

---

# Beacon quota policy

Quotas may depend on:

- subscription tier;
- trust score;
- moderation state;
- city saturation;
- verification state.

Quota systems should:

- reduce spam;
- preserve map readability;
- protect realtime performance.

Quota systems must NEVER:

- suppress independent culture;
- create monopoly visibility.

---

# Boost eligibility policy

Boost access may vary by:

- verification;
- trust standing;
- subscription tier;
- district saturation;
- moderation history.

Boost systems must obey:

- density budgets;
- disclosure policy;
- accessibility policy;
- anti-pay-to-win rules.

Subscriptions must NEVER grant:

- unlimited map dominance;
- giant markers;
- hidden boosting;
- moderation bypass.

---

# Verification relationship

Verification and subscriptions are related but separate.

A paid subscription does NOT guarantee:

- verification;
- trust;
- recommendation priority;
- moderation protection.

Verification depends on:

- legitimacy;
- trust history;
- moderation state;
- operational consistency.

---

# HOTMESS RADIO integrations

Eligible tiers may access:

- live mentions;
- show integrations;
- countdown placements;
- lineup integrations;
- sponsored takeovers;
- artist collaboration tools.

Radio integrations should remain:

- editorially governed;
- culturally aligned;
- non-spammy.

---

# Analytics entitlements

Analytics depth may vary by tier.

Examples:

| Tier | Analytics retention |
|---|---|
| Community | short-term |
| Creator | medium-term |
| Venue | operational retention |
| Partner | extended reporting |
| Enterprise | long-term exports |

Analytics must remain:

- aggregate;
- GDPR-compliant;
- privacy-safe.

Forbidden analytics:

- exact user GPS;
- recovery participation;
- Help/SOS behaviour;
- Ghosted chat contents;
- movement replay.

---

# Accessibility policy

Accessibility tools must NOT become premium-only.

All tiers should support:

- accessibility tags;
- calm-space metadata;
- reduced stimulation compatibility;
- basic accessibility visibility.

Higher tiers may unlock:

- operational accessibility analytics;
- district accessibility coordination.

---

# Care and safety policy

Safety systems are NEVER monetised.

Forbidden:

- premium SOS;
- premium Help visibility;
- paid emergency priority;
- paywalled safety features.

Care integrations must remain:

- subtle;
- privacy-safe;
- non-exploitative.

---

# Team and organisation access

Higher tiers may support:

- multiple staff accounts;
- permissions;
- role-based access;
- moderation roles;
- finance access;
- campaign editors.

Suggested roles:

```txt
Owner
Manager
Promoter
Moderator
Finance
Support
Analyst
```

---

# Billing philosophy

Billing should feel:

- transparent;
- calm;
- predictable.

Avoid:

- dark patterns;
- manipulative upsells;
- hidden spend;
- fake urgency.

Supported billing models MAY include:

- monthly;
- annual;
- campaign-based;
- event-based;
- district activation packages.

---

# Subscription lifecycle

Canonical lifecycle:

```txt
Trial
→ Active
→ Grace Period
→ Restricted
→ Expired
→ Archived
```

Downgrade behaviour should:

- preserve historical analytics where possible;
- reduce quotas gracefully;
- avoid destructive lockouts.

---

# Abuse and enforcement

Abusive partners may:

- lose boost eligibility;
- lose analytics access;
- lose district tooling;
- lose campaign rights;
- be suspended.

Examples:

- spam campaigns;
- ticket scams;
- fake events;
- abusive moderation history;
- disclosure violations.

---

# Suggested Supabase tables

```txt
partner_subscriptions
partner_subscription_tiers
partner_subscription_events
partner_entitlements
partner_usage_limits
partner_billing_accounts
partner_invoices
partner_campaign_quota_usage
partner_boost_entitlements
partner_team_members
partner_role_permissions
```

Related existing tables:

```txt
beacon_boosts
vendor_profiles
vendor_campaigns
vendor_trust_scores
venue_verification
```

---

# Suggested implementation targets

```txt
src/lib/subscriptions/PartnerSubscriptionService.ts
src/lib/subscriptions/PartnerEntitlementEngine.ts
src/lib/subscriptions/PartnerQuotaEngine.ts
src/lib/subscriptions/PartnerBillingService.ts
src/lib/subscriptions/PartnerDowngradeService.ts
src/lib/subscriptions/PartnerVerificationGuard.ts
src/lib/subscriptions/PartnerBoostEligibility.ts
src/components/vendor/SubscriptionPanel.tsx
src/components/vendor/BillingPanel.tsx
src/components/vendor/QuotaUsageMeter.tsx
```

---

# Accessibility requirements

Subscription UI must support:

- reduced motion;
- keyboard navigation;
- clear pricing presentation;
- screen readers;
- calm visual hierarchy.

Pricing tables should:

- avoid manipulation;
- avoid visual overload;
- present limitations honestly.

---

# Acceptance criteria

The subscription system succeeds when:

- subscriptions support infrastructure without dominating culture;
- independent operators remain viable;
- boosts remain restrained;
- safety stays universal;
- accessibility remains available to all tiers;
- analytics remain privacy-safe;
- subscription tooling reduces operational chaos;
- monetisation feels useful rather than extractive;
- HOTMESS earns sustainably without turning the Globe into ad-tech territory.
