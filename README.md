# HOTMESS - LGBT+ Social Network & Nightlife Platform

A full-stack social networking and nightlife discovery platform for the LGBT+ community.  
**React 18 + Vite + Supabase + Vercel**

---

## 📊 Build Stats

| Category | Count |
|----------|-------|
| **Pages/Routes** | 85 |
| **Component Folders** | 61 |
| **API Endpoints** | 8 |
| **Database Migrations** | 70 |
| **UI Components** | 73 (shadcn/ui + custom) |

---

## 🗂️ All Pages (85)

### Core User Pages
| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing with globe hero |
| Auth | `/auth` | Email/password + Telegram + Google |
| Profile | `/profile/:id` | User profiles with stats |
| EditProfile | `/profile/edit` | Profile editor |
| ProfileSetup | `/profile/setup` | Onboarding flow |
| Settings | `/settings` | Privacy, notifications, account |
| Messages | `/messages` | DM inbox |
| Chat | `/chat/:id` | Individual conversation |

### Social & Discovery
| Page | Route | Description |
|------|-------|-------------|
| Social | `/social` | Profile grid with filters |
| ProfilesGrid | `/profiles` | Infinite scroll profiles |
| Connect | `/connect` | AI matchmaker |
| Feed | `/feed` | Community posts |
| Community | `/community` | Forums/discussions |
| SquadChat | `/squads/:id` | Group chats |

### Events & Nightlife
| Page | Route | Description |
|------|-------|-------------|
| Events | `/events` | Event listings |
| MyEvents | `/my-events` | RSVPs & tickets |
| Calendar | `/calendar` | Event calendar view |
| Globe | `/globe` | 3D interactive globe |
| Beacons | `/beacons` | Location drops |
| CreateBeacon | `/beacons/create` | Post a beacon |
| BeaconDetail | `/beacons/:id` | Beacon page |
| Directions | `/directions` | Navigation/travel time |

### Music & Radio
| Page | Route | Description |
|------|-------|-------------|
| Radio | `/radio` | Live streaming radio |
| RadioSchedule | `/radio/schedule` | Show timetable |
| Music | `/music` | Music discovery |
| MusicRelease | `/music/release` | Submit tracks |
| Pulse | `/pulse` | What's trending now |

### Marketplace & Commerce
| Page | Route | Description |
|------|-------|-------------|
| Shop | `/shop` | Product listings |
| ShopCart | `/cart` | Shopping cart |
| ShopProduct | `/shop/:id` | Product detail |
| ShopCollection | `/shop/collection/:id` | Collection page |
| Checkout | `/checkout` | Payment flow |
| Marketplace | `/marketplace` | P2P marketplace |
| TicketMarketplace | `/tickets` | Resale tickets |
| ProductDetail | `/product/:id` | Item page |
| OrderHistory | `/orders` | Purchase history |

### Creator & Seller Tools
| Page | Route | Description |
|------|-------|-------------|
| SellerDashboard | `/seller` | Seller analytics & products |
| CreatorDashboard | `/creator` | Creator tools |
| OrganizerDashboard | `/organizer` | Event management |
| CreatorsCart | `/creators/cart` | Creator shop cart |
| CreatorsCheckout | `/creators/checkout` | Creator checkout |

### Safety & Care
| Page | Route | Description |
|------|-------|-------------|
| Safety | `/safety` | Panic button, check-ins |
| Care | `/care` | Mental health resources |
| HandNHand | `/hand-n-hand` | Community support |
| DialADaddy | `/dial-a-daddy` | Mentor matching |

### Admin & Moderation
| Page | Route | Description |
|------|-------|-------------|
| AdminDashboard | `/admin` | Full admin panel |
| RecordManager | `/admin/records` | Data management |
| PromoteToAdmin | `/admin/promote` | Role management |

### Account & Legal
| Page | Route | Description |
|------|-------|-------------|
| AccountConsents | `/account/consents` | GDPR consents |
| AccountDeletion | `/account/delete` | Delete account |
| DataExport | `/account/export` | GDPR export |
| PrivacyPolicy | `/privacy` | Privacy policy |
| TermsOfService | `/terms` | Terms |
| CommunityGuidelines | `/guidelines` | Rules |

