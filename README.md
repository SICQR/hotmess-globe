# HOTMESS - LGBT+ Social Network & Nightlife Platform

A comprehensive social networking and nightlife discovery platform designed specifically for the LGBT+ community. Built with React + Vite and backed by Supabase (via a Base44-compatible wrapper).

## 🌈 About HOTMESS

HOTMESS is more than just a social network—it's a vibrant community hub that connects LGBT+ individuals through social interactions, event discovery, and nightlife experiences. The platform combines social networking features with location-based services to help users discover events, venues, and connect with like-minded people in their area.

## ✨ Key Features

- **🌍 Interactive Globe View**: Explore global LGBT+ events and venues with an immersive 3D globe interface
- **👥 Social Networking**: Connect with friends, create posts, and engage with the community
- **🎉 Event Discovery**: Find and share LGBT+ events, parties, and gatherings
- **📍 Venue Mapping**: Discover LGBT+-friendly bars, clubs, and venues near you
- **💬 Real-time Chat**: Connect with community members through instant messaging
- **📱 Mobile-First Design**: Fully responsive design optimized for all devices
- **🎨 Customizable Profiles**: Express yourself with rich profile customization options

## 📋 Project Status

**🚀 BETA TESTING READY** (2026-01-28)

### Recent Updates:
- ✅ **Profile links and CSP fixed** (PR #25 - vercel.live integration)
- ✅ **All npm security vulnerabilities fixed** (0 vulnerabilities remaining)
- ✅ **CI/CD pipeline implemented** (GitHub Actions workflows)
- ✅ **Security documentation created** (SECURITY.md)
- ✅ **Structured logging system added** (replaces unsafe console statements)
- ✅ **Code quality improvements** (fixed parsing errors, removed invalid file extensions)
- ✅ **Mock data replaced with real API calls** (distance calculations, city data)
- ✅ **Placeholder text updated** (user-friendly "Coming Soon" messages)
- ✅ **Environment variables documented** (complete .env.example)

### 🧪 Beta Testing Status

This version is ready for beta testing. The following features are functional:
- ✅ User authentication and profiles
- ✅ Beacon/event creation and discovery
- ✅ Social discovery and matching
- ✅ Marketplace and checkout
- ✅ Real-time features (Right Now status)
- ✅ Globe visualization with real data

**Known Limitations for Beta:**
- ⚠️ **QR Scanner**: Coming Soon - ticket scanning not yet implemented
- ⚠️ **SoundCloud OAuth**: Coming Soon - music uploads return 501 (not implemented)
- ✅ **Premium Content**: Implemented - premium photo/video unlock and subscriptions (requires `VITE_XP_PURCHASING_ENABLED=true`)
- ⚠️ **Weather/Transit Data**: Placeholder data (real APIs to be integrated)
- ⚠️ **Base44 SDK Functions**: Edge functions require Base44 SDK access (verify in production)

These limitations are clearly marked in the UI and do not block core functionality.

### 📚 Important Documentation:
- 🔒 [**SECURITY.md**](./SECURITY.md) - Security best practices and policies
- 📘 [**HOTMESS LONDON OS — V1.5 Bible**](./docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md) - Canonical product navigation, routes, and build sequence
- 🚀 [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Deployment checklist and guide
- 📊 [**CODE_QUALITY_RECOMMENDATIONS.md**](./CODE_QUALITY_RECOMMENDATIONS.md) - Code improvement roadmap
- 🚧 [**INCOMPLETE_FEATURES.md**](./INCOMPLETE_FEATURES.md) - Known limitations and TODOs
- 📋 [**ISSUES-TRACKER.md**](./ISSUES-TRACKER.md) - Trackable issues and sprint planning
- 🔧 [**CI_CD_SETUP.md**](./CI_CD_SETUP.md) - CI/CD pipeline documentation
- 🧪 [**TEST_SETUP.md**](./TEST_SETUP.md) - Testing infrastructure setup guide

### ⚠️ Beta Testing Notes:
1. **Environment Setup**: Ensure all required environment variables are set (see `.env.example`)
2. **Base44 SDK**: Verify Base44 SDK access for edge functions in production
3. **Supabase**: Ensure Supabase database is properly configured with all migrations
4. **Known Issues**: Review [INCOMPLETE_FEATURES.md](./INCOMPLETE_FEATURES.md) for feature limitations
5. **Error Reporting**: Error boundaries are in place; Sentry integration is optional for beta

### ⚠️ Before Full Production Deployment:
1. Complete remaining items in [INCOMPLETE_FEATURES.md](./INCOMPLETE_FEATURES.md)
2. Implement comprehensive test suite (see TEST_SETUP.md)
3. Set up error tracking (Sentry recommended)
4. Complete security hardening checklist in [SECURITY.md](./SECURITY.md)
5. Review and complete [DEPLOYMENT.md](./DEPLOYMENT.md) checklist

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

## 👤 Profile Types & Premium Features

HOTMESS supports multiple specialized profile types, each with its own unique view and features:

### Profile Types

1. **Standard Profile** (`profile_type: 'standard'`)
   - Default profile type for all users
   - Basic social features, photos, tags, and connections
   - Component: `src/components/profile/StandardProfileView.jsx`

2. **Seller Profile** (`profile_type: 'seller'`)
   - For users selling products in the marketplace
   - Shows product listings, shop stats, seller ratings
   - Requires XP Purchasing feature flag to be enabled
   - Component: `src/components/profile/SellerProfileView.jsx`

3. **Creator Profile** (`profile_type: 'creator'`)
   - For musicians, artists, and content creators
   - Features:
     - Music releases (beacons with `kind='release'`)
     - Upcoming and past shows/performances
     - Streaming platform links (Spotify, Apple Music, SoundCloud, YouTube)
     - Creator stats (releases, shows, plays)
     - Genre tags and skill listings
   - Component: `src/components/profile/CreatorProfileView.jsx`

4. **Organizer Profile** (`profile_type: 'organizer'`)
   - For event organizers and venue managers
   - Features:
     - Upcoming and past events organized
     - Organizer statistics (total events, RSVPs, attendees, ratings)
     - Venue partnerships display
     - Event specialties/categories
     - Contact for booking CTA
     - Verified organizer badge support
   - Component: `src/components/profile/OrganizerProfileView.jsx`

5. **Premium Profile** (`profile_type: 'premium'`)
   - For creators offering premium/exclusive content
   - Features:
     - Premium content gallery with blur/lock previews
     - Individual content unlock with XP (pay-per-item)
     - Monthly subscriptions for full access
     - Subscriber count and stats
     - Subscription benefits display
   - Component: `src/components/profile/PremiumProfileView.jsx`
   - **Note**: Premium features require database migration `20260128000001_premium_content.sql`

### Enabling Premium Features

**TL;DR**: Set `VITE_XP_PURCHASING_ENABLED=true` and run the migration!

To enable premium content and XP purchasing:

1. **Set the environment variable**:
   ```env
   VITE_XP_PURCHASING_ENABLED=true
   ```
   - Add to `.env.local` for local development
   - Or set in Vercel: Project → Settings → Environment Variables

2. **Run the premium content migration** on your Supabase instance:
   
   **Option A: Using Supabase Dashboard (Recommended)**
   1. Open your Supabase project dashboard
   2. Go to SQL Editor (left sidebar)
   3. Click "New Query"
   4. Copy the entire contents of `supabase/migrations/20260128000001_premium_content.sql`
   5. Paste into the SQL Editor
   6. Click "Run" to execute
   
   **Option B: Using Supabase CLI** (if installed)
   ```bash
   supabase db push
   # Or apply specific migration:
   # supabase migration up --db-url "your-connection-string"
   ```
   
   **What this migration creates:**
   - `subscriptions` table - Creator subscription relationships
   - `premium_unlocks` table - Individual content unlock records
   - `premium_content` table - Premium content metadata
   - `xp_transactions` table - Audit log for all XP transactions
   - RLS policies for secure data access
   - Helper functions (`has_unlocked_content`, `get_subscriber_count`, etc.)
   
   **Verify migration succeeded:**
   ```sql
   -- Run in Supabase SQL Editor to verify tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('subscriptions', 'premium_unlocks', 'premium_content', 'xp_transactions');
   ```
   You should see all 4 tables listed.

3. **Premium API endpoints** are now available:
   - `POST /api/premium/unlock` - Unlock individual content items with XP
   - `POST /api/premium/subscribe` - Subscribe to a creator's premium content

4. **Start using premium features**:
   - Set user's `profile_type = 'premium'` to enable premium profile view
   - Add `is_premium: true` to photo objects in user's `photos` array
   - Users can now unlock content or subscribe to creators using XP

### Setting Profile Types

Profile types are stored in the `User` table's `profile_type` column. To set a user's profile type:

```sql
UPDATE "User" SET profile_type = 'creator' WHERE email = 'user@example.com';
```

Valid values: `'standard'`, `'seller'`, `'creator'`, `'organizer'`, `'premium'`

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

