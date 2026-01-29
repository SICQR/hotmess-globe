# HOTMESS Wireframes

Comprehensive high-fidelity wireframe system for the HOTMESS platform — **200+ screens** covering end-to-end user journeys.

## Files

| File | Screens | Description |
|------|---------|-------------|
| `HOTMESS-WIREFRAMES.html` | 6 | Design tokens, components, core screens (Home, Social, Profile, Messages, Safety, Music) |
| `HOTMESS-WIREFRAMES-PART2.html` | 4 | Events List, Market/Shop, HNH MESS Product, More Menu |
| `WIREFRAMES-PART3-ONBOARDING.html` | 12 | Splash, Age Gate, Sign In/Up, Verify, Password Reset, Onboarding Steps |
| `WIREFRAMES-PART4-SOCIAL.html` | 8 | Messages Inbox, Right Now Mode, Go Live, Consent Gate, Filters, Report, Block |
| `WIREFRAMES-PART5-PROFILE.html` | 10 | My Profile, Edit Profile, Photos, Privacy, Blocked, Account, Notifications, GDPR |
| `WIREFRAMES-PART6-EVENTS.html` | 10 | Event Detail, RSVP, My Tickets, Pulse Map, Squad Up, Create Event, Resale |
| `WIREFRAMES-PART7-COMMERCE.html` | 10 | Product Detail, Cart, Checkout Flow, Order Confirmation, Tracking, Seller Dashboard |
| `WIREFRAMES-PART8-GAMIFICATION.html` | 8 | XP Dashboard, Challenges, Achievements, Leaderboard, Buy XP, Daily Check-in |
| `WIREFRAMES-PART9-MEMBERSHIP.html` | 8 | Plan Comparison, Upgrade Flow, Payment, Subscription Management, Cancel Flow |
| `WIREFRAMES-PART10-SAFETY.html` | 10 | Fake Call, Safety Check-in, Location Sharing, Trusted Contacts, SOS, Aftercare |
| `WIREFRAMES-PART11-EXTRAS.html` | 10 | Beacons, QR Scanner, Notifications, Telegram Link, Creator Profile, Tip, AI Assistant |
| `WIREFRAMES-PART12-UTILITY.html` | 14 | Loading States, Skeletons, Empty States, Errors, 404, Offline, Toasts, Dialogs |
| `WIREFRAMES-PART13-MUSIC-DEEP.html` | 12 | Live Radio, Shows, Episodes, Releases, Artists, Schedule, Playlists, Wetter Watch |
| `WIREFRAMES-PART14-COMMUNITY.html` | 12 | Stories, Voice Notes, Group Chat, Community Feed, Create Post, Comments, Referrals |
| `WIREFRAMES-PART15-BUSINESS.html` | 12 | Business Dashboard, Onboarding, Venue Profile, Events, Scan, Analytics, Sponsorships |
| `WIREFRAMES-PART16-ADMIN.html` | 10 | Admin Dashboard, Moderation Queue, Reports, User Management, Content, Metrics, Audit |
| `WIREFRAMES-PART17-MICROFLOWS.html` | 12 | Pull to Refresh, Swipe Actions, Long Press, Tooltips, Reactions, Search, Filters, Media |
| `WIREFRAMES-PART18-PULSE-CALENDAR.html` | 12 | PULSE Map Layers (Events/People/Care), Directions, Calendar, Subscriptions, Leaderboard, Stats, QR Scan |
| `WIREFRAMES-PART19-AI-VERIFICATION.html` | 12 | AI Match Explanation, Compatibility Badge, Vibe Synthesis, Face Verification, 2FA, Appeal, Profile Completeness, Data Export |

**Total: 200+ unique screens**

## How to View

Open any HTML file in a modern browser. Each file is self-contained with:
- Tailwind CSS via CDN
- Inter font via Google Fonts
- Placeholder images via Unsplash

## Contents

### Design Tokens

