# App Store Privacy Nutrition Labels — HOTMESS

> App Store Connect → App Privacy section declarations.  
> Last updated: 2026-05-01  
> Prepared by: cowork-c5  
> Reference: https://developer.apple.com/app-store/app-privacy-details/

Complete this section in App Store Connect before submission. Use the table
below as the source of truth. Each data type must be declared with:
- **Purpose** (why it's collected)
- **Linked to identity** (yes = stored against the user's account)
- **Used for tracking** (shared with data brokers / cross-app advertising)

HOTMESS does not sell user data. HOTMESS does not use data for cross-app
advertising or share data with data brokers. All "Used for tracking" answers
are **No**.

---

## Summary

| Data Type | Collected? | Linked to Identity | Used for Tracking |
|-----------|------------|--------------------|--------------------|
| Email address | ✅ Yes | ✅ Yes | ❌ No |
| Name / Display name | ✅ Yes | ✅ Yes | ❌ No |
| Photos | ✅ Yes | ✅ Yes | ❌ No |
| Precise Location | ✅ Yes | ✅ Yes | ❌ No |
| Coarse Location | ✅ Yes | ✅ Yes | ❌ No |
| User ID | ✅ Yes | ✅ Yes | ❌ No |
| Device ID | ✅ Yes | ❌ No | ❌ No |
| Product Interaction | ✅ Yes | ✅ Yes | ❌ No |
| Crash Data | ✅ Yes | ❌ No | ❌ No |
| Purchase History | ✅ Yes | ✅ Yes | ❌ No |
| Sensitive Info (sexual orientation) | ✅ Yes (optional) | ✅ Yes | ❌ No |
| Messages | ✅ Yes | ✅ Yes | ❌ No |
| Health & Fitness | ❌ No | — | — |
| Browsing History | ❌ No | — | — |
| Search History | ❌ No | — | — |
| Financial Info (raw) | ❌ No | — | — |

---

## Detailed Declarations

### Contact Info

**Email Address**
- Purpose: Account setup, login, communication, password reset
- Linked to identity: Yes
- Used for tracking: No
- Notes: Primary account identifier. Stored in Supabase Auth.

---

### User Content

**Photos / Images**
- Purpose: Profile avatar, right-now posts, market listings
- Linked to identity: Yes
- Used for tracking: No
- Notes: Images uploaded to Supabase Storage. All uploads are scanned for CSAM and explicit content before display. Images are not sold or shared with third parties.

**Other User Content (posts, messages, signals)**
- Purpose: Core platform functionality (Right Now presence, Meet, messaging)
- Linked to identity: Yes
- Used for tracking: No

---

### Location

**Precise Location**
- Purpose: Right Now presence globe, Meet flow (walking ETAs), venue check-ins, journey sharing
- Linked to identity: Yes
- Used for tracking: No
- Notes: Precise location is used server-side to place beacons on the globe. Location shown to OTHER users is always grid-snapped to ~500m — never precise. Users can go invisible at any time.

**Coarse Location**
- Purpose: City-level features, regional radio programming, event discovery
- Linked to identity: Yes
- Used for tracking: No

---

### Identifiers

**User ID**
- Purpose: Account management, feature access, safety systems
- Linked to identity: Yes
- Used for tracking: No
- Notes: Supabase UUID. Used across all authenticated requests.

**Device ID**
- Purpose: Push notification delivery, crash attribution
- Linked to identity: No (device-level, not account-level)
- Used for tracking: No

---

### Usage Data

**Product Interaction**
- Purpose: Feature analytics, crash investigation, onboarding funnel analysis
- Linked to identity: Yes
- Used for tracking: No
- Notes: Logged to `analytics_events` table. Used solely for product improvement.

---

### Diagnostics

**Crash Data**
- Purpose: Bug fixing, stability improvement
- Linked to identity: No
- Used for tracking: No

---

### Purchases

**Purchase History**
- Purpose: Membership management, boost activation, order fulfilment
- Linked to identity: Yes
- Used for tracking: No
- Notes: Payment processing via Stripe. Card numbers are never stored by HOTMESS. Only transaction metadata (tier, amount, timestamp) is stored.

---

### Sensitive Information

**Sexual Orientation / Relationship Preferences**
- Purpose: Profile personalisation, discovery features
- Linked to identity: Yes
- Used for tracking: No
- Notes: This field is entirely optional. Users may choose not to disclose. Data is stored in `profiles.public_attributes` JSONB and is only displayed to other users if the user opts to show it on their profile. It is never used for advertising.

---

### Messages

**Direct Messages**
- Purpose: In-app communication between users
- Linked to identity: Yes
- Used for tracking: No
- Notes: Messages are stored in Supabase. They are accessible to HOTMESS support only in the case of a reported safety incident. They are never scanned for advertising purposes.

---

## Data Not Collected

HOTMESS explicitly does **not** collect:
- Health or fitness data
- Browsing history (no web tracking pixels)
- Search history outside the platform
- Raw financial data (card numbers, bank details — handled by Stripe)
- Contacts (address book not accessed)
- Calendar data
- Clipboard content

---

## Image Scanning Disclosure

All user-uploaded images are automatically scanned before display using:
1. **Microsoft PhotoDNA** — hash-matching against known CSAM databases
2. **Cloudflare AI** — explicit content classification

This scanning is a legal and safety requirement. Scan results are not used for advertising or profiling. Images that fail scanning are automatically removed and the relevant authorities are notified as required by law.

---

## GDPR Lawful Bases (UK/EU)

| Data Category | Lawful Basis |
|---------------|-------------|
| Account data | Contract performance |
| Location data | Legitimate interest + explicit consent |
| Analytics | Legitimate interest |
| Marketing comms | Explicit consent |
| Safety data (SOS, check-ins) | Vital interests |
| Sensitive data (orientation) | Explicit consent |

---

## Data Processor List (for App Privacy section)

| Processor | Purpose | Country |
|-----------|---------|---------|
| Supabase (AWS eu-west-2) | Database, auth, storage | UK/EU |
| Vercel | Web hosting, serverless functions | Global (edge) |
| Stripe | Payment processing | EU |
| Shopify | Marketplace / e-commerce | CA/US |
| Microsoft Azure (PhotoDNA) | CSAM image scanning | EU |
| Cloudflare | Image AI scanning, CDN | EU |
| Anthropic API | AI features (Wingman, Scene Scout) | US |

---

## Contact

Data Protection Officer: privacy@hotmessldn.com  
HOTMESS London OS Limited, England & Wales