### Misc & Features
| Page | Route | Description |
|------|-------|-------------|
| Onboarding | `/onboarding` | New user tour |
| AgeGate | `/age-gate` | 18+ verification |
| Features | `/features` | Feature showcase |
| Pricing | `/pricing` | Membership tiers |
| MembershipUpgrade | `/upgrade` | Premium upgrade |
| HelpCenter | `/help` | Support & FAQs |
| Contact | `/contact` | Contact form |
| Bookmarks | `/bookmarks` | Saved items |
| Stats | `/stats` | User statistics |
| Leaderboard | `/leaderboard` | Gamification |
| Challenges | `/challenges` | Community challenges |
| InviteFriends | `/invite` | Referral system |
| Scan | `/scan` | QR scanner |
| RightNowDashboard | `/right-now` | Live status manager |
| LuxShowcase | `/lux` | Premium showcase |
| WakeTheMess | `/wake` | Push notifications |

---

## 🧩 Component Architecture (61 folders)

```
src/components/
├── accessibility/     # FocusTrap, KeyboardNav, SkipToContent
├── admin/            # 12 components - UserManagement, Analytics, Moderation
├── ai/               # GlobalAssistant, NightlifeResearcher
├── analytics/        # ABTesting, AdvancedAnalytics
├── auth/             # AgeGate, TelegramLogin, TwoFactorSetup, FaceVerification
├── beacon/           # BeaconActions, CommentsSection
├── commerce/         # FeeDisplay
├── community/        # PostCard, PostCreator, PersonalizedFeed, TrendingSummary
├── cta/              # CTAButton
├── directions/       # InAppDirections
├── discovery/        # AIMatchmaker, RightNowIndicator, FiltersDrawer
├── docs/             # Documentation components
├── error/            # Error boundaries
├── events/           # 12 components - EventCard, RSVP, Ticketing, MapView
├── gamification/     # Challenges, rewards
├── globe/            # 3D globe, controls, overlays
├── home/             # Landing page sections
├── i18n/             # Language switcher
├── interactions/     # Like, share, follow
├── legal/            # Terms, privacy components
├── loading/          # Spinners, skeletons
├── lux/              # Premium UI variants
├── marketing/        # CTAs, banners
├── marketplace/      # ProductCard, Cart, Offers
├── matching/         # AI matching UI
├── media/            # MediaGallery, MediaUploader
├── membership/       # Tier badges, upgrade prompts
├── messaging/        # ChatThread, ThreadList, NewMessageModal
├── mobile/           # Mobile-specific components
├── moderation/       # Report, block UI
├── monetization/     # Payment components
├── music/            # SoundCloudEmbed, ConvictPlayer, NightKingDisplay
├── navigation/       # Navbar, sidebar, mobile nav
├── notifications/    # Toast, push notifications
├── onboarding/       # WelcomeTour, tips
├── orders/           # OrderHistory, QRScanner
├── profile/          # ProfileHeader, ProfileStats, ProfileCompleteness
├── pwa/              # Install prompt, offline indicator
├── radio/            # RadioPlayer, schedule components
├── react-bits/       # Animated UI components
├── realtime/         # Live presence indicators
├── recommendations/  # AI recommendations
├── retention/        # Re-engagement components
├── safety/           # EmergencyEditor, CheckInTimer
├── search/           # Search bar, filters
├── seller/           # SalesAnalytics, PayoutManager, InventoryAlerts
├── shell/            # Layout, PageShell
├── skeletons/        # Loading placeholders
├── social/           # Social feed components
├── splash/           # Splash screens
├── squads/           # Group chat components
├── taxonomy/         # Tags, categories
├── text/             # Typography components
├── transitions/      # Page transitions
├── travel/           # Travel time, directions
├── tutorial/         # TutorialTooltip
├── ui/               # 73 shadcn components (button, card, dialog, etc.)
├── upload/           # File upload components
├── utils/            # supabaseClient, helpers
├── vibe/             # VibeSynthesis cards
└── video/            # Video player components
```

---

## 🔌 API Endpoints (8 routes)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profiles` | GET | Paginated profile feed |
| `/api/travel-time` | POST | ETA calculations (Google/fallback) |
| `/api/soundcloud/*` | Various | SoundCloud OAuth & uploads |
| `/api/scraper/*` | POST | Event scraper triggers |
| `/api/webhook/*` | POST | Stripe/Shopify webhooks |
| `/api/telegram/*` | POST | Telegram bot integration |
| `/api/cron/*` | GET | Scheduled jobs |
| `/api/health` | GET | Health check |

---

## 🗄️ Database (70 migrations)

**Supabase PostgreSQL** with tables for:
- `profiles` - User profiles with geo, photos, tags
- `events` - Event listings with venues, tickets
- `beacons` - Location-based drops
- `messages` / `threads` - Real-time messaging
- `products` / `orders` - Marketplace
- `safety_checkins` - Check-in timer system
- `radio_shows` / `music_releases` - Radio/music
- `squads` - Group chats
- `reports` / `blocks` - Moderation
- `analytics_events` - Usage tracking

