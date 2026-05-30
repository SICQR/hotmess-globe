# Globe Vendor Team Permissions And Moderation

Purpose: define team access control, moderation authority, operational roles, escalation governance, audit systems, and partner safety boundaries for HOTMESS Globe.

This document governs:

- vendor organisations;
- team permissions;
- role-based access;
- moderation delegation;
- venue operations;
- campaign publishing rights;
- district coordination access;
- trust-linked enforcement.

The system exists to:

- reduce operational chaos;
- support collaborative nightlife operations;
- protect users and venues;
- prevent abuse;
- create accountable moderation.

WITHOUT creating:

- hidden power systems;
- unsafe admin access;
- surveillance tooling;
- unchecked moderation authority.

---

# Core philosophy

Team systems should feel:

```txt
structured, calm, accountable, operational
```

NOT:

```txt
chaotic nightclub backoffice software
```

Permissions exist to:

- protect operations;
- separate responsibilities;
- reduce mistakes;
- improve safety.

Permissions do NOT exist to:

- create social hierarchy;
- create invisible power;
- bypass moderation;
- suppress communities.

---

# Canonical organisation hierarchy

```txt
Organisation
→ Team
→ Role
→ Permission
→ Action
→ Audit Event
```

All sensitive actions must:

- map to permissions;
- generate audit events;
- remain reviewable.

---

# Canonical organisation types

Examples:

- venues;
- collectives;
- radio operators;
- popup vendors;
- promoters;
- festivals;
- district operators;
- partner organisations.

Organisation systems should:

- scale from small collectives to large festivals;
- remain understandable.

---

# Canonical roles

```txt
Owner
Administrator
Manager
Promoter
Moderator
Door Staff
Finance
Support
Analyst
Accessibility Coordinator
Radio Coordinator
```

Roles should:

- remain operational;
- avoid clout language;
- avoid gamified hierarchy.

---

# Owner role

Highest operational authority.

Capabilities:

- billing management;
- subscription control;
- team invitations;
- role assignment;
- organisation deletion;
- escalation access.

Restrictions:

- cannot bypass platform moderation;
- cannot erase audit history;
- cannot disable safety systems.

---

# Administrator role

Capabilities:

- team management;
- venue management;
- campaign management;
- moderation review;
- analytics access.

Restrictions:

- limited billing authority;
- cannot remove organisation owners.

---

# Manager role

Capabilities:

- event management;
- queue operations;
- venue coordination;
- ticket management;
- accessibility updates.

Ideal for:

- venue managers;
- event coordinators.

---

# Promoter role

Capabilities:

- create beacons;
- schedule campaigns;
- manage guestlists;
- publish events;
- manage lineup content.

Restrictions:

- limited moderation access;
- limited billing access.

---

# Moderator role

Purpose:

- operational trust enforcement.

Capabilities:

- review reports;
- hide unsafe content;
- freeze campaigns;
- escalate abuse;
- manage community safety.

Moderators must NEVER:

- access Ghosted chats;
- access precise GPS history;
- bypass platform enforcement.

---

# Door staff role

Capabilities:

- ticket scanning;
- guestlist validation;
- queue updates;
- capacity updates;
- accessibility queue support.

Restrictions:

- no billing access;
- no analytics exports;
- no moderation authority.

---

# Finance role

Capabilities:

- invoices;
- payouts;
- refunds;
- subscription review;
- revenue analytics.

Restrictions:

- no moderation access;
- no community messaging;
- no beacon publishing.

---

# Support role

Capabilities:

- user support;
- event support;
- accessibility coordination;
- issue resolution.

Restrictions:

- no financial access;
- limited moderation authority.

---

# Analyst role

Capabilities:

- aggregated analytics;
- district reporting;
- campaign insight;
- export generation.

Restrictions:

- no personal movement data;
- no moderation authority.

---

# Accessibility coordinator role

Purpose:

- maintain accessibility integrity.

Capabilities:

- accessibility metadata;
- calm-space updates;
- queue accessibility coordination;
- accessibility route publishing.

Accessibility coordinators should:

- improve inclusion;
- reduce operational friction.

---

# Radio coordinator role

Capabilities:

- lineup sync;
- takeover coordination;
- sponsor reads;
- broadcast-event linking;
- radio campaign publishing.

Restrictions:

- no moderation override;
- limited billing access.

---

# Permission categories

| Category | Examples |
|---|---|
| Organisation | roles/invites |
| Campaigns | create/edit/delete |
| Beacons | publish/boost |
| Events | scheduling |
| Tickets | scan/refund |
| Analytics | exports |
| Billing | invoices/payouts |
| Moderation | review/escalate |
| Accessibility | route metadata |
| Radio | broadcast coordination |

---

# Permission granularity