| Token | Values |
|-------|--------|
| **Colors** | Hot (#FF1493), Cyan (#00D9FF), Purple (#B026FF), Lime (#39FF14), Yellow (#FFEB3B), Gold (#FFD700) |
| **Typography** | Inter, weights 400-900, Display/H1/H2/H3/Body/Caption/Micro scales |
| **Spacing** | 4px increments (4, 8, 12, 16, 20, 24, 32) |

### Components

| Component | Variants |
|-----------|----------|
| **Buttons** | Primary (Hot), Secondary (Cyan), Right Now (Lime), Listen (Purple), Outline, Ghost |
| **Badges** | Right Now, Match %, Online, Seller, Creator, Premium, Chrome, Can Host, Can Travel, Verified |
| **Profile Cards** | Standard, Right Now Active, Seller, Creator, Tactical |
| **Safety** | Panic Button, Safety Check, Fake Call, Aftercare Nudge, Location Share |
| **Radio Player** | Mini, Expanded, Live Indicator |
| **Match Score** | 8-dimension breakdown with progress bars |
| **Inputs** | Default, Focused, Error, Success, Disabled states |
| **Modals** | Consent Gate, Confirmation, Action Sheet, Feature Gate |
| **Toasts** | Success, Error, Info, Warning |
| **Cards** | Glass, Event, Product, Profile Preview |

### Complete User Journeys Covered

1. **Onboarding** - Splash → Age Gate → Auth → Profile Setup → Consent → Preferences → Complete
2. **Social Loop** - Discover → Profile → Message → Consent Gate → Chat → Aftercare
3. **Events Loop** - Browse → Detail → RSVP → Calendar → Check-in → Aftercare
4. **Commerce Loop** - Browse → Product → Cart → Checkout → Confirmation → Tracking
5. **Music Loop** - Live Radio → Shows → Episodes → Releases → Artists → Schedule
6. **Safety Loop** - Hub → Panic → Fake Call → Check-in → Location → Resources
7. **Gamification Loop** - XP Dashboard → Challenges → Achievements → Leaderboard → Level Up
8. **Business Loop** - Onboarding → Dashboard → Events → Scan → Analytics → Billing
9. **Admin Loop** - Dashboard → Moderation → Reports → Users → Content → Config

## Design Principles

### Visual Language
- **Dark theme** with vibrant accent colors
- **Brutalist luxury** aesthetic
- **Bold typography** - Black weight, uppercase, italic for brand
- **Glows** on interactive elements
- **Glass morphism** for overlay cards

### UX Principles
- **Care-first** - Safety always 1 tap away
- **Consent gates** on first social interactions
- **Match scores** visible, breakdowns accessible
- **Right Now** prominently featured
- **Persistent radio** player

### Brand Voice
- Bold, not crude
- Provocative, not offensive
- Care-first, always
- Editorial, not clinical
- Community, not corporate

## Phone Frame Specs

```css
.phone-frame {
  width: 375px;
  height: 812px;
  border-radius: 40px;
  border: 8px solid #1a1a1a;
}
```

Based on iPhone X/11/12/13 dimensions.

## Usage in Figma

To recreate in Figma:

1. **Create frames**: 375x812 for mobile
2. **Import colors**: Use the hex values from Design Tokens
3. **Typography**: Use Inter with the documented weights
4. **Components**: Create component variants matching each documented state
5. **Auto Layout**: Use the spacing scale for consistent padding/margins

## Color CSS Variables

```css
:root {
  --hot: #FF1493;
  --cyan: #00D9FF;
  --purple: #B026FF;
  --lime: #39FF14;
  --yellow: #FFEB3B;
  --gold: #FFD700;
  --orange: #FF6B35;
}
```

## Glow Effects

```css
.glow-hot { box-shadow: 0 0 30px rgba(255, 20, 147, 0.5); }
.glow-cyan { box-shadow: 0 0 20px rgba(0, 217, 255, 0.4); }
.glow-purple { box-shadow: 0 0 20px rgba(176, 38, 255, 0.4); }
.glow-lime { box-shadow: 0 0 20px rgba(57, 255, 20, 0.4); }
```

## Glass Effect

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

---

**HOTMESS** • Platform • Radio • Records • London