---

## 🎯 Feature Status

### ✅ Fully Working
- Email/password + Google auth (Supabase)
- Telegram login button
- Profile CRUD with photos
- Event listings & RSVPs
- Beacon creation & discovery
- Real-time messaging
- Shopping cart & Stripe checkout
- 3D Globe visualization
- Radio player & schedule
- Safety check-in timer
- Admin dashboard
- GDPR data export/deletion
- PWA with offline support

### ⚠️ Partial / Coming Soon
- QR ticket scanning (UI exists, backend partial)
- SoundCloud OAuth (endpoints exist, needs hardening)
- Premium content unlock (payment flow incomplete)
- Face verification (UI exists, needs integration)
- Push notifications (setup exists, needs VAPID keys)

### 🔜 Planned
- Video chat
- AI event recommendations (ML model)
- Uber deep-link integration

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run
npm run dev
# → http://localhost:5173
```

### Required Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `npm run test:e2e` | Playwright tests |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, React Router |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI |
| **State** | React Query, Context API |
| **3D** | Three.js, React Three Fiber |
| **Maps** | Leaflet, Mapbox GL |
| **Backend** | Supabase (Postgres, Auth, Storage, Realtime) |
| **Payments** | Stripe |
| **Hosting** | Vercel |
| **CI/CD** | GitHub Actions |

---

## 📁 Project Structure

```
hotmess-globe/
├── src/
│   ├── pages/           # 85 route pages
│   ├── components/      # 61 component folders
│   ├── features/        # Feature modules
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # Auth, i18n, Cart contexts
│   ├── lib/             # Core utilities
│   ├── utils/           # Helper functions
│   └── api/             # API client modules
├── api/                 # Vercel serverless functions
├── supabase/
│   ├── migrations/      # 70 SQL migrations
│   └── functions/       # Edge functions
├── public/              # Static assets, PWA manifest
├── e2e/                 # Playwright tests
└── docs/                # Additional documentation
```

---

## 🔒 Security

- ✅ All npm vulnerabilities resolved
- ✅ Secret scanning (TruffleHog)
- ✅ CodeQL analysis on PRs
- ✅ CSP headers configured
- ✅ GDPR compliance (export/delete)

See [SECURITY.md](./SECURITY.md) for full details.

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [SECURITY.md](./SECURITY.md) | Security policies |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy checklist |
| [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md) | Deep technical analysis |
| [INCOMPLETE_FEATURES.md](./INCOMPLETE_FEATURES.md) | Known limitations |
| [AI_WORKFLOW.md](./AI_WORKFLOW.md) | Multi-AI collaboration guide |

---

## 🚢 Deployment

Auto-deploys to **Vercel** on push to `main`.

```
Production: https://hotmessldn.com
Preview: https://hotmess-globe-*.vercel.app
```

Vercel settings:
- Framework: Vite
- Build: `npm run build`
- Output: `dist`

---

## 📄 License

Proprietary - SICQR Ltd

---

Made with 🏳️‍🌈 for the LGBT+ community

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- Modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SICQR/hotmess-globe.git
   cd hotmess-globe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   **⚠️ SECURITY WARNING**: Never commit `.env` or `.env.local` files!
   
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables (see [.env.example](./.env.example) for full list):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Server-side (Vercel Functions)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```
   
   📚 **Important**: Read [SECURITY.md](./SECURITY.md) for environment variable best practices!

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint code quality checks
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking (`tsc --noEmit`)

## ▲ Deploying to Vercel

This app is a Vite SPA using React Router. Deep links like `/${PageKey}` require an SPA rewrite.

- Vercel settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
- Environment Variables (Vercel Project → Settings → Environment Variables):
   - Required (Supabase): set **either** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` **or** `SUPABASE_URL` + `SUPABASE_ANON_KEY` (the build maps server vars into the client bundle when VITE vars are missing)
   - Strongly recommended: `SUPABASE_SERVICE_ROLE_KEY` (enables admin/server features like scraper, SoundCloud uploads, rate-limit cleanup)
   - Optional: `GOOGLE_MAPS_API_KEY` (routing/ETAs)
   - Optional: `TICKET_QR_SIGNING_SECRET` (production-safe ticket QR signing)
   - Optional: see [.env.example](./.env.example) for Shopify/SoundCloud/crons.
- Routing:
   - `vercel.json` includes an SPA rewrite to `index.html` for all routes.

### Connect direct: Vercel ↔ Supabase

You can **connect Vercel and Supabase directly** so env vars are synced automatically:

1. **Vercel Marketplace** – [Supabase integration](https://supabase.com/docs/guides/integrations/vercel-marketplace): create or link a Supabase project from Vercel. It syncs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SUPABASE_*` to your project.
2. **This app** supports those integration vars: it uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and `SUPABASE_*` in API routes) when set. No need to duplicate values as `VITE_*` unless you prefer them.