Permissions should support:

```txt
Read
Write
Publish
Approve
Escalate
Export
Delete
Suspend
```

Sensitive actions should:

- require elevated permissions;
- require audit logs;
- optionally require multi-step confirmation.

---

# Audit logging

All sensitive actions must generate:

- timestamp;
- actor;
- organisation;
- action type;
- affected entity;
- moderation reason.

Examples:

- beacon deletion;
- refund issuance;
- role changes;
- moderation escalation;
- campaign suspension.

Audit logs should:

- remain immutable;
- support investigations;
- support abuse review.

---

# Moderation escalation model

Canonical flow:

```txt
Report
→ Review
→ Temporary Restriction
→ Escalation
→ Resolution
→ Audit Archive
```

Escalation systems should:

- remain accountable;
- avoid hidden punishment;
- support appeals.

---

# Campaign moderation

Moderators may:

- freeze campaigns;
- suppress unsafe boosts;
- remove fraudulent events;
- suspend spam activity.

Moderation should consider:

- trust score;
- spam velocity;
- ticket fraud;
- repeated reports;
- disclosure violations.

---

# Venue moderation

Venue operators may:

- manage queues;
- manage guestlists;
- manage venue metadata;
- report unsafe behaviour.

Venue operators may NOT:

- hide platform safety escalations;
- suppress abuse reporting;
- access protected safety logs.

---

# Trust-linked permissions

Certain permissions may depend on:

- verification state;
- moderation history;
- organisation trust;
- district governance;
- subscription tier.

Examples:

- district campaigns;
- large boosts;
- city activations;
- high-volume ticketing.

---

# Multi-organisation support

Users may belong to:

- multiple venues;
- multiple collectives;
- radio teams;
- popup projects.

The UI must:

- support fast context switching;
- clearly indicate active organisation;
- prevent cross-org mistakes.

---

# Accessibility requirements

Team dashboards must support:

- keyboard navigation;
- screen readers;
- reduced motion;
- calm interfaces;
- low stimulation modes.

Critical moderation actions should:

- avoid accidental activation;
- require clear confirmation.

---

# Notification policy

Allowed notifications:

- moderation escalation;
- ticket fraud warning;
- campaign approval;
- accessibility issue;
- billing issue;
- role invitation;
- queue emergency.

Forbidden:

- manipulative urgency;
- internal power gamification;
- spam notifications.

---

# Privacy policy

Team systems must NEVER expose:

- exact user GPS trails;
- Ghosted chats;
- Help/SOS participant identity;
- recovery participation;
- private user history.

Moderation tooling must:

- minimise sensitive exposure;
- enforce least-privilege access.

---

# Security requirements

Sensitive actions should support:

- MFA;
- session validation;
- suspicious login detection;
- audit retention;
- device review.

High-risk actions may require:

- step-up authentication;
- secondary confirmation.

---

# Monetisation boundaries

Paid subscriptions may unlock:

- additional team seats;
- advanced analytics;
- workflow tools;
- multi-venue coordination.

Paid subscriptions must NEVER unlock:

- moderation immunity;
- audit deletion;
- safety bypass;
- hidden enforcement suppression.

---

# Suggested Supabase tables

```txt
organisation_profiles
organisation_members
organisation_roles
organisation_permissions
organisation_audit_logs
organisation_invites
organisation_moderation_events
organisation_accessibility_roles
organisation_security_events
organisation_team_sessions
```

Related existing tables:

```txt
vendor_profiles
vendor_trust_scores
beacon_reports
beacon_boosts
venue_verification
```

---

# Suggested implementation targets

```txt
src/lib/orgs/OrganisationPermissionEngine.ts
src/lib/orgs/OrganisationRoleResolver.ts
src/lib/orgs/OrganisationAuditLogger.ts
src/lib/orgs/OrganisationModerationService.ts
src/lib/orgs/OrganisationSecurityService.ts
src/lib/orgs/OrganisationContextSwitcher.ts
src/lib/orgs/OrganisationInviteService.ts
src/components/vendor/TeamManagementPanel.tsx
src/components/vendor/RoleEditor.tsx
src/components/vendor/AuditLogViewer.tsx
src/components/vendor/ModerationQueue.tsx
src/components/vendor/OrganisationSwitcher.tsx
```

---

# Acceptance criteria

The system succeeds when:

- venues and collectives coordinate safely;
- moderation remains accountable;
- permissions remain understandable;
- sensitive actions remain auditable;
- accessibility operations remain first-class;
- multi-venue workflows remain manageable;
- staff avoid operational mistakes;
- trust-linked permissions reduce abuse;
- safety systems cannot be bypassed through money or hierarchy;
- HOTMESS Globe feels operationally powerful without becoming authoritarian backoffice software.