All env can live in Vercel; no local `.env` required for deploys.

## 🧪 Auth + Social e2e smoke

There is a focused Playwright smoke test for the core member loop: Auth → Social → New Message → Send.

- Run: `npm run test:e2e:auth`
- Required env: `E2E_EMAIL`, `E2E_PASSWORD`
- Optional (auto-seed profiles for the Social grid): `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (the runner calls `npm run seed:mock-profiles` when present)

## 🧩 Social Profiles + Travel Time

The Social grid pulls profile cards from a serverless endpoint and optionally decorates them with travel time estimates.

### Profiles feed (`GET /api/profiles`)

- Handler: `api/profiles.js`
- Client usage: `src/features/profilesGrid/useInfiniteProfiles.ts`
- Auth:
   - Production/Vercel requires `Authorization: Bearer <supabase_access_token>`
   - Local dev may allow unauthenticated requests (but the client will include a token when signed in)

Query params:

- `cursor`: offset as a string/integer (pagination)
- `limit`: 1–60 (default 40)

Response shape:

```json
{
   "items": [
      {
         "id": "profile_<dedupeKey>",
         "profileName": "Alex",
         "title": "Gym rat, beach lover",
         "locationLabel": "London",
         "geoLat": 51.5074,
         "geoLng": -0.1278,
         "photos": [{ "url": "https://...", "isPrimary": true }],

         "email": "alex@example.com",
         "authUserId": "<supabase_uid>",
         "profileType": "seller|creator|organizer",
         "hasProducts": true,
         "productPreviews": [{ "imageUrl": "https://..." }],
         "tags": ["tag_a", "tag_b"]
      }
   ],
   "nextCursor": "40"
}
```

Notes:

- Pagination is offset-based: pass `nextCursor` back as `cursor`.
- The handler prefers the Supabase service role client when available; when not available it can fall back to an authenticated RPC (`list_profiles_secure`) or demo fallback profiles.

### Travel time (`POST /api/travel-time`)

- Handler: `api/travel-time.js`
- Client usage: `src/features/profilesGrid/travelTime.ts`
- Auth:
   - Production/Vercel requires `Authorization: Bearer <supabase_access_token>`

Request body:

```json
{
   "origin": { "lat": 51.5074, "lng": -0.1278 },
   "destination": { "lat": 51.5099, "lng": -0.1181 }
}
```

Response shape (`TravelTimeResponse`):

```json
{
   "walking": { "durationSeconds": 640, "label": "11 min on foot" },
   "driving": { "durationSeconds": 420, "label": "7 min by cab" },
   "bicycling": { "durationSeconds": 510, "label": "9 min by bike" },
   "uber": { "durationSeconds": 420, "label": "7 min uber" },
   "fastest": { "durationSeconds": 420, "label": "7 min by cab" },
   "meta": { "provider": "google" }
}
```

Notes:

- If `GOOGLE_MAPS_API_KEY` is not set, the endpoint returns approximate ETAs (privacy-safe haversine + speed heuristics) and `meta.provider` becomes `approx`.
- Results are cached server-side (when `routing_cache` is available) and also cached client-side for 2 minutes.
- The client buckets GPS coords to ~0.001° (~110m) to avoid request spam from jitter.

### Visibility hook (`useVisibility`)

- Hook: `src/features/profilesGrid/useVisibility.ts`
- Used for:
   - Infinite-scroll sentinel (load next page when visible)
   - Lazy-loading profile card work (travel-time fetches only after the card is near the viewport)

API:

```ts
const { ref, isVisible } = useVisibility({ rootMargin: '200px', threshold: 0.2, once: true });
```

This uses `IntersectionObserver` (browser API). If you add server-side rendering later, guard any observer usage so it only runs in the browser.

## 🏗️ Technology Stack

### Frontend
- **React 18** - UI component library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Three.js** - 3D graphics for globe visualization

### Backend & Services
- **Base44 SDK** - Backend services and API integration
- **Supabase** - Database and authentication
- **React Query** - Data fetching and caching
- **Stripe** - Payment processing

### UI Components
- **Radix UI** - Accessible component primitives
- **Shadcn/ui** - Pre-built UI components
- **Lucide React** - Icon library

### Maps & Location
- **React Leaflet** - Interactive maps
- **Mapbox GL** - Advanced map visualization

## 📖 Documentation

- [**Getting Started Guide**](#-getting-started) - Quick start instructions
- [**CI/CD Setup**](./CI_CD_SETUP.md) - Continuous integration and deployment setup
- [**Test Setup**](./TEST_SETUP.md) - Testing infrastructure and guidelines
- [**Hyper Analysis Report**](./HYPER-ANALYSIS-REPORT.md) - Comprehensive codebase analysis
- [**Issues Tracker**](./ISSUES-TRACKER.md) - Prioritized issues and sprint planning

## 🏛️ Project Structure

```
hotmess-globe/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   ├── contexts/       # React contexts
│   └── App.jsx         # Main application component
├── functions/          # Serverless functions
├── public/             # Static assets
├── .github/            # GitHub workflows and actions
└── docs/               # Additional documentation
```

## 🔒 Security

**✅ Security Audit Completed** (2026-01-03)
- All npm vulnerabilities resolved (0 remaining)
- Security documentation and best practices established
- CI/CD pipeline with automated security scanning

### Security Resources
- 📖 [**SECURITY.md**](./SECURITY.md) - Comprehensive security guide and best practices
- 🚀 [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Secure deployment checklist
- 🔐 [**.env.example**](./.env.example) - Environment variable documentation with security warnings

### Security Best Practices
- ✅ **Never commit secrets**: Use `.env.local` for credentials (gitignored)
- ✅ **Use VITE_ prefix wisely**: Only for values that MUST be client-side
- ✅ **Keep dependencies updated**: Run `npm audit` regularly
- ✅ **Follow security checklist**: Use PR template for all changes
- ✅ **Report vulnerabilities**: Email security@sicqr.com (update with actual contact)

### Automated Security
- 🤖 Daily dependency vulnerability scanning (GitHub Actions)
- 🔍 Secret scanning on every commit (TruffleHog)
- 🛡️ CodeQL security analysis on pull requests
- 📊 Automated security reports and alerts

## 🤝 Contributing

We welcome contributions from the community! 

### Before Contributing:
1. Read [SECURITY.md](./SECURITY.md) for security guidelines
2. Review [CODE_QUALITY_RECOMMENDATIONS.md](./CODE_QUALITY_RECOMMENDATIONS.md) for code standards
3. Check [INCOMPLETE_FEATURES.md](./INCOMPLETE_FEATURES.md) for feature status
4. Review [ISSUES-TRACKER.md](./ISSUES-TRACKER.md) for current priorities

### Contribution Workflow:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [PR template](./.github/PULL_REQUEST_TEMPLATE.md) checklist
4. Ensure all security checks pass
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Quality Requirements:
- ✅ ESLint passes (`npm run lint`)
- ✅ Type checking passes (`npm run typecheck`)
- ✅ Build succeeds (`npm run build`)
- ✅ No security vulnerabilities (`npm audit`)
- ✅ Security checklist completed (see PR template)

## 🧪 Testing

See [TEST_SETUP.md](./TEST_SETUP.md) for comprehensive testing guidelines and setup instructions.

```bash
# Run tests (when configured)
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

The build output will be in the `dist/` directory, ready for deployment.

## 🚀 Deployment

**Automated Deployment**: This application automatically deploys to Vercel production when code is pushed to the `main` branch, after all CI checks pass.

### Deployment Platforms Supported:
- **Vercel** - Currently configured with automated GitHub Actions deployment
- **Netlify** - Alternative platform (requires configuration)
- **AWS S3 + CloudFront** - Enterprise-grade hosting (requires manual setup)
- **GitHub Pages** - Free hosting for open-source projects (requires configuration)

### Setup and Configuration:
- **Automated deployment setup**: See [CI_CD_SETUP.md](./CI_CD_SETUP.md)
- **Deployment checklist**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

To deploy, simply:
1. Create a pull request with your changes
2. Ensure all CI checks pass
3. Merge to `main` branch
4. Deployment happens automatically!

## 📱 Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## 🌟 Acknowledgments

- The LGBT+ community for inspiration and support
- All contributors who help make this platform better
- Open source libraries and tools that power this project

## 📝 License

[Add license information]

## 📧 Contact

For questions, suggestions, or support:
- Open an issue on GitHub
- Visit our [Discussions](https://github.com/SICQR/hotmess-globe/discussions)

---

Made with 🏳️‍🌈 for the LGBT+ community

