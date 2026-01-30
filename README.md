# 🌈 HOTMESS - LGBT+ Social Network & Nightlife Platform

> **A vibrant community hub connecting LGBT+ individuals through social discovery, live events, and nightlife experiences.**

Built with React + Vite, powered by Supabase, and designed for the modern queer community.

[![Beta Testing Ready](https://img.shields.io/badge/status-beta%20testing-success)](DEPLOYMENT.md)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Proprietary-blue)](#)

---

## 🚀 Quick Start (5 Minutes)

**Get HOTMESS running locally in 5 minutes:**

```bash
# 1. Clone and install
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe
npm install

# 2. Configure environment (see Environment Setup below)
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Start development server
npm run dev
# → Open http://localhost:5173
```

**First time? See [Complete Setup Guide](#-complete-setup-guide) below.**

---

## ⚡ Fast Track: Understand & Build (10 Minutes)

**New to the repo? Here's the fastest way to understand and start building:**

### 1️⃣ Understand the App (5 min read)

**Read these 3 files in order:**

1. **[docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md](docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md)** (5 min)
   - **THE SOURCE OF TRUTH** for navigation, routes, and user flows
   - Explains the 7 main tabs: HOME, PULSE, EVENTS, MARKET, SOCIAL, MUSIC, MORE
   - Shows all primary user journeys and CTAs
   - **Start here!** Everything else references this.

2. **[src/pages.config.js](src/pages.config.js)** (2 min)
   - Lists all 60+ pages in the app
   - **To add a new page:** Import your component and add to `PAGES` object
   - This file connects page names to routes

3. **[vercel.json](vercel.json)** (1 min)
   - Routing config: SPA rewrites, API routes, cron jobs
   - Security headers and CSP (Content Security Policy)

**Quick Mental Model:**
```
User visits URL → React Router (App.jsx) → Page from pages.config.js → Components from src/components/
                                                                      ↓
API calls → /api/* (Vercel Functions) → Supabase (database)
```

### 2️⃣ Build the Repo (5 min)

```bash
# Clone, install, configure (copy .env.example to .env.local and add Supabase URL + keys)
git clone https://github.com/SICQR/hotmess-globe.git && cd hotmess-globe && npm install

# Start dev server (opens on localhost:5173)
npm run dev

# In a new terminal: Run type checking (optional but recommended)
npm run typecheck

# Build for production (output → dist/)
npm run build

# Preview production build
npm run preview
```

**Common Build Issues?**
- **Missing env vars:** Copy `.env.example` to `.env.local` and fill in Supabase credentials
- **Node version:** Ensure Node.js 20+ (`node --version`)
- **Port in use:** Change port with `--port 3000` flag on `npm run dev`

### 3️⃣ Make Your First Change (5 min)

**Want to modify the homepage?**

```bash
# 1. Open the Home page component
code src/pages/Home.jsx

# 2. Make a change (e.g., edit headline text on line ~50)
# 3. Save → Vite hot-reloads instantly
# 4. See your change at http://localhost:5173
```

**Want to add a new page?**

```bash
# 1. Create your page component
cat > src/pages/MyNewPage.jsx << 'EOF'
export default function MyNewPage() {
  return <div className="p-8"><h1>My New Page</h1></div>;
}
EOF

# 2. Register it in pages.config.js
# - Import: import MyNewPage from './pages/MyNewPage';
# - Add to PAGES: "MyNewPage": MyNewPage,

# 3. Add route in App.jsx (if custom route needed)
# 4. Visit http://localhost:5173/MyNewPage
```

**Want to add an API endpoint?**

```bash
# 1. Create api/my-endpoint.js
cat > api/my-endpoint.js << 'EOF'
export default async function handler(req, res) {
  return res.status(200).json({ message: 'Hello from API!' });
}
EOF

# 2. For local dev, add route in vite.config.js > localApiRoutes()
# 3. Call from frontend: fetch('/api/my-endpoint')
# 4. Deploys automatically to Vercel as serverless function
```

### 4️⃣ Key Concepts (Know Before You Build)

| Concept | What You Need to Know |
|---------|----------------------|
| **Routing** | React Router handles all routes. Bible routes (e.g., `/events`) + legacy `/${PageKey}` routes both work |
| **Supabase** | Database + auth. Client in `src/components/utils/supabaseClient.jsx`. Uses "Base44 wrapper" for compatibility |
| **API Routes** | All `/api/*` are Vercel Serverless Functions in `api/` directory. Use ESM format: `export default async function handler(req, res)` |
| **Auth** | Managed by `src/lib/AuthContext.jsx`. Access with `useAuth()` hook. Supabase Auth under the hood |
| **Styling** | Tailwind CSS + Shadcn/ui components in `src/components/ui/*`. Use existing components, avoid custom CSS |
| **Env Vars** | Client: `VITE_*` prefix (exposed to browser). Server: no prefix (secrets, API keys). Never commit `.env.local` |
| **Pages** | All pages in `src/pages/`. Register in `src/pages.config.js`. Layout wrapper in `src/Layout.jsx` |

### 5️⃣ Development Workflow

```bash
# Daily workflow
npm run dev              # Start dev server
npm run lint             # Check code quality (runs quietly)
npm run typecheck        # TypeScript validation
npm test                 # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright)

# Before committing
npm run lint:fix         # Auto-fix linting issues
npm run build            # Ensure production build works
```

**CI/CD:**
- Push to branch → GitHub Actions runs lint + typecheck + tests + build
- Merge to `main` → Auto-deploys to Vercel production
- All PR checks must pass before merge

### 6️⃣ Where to Find Things

| Looking for... | Go to... |
|----------------|----------|
| **UI Components** | `src/components/ui/*` (buttons, dialogs, forms) |
| **Page Components** | `src/pages/*` (60+ pages) |
| **API Endpoints** | `api/*` (serverless functions) |
| **Database Migrations** | `supabase/migrations/*` |
| **Hooks** | `src/hooks/*` (custom React hooks) |
| **Utils** | `src/utils/*` (helpers, logger, geolocation) |
| **Styles** | `src/globals.css` + `tailwind.config.js` |
| **Tests** | `src/**/*.test.js` (unit) + `e2e/*` (E2E) |
| **Config** | Root-level `*.config.js` files |
| **Documentation** | `docs/*` + root-level `*.md` files |

**🎯 Pro Tip:** Use VS Code's "Go to File" (Cmd/Ctrl+P) to quickly navigate. Type partial filename to jump anywhere.

---

## 📖 Table of Contents

- [About HOTMESS](#-about-hotmess)
- [Key Features](#-key-features-by-category)
- [Quick Start](#-quick-start-5-minutes)
- [Complete Setup Guide](#-complete-setup-guide)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Development Workflow](#-development-workflow)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Documentation](#-documentation)

---

## 🌈 About HOTMESS

HOTMESS is a **comprehensive social networking and nightlife discovery platform** designed specifically for the LGBT+ community. It's more than just an app—it's a vibrant ecosystem that combines:

- **🗺️ Location-based discovery** - Find people, events, and venues near you with an interactive 3D globe
- **🎉 Live events & nightlife** - Discover parties, performances, and community gatherings
- **💬 Real-time social connections** - Meet people, chat, and build your queer community
- **🎵 Music & culture** - Live radio, music releases, and curated playlists from LGBT+ artists
- **🛍️ Community marketplace** - Support queer-owned businesses and creators
- **🛡️ Safety-first design** - Consent gates, aftercare nudges, and comprehensive safety features

### Current Status

**✅ BETA TESTING READY** (January 2026)

All core features are functional and ready for testing. The platform is production-ready with comprehensive security measures, CI/CD pipelines, and extensive documentation.

---

## ✨ Key Features by Category

### 🌐 Core Navigation (V1.5)

The app is organized around **7 primary tabs**, each with distinct purpose:

| Tab | Purpose | Key Features |
|-----|---------|--------------|
| **HOME** | Dashboard & launcher | Live radio widget, tonight's events, marketplace drops, social discovery, safety check |
| **PULSE** | Interactive map | 3D globe with layers (people, events, venues, safety), location-based discovery |
| **EVENTS** | Nightlife & gatherings | Event discovery, RSVP, calendar integration, promoter tools |
| **MARKET** | Community commerce | Shopify integration, creator products, limited drops, checkout |
| **SOCIAL** | Connect & messages | Profile discovery with travel times, real-time messaging, consent gates |
| **MUSIC** | Radio & releases | Live streaming radio, music releases, DJ profiles, show schedules |
| **MORE** | Tools & settings | Safety center, settings, help center, business dashboards |

### 👤 Profile Types & Personas

HOTMESS supports **5 specialized profile types**, each with custom views and features:

1. **Standard Profile** - Default social features for all users
2. **Seller Profile** - Marketplace listings, shop stats, seller ratings
3. **Creator Profile** - Music releases, shows, streaming links, genre tags
4. **Organizer Profile** - Event management, venue partnerships, booking CTA
5. **Premium Profile** - Exclusive content, subscriptions, pay-per-item unlocks

*Each profile type has its own component in `src/components/profile/*ProfileView.jsx`*

### 🎯 Social Discovery

- **Infinite-scroll profiles grid** with real-time data
- **Travel time calculations** for each profile (walking, driving, biking, uber)
- **Location-based discovery** with privacy-safe GPS bucketing
- **Smart filtering** by distance, interests, availability
- **"Right Now" status** - see who's available in your area

### 🎉 Events & Nightlife

- **Event creation and discovery** with full CRUD operations
- **RSVP system** with capacity management
- **Calendar integration** - add events to your device calendar
- **Ticket scanning** - QR code generation and validation
- **Promoter dashboard** - analytics, attendee management, revenue tracking
- **Automated event scraping** - daily cron job pulls new events

### 💬 Messaging & Communication

- **Real-time chat** using Supabase Realtime
- **Thread management** with read receipts
- **Consent gates** - first message requires explicit consent
- **Safety actions** - report, block, mute within threads
- **Telegram integration** - optional notification bridge

### 🎵 Music & Radio

- **Live streaming radio** - HOTMESS RADIO with live shows
- **Show schedule** - browse upcoming and past shows
- **Music releases** - creator/artist music catalog (beacons with `kind='release'`)
- **SoundCloud integration** - OAuth and upload support
- **Spotify/Apple Music/YouTube** links for artists

### 🛍️ Marketplace

- **Shopify integration** - full storefront with product sync
- **Shopping cart** - persistent cart with Stripe checkout
- **Order history** - track purchases and fulfillment
- **Limited drops** - time-sensitive featured products
- **Creator subscriptions** - monthly access to premium content
- **XP currency** - in-app virtual currency for unlocks

### 🛡️ Safety & Consent

- **18+ age gate** - mandatory verification on first visit
- **Consent-first design** - explicit consent required for first contact
- **Aftercare nudges** - post-interaction wellness check-ins
- **Safety center** - resources, reporting, blocking tools
- **SOS features** - emergency contact, safety check-ins
- **Content reporting** - flag inappropriate content/behavior
- **Care microcopy** - "Ask first. Confirm yes. Respect no."

### 📊 Business Tools

- **Promoter Dashboard** - event analytics, ticket sales, revenue
- **Creator Dashboard** - release performance, show bookings, fan engagement
- **Seller Dashboard** - product listings, orders, shop analytics
- **Business Onboarding** - guided setup for business accounts
- **Admin Dashboard** - platform moderation and management

---

## 🏗️ Complete Setup Guide

### Prerequisites

- **Node.js 20+** (check with `node --version`)
- **npm 9+** (check with `npm --version`)
- **Git** (for cloning the repository)
- **Supabase account** (free tier available at [supabase.com](https://supabase.com))
- **Modern browser** (Chrome, Firefox, Safari, or Edge)

### Step 1: Clone and Install

```bash
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe
npm install
```

This installs all dependencies including React, Vite, Supabase client, and UI libraries.

### Step 2: Environment Setup

**⚠️ CRITICAL: Never commit `.env` or `.env.local` files! They contain secrets.**

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Get your Supabase credentials:**
   - Go to [supabase.com](https://supabase.com) and create/open your project
   - Navigate to **Settings → API**
   - Copy your **Project URL** and **anon public** key

3. **Edit `.env.local`** and add at minimum:
   ```env
   # Client-side (exposed to browser)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Server-side (Vercel Functions - DO NOT use VITE_ prefix)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Optional but recommended variables:**
   ```env
   # Google Maps for routing and travel times
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   
   # Stripe for payments (get from dashboard.stripe.com)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   
   # Feature flags
   VITE_XP_PURCHASING_ENABLED=true  # Enable premium content
   ```

**📚 See [.env.example](.env.example) for the complete list of ~40 environment variables**

### Step 3: Database Setup

1. **Apply migrations** to your Supabase database:
   - Open your Supabase project dashboard
   - Go to **SQL Editor** (left sidebar)
   - Click **New Query**
   - Copy and paste contents of `supabase/migrations/*.sql` files in order
   - Click **Run** to execute

2. **Verify tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

3. **Optional: Seed mock data** for testing:
   ```bash
   npm run seed:mock-profiles
   ```

### Step 4: Start Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

**🎉 You're ready to go!** Create an account and start exploring.

### Alternative Development Servers

```bash
# Listen only on localhost (more secure)
npm run dev:loopback

# Listen on all network interfaces (test on mobile devices)
npm run dev:lan
```

### Verifying Your Setup

1. **Check the homepage loads** at http://localhost:5173
2. **Create a test account** using email/password or social login
3. **Check the browser console** - you should see structured logs (not errors)
4. **Try core features:**
   - Navigate to SOCIAL → should load profiles
   - Navigate to EVENTS → should load event list
   - Navigate to PULSE → should render the 3D globe

**Having issues? See [Troubleshooting](#-troubleshooting) below.**

---

## 📂 Project Structure

```
hotmess-globe/
├── api/                          # Vercel Serverless Functions (ESM)
│   ├── profiles.js               # GET /api/profiles - profiles feed with pagination
│   ├── travel-time.js            # POST /api/travel-time - ETA calculations
│   ├── premium/                  # Premium content & subscriptions
│   ├── shopify/                  # Marketplace integration
│   ├── routing/                  # Google Maps routing & directions
│   ├── notifications/            # Notification processing & dispatch
│   └── events/                   # Event scraping & management
│
├── src/
│   ├── components/               # Reusable React components
│   │   ├── ui/                   # Shadcn/Radix UI primitives
│   │   ├── profile/              # Profile type views (Standard, Creator, Premium, etc.)
│   │   ├── chat/                 # Messaging components
│   │   ├── beacons/              # Event/beacon components
│   │   └── utils/                # Utility components & Supabase client
│   │
│   ├── pages/                    # Page components (registered in pages.config.js)
│   │   ├── Home.jsx              # Dashboard/launcher
│   │   ├── Pulse.jsx             # 3D globe map
│   │   ├── Events.jsx            # Event discovery
│   │   ├── Social.jsx            # Social discovery
│   │   ├── Music.jsx             # Radio & releases
│   │   └── [60+ more pages]
│   │
│   ├── features/                 # Feature-specific logic
│   │   ├── profilesGrid/         # Social grid with infinite scroll
│   │   ├── chat/                 # Real-time messaging
│   │   └── marketplace/          # Shopping cart & checkout
│   │
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries & helpers
│   │   └── AuthContext.jsx       # Authentication state management
│   │
│   ├── api/                      # Client-side API helpers
│   │   ├── base44Client.js       # Base44-compatible Supabase wrapper
│   │   └── presence.js           # Real-time presence tracking
│   │
│   ├── utils/                    # Utility functions
│   │   ├── logger.js             # Structured logging (redacts secrets)
│   │   ├── geolocation.js        # GPS & location services
│   │   └── errorHandler.jsx      # Error boundaries
│   │
│   ├── pages.config.js           # Page registration (add new pages here)
│   ├── App.jsx                   # Main app with React Router
│   └── main.jsx                  # Entry point
│
├── supabase/
│   └── migrations/               # Database migrations (apply in order)
│       └── 20260128000001_premium_content.sql
│
├── functions/                    # [DEPRECATED] Base44 edge functions (use api/ instead)
├── public/                       # Static assets (images, fonts, etc.)
├── .storybook/                   # Storybook configuration
├── e2e/                          # Playwright end-to-end tests
├── docs/                         # Documentation
│   ├── HOTMESS-LONDON-OS-BIBLE-v1.5.md  # Canonical navigation & flows
│   └── PREMIUM_FEATURES_QUICKSTART.md   # Premium setup guide
│
├── .env.example                  # Environment variable template
├── vercel.json                   # Vercel deployment config (crons, headers, rewrites)
├── vite.config.js                # Vite build config + local API middleware
├── tailwind.config.js            # Tailwind CSS configuration
├── package.json                  # Dependencies & scripts
└── README.md                     # This file
```

### Key Architectural Patterns

- **Path alias:** `@/` maps to `src/` (e.g., `import { Button } from '@/components/ui/button'`)
- **Routing:** React Router with Bible routes (`/events`, `/market`) + backward-compatible `/${PageKey}` routes
- **Pages:** Registered in `pages.config.js` - add new pages by importing and adding to `PAGES` object
- **Serverless API:** All `/api/*` routes are Vercel Functions in `api/` directory (ESM format)
- **Local API dev:** Custom Vite middleware in `vite.config.js` handles `/api/*` during `npm run dev`
- **Supabase client:** Centralized in `src/components/utils/supabaseClient.jsx` with Base44 compatibility wrapper

---

## 🏗️ Technology Stack

### Frontend Core

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI component library |
| **Vite** | 6.1 | Build tool and dev server (fast HMR) |
| **React Router** | 6.30 | Client-side routing |
| **TypeScript** | 5.8 | Type checking (via JSDoc + tsconfig.json) |

### Styling & UI

| Technology | Purpose |
|------------|---------|
| **Tailwind CSS** | Utility-first CSS framework |
| **Shadcn/ui** | Pre-built accessible components |
| **Radix UI** | Unstyled, accessible component primitives |
| **Framer Motion** | Animation library |
| **Lucide React** | Icon library (800+ icons) |

### Backend & Data

| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + auth + realtime |
| **Vercel Functions** | Serverless API endpoints (`api/`) |
| **Base44 SDK** | Legacy backend compatibility wrapper |
| **React Query** | Data fetching, caching, and synchronization |

### Maps & Location

| Technology | Purpose |
|------------|---------|
| **Three.js** | 3D graphics for interactive globe |
| **React Leaflet** | 2D interactive maps |
| **Mapbox GL** | Advanced map visualization |
| **Google Maps API** | Routing, directions, and ETAs |

### Payments & Commerce

| Technology | Purpose |
|------------|---------|
| **Stripe** | Payment processing & subscriptions |
| **Shopify** | Product catalog & order management |

### Testing & Quality

| Technology | Purpose |
|------------|---------|
| **Vitest** | Unit and integration testing (Vite-native) |
| **Playwright** | End-to-end browser testing |
| **Testing Library** | React component testing utilities |
| **ESLint** | Code linting and quality checks |

### DevOps & Monitoring

| Technology | Purpose |
|------------|---------|
| **GitHub Actions** | CI/CD pipelines (lint, test, build, deploy) |
| **Vercel** | Hosting and serverless deployment |
| **Sentry** | Error tracking and monitoring (optional) |
| **Storybook** | Component documentation and visual testing |

### Real-time & Communication

| Technology | Purpose |
|------------|---------|
| **Supabase Realtime** | WebSocket-based real-time subscriptions |
| **Web Push API** | Browser push notifications |
| **Telegram Bot API** | Optional notification bridge |

### Key Libraries

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.30.3",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.84.1",
    "@stripe/stripe-js": "^5.2.0",
    "three": "^0.171.0",
    "framer-motion": "^11.16.4",
    "zod": "^3.24.2",
    "date-fns": "^3.6.0",
    "lodash": "^4.17.21"
  }
}
```

**📦 Total dependencies:** ~100+ production + development packages  
**📊 Bundle size:** Optimized with tree-shaking and code-splitting

---

## 💻 Development Workflow

### Daily Development Commands

```bash
# Start development
npm run dev                    # Standard dev server (localhost:5173)
npm run dev:loopback          # Localhost only (more secure)
npm run dev:lan               # Network-accessible (test on mobile)

# Code quality
npm run lint                  # Check for issues (quiet mode)
npm run lint:fix              # Auto-fix linting issues
npm run typecheck             # TypeScript type checking (no emit)

# Testing
npm test                      # Run Vitest (watch mode)
npm run test:run              # Run tests once
npm run test:coverage         # Generate coverage report
npm run test:e2e              # Run Playwright E2E tests
npm run test:e2e:ui           # E2E tests with UI
npm run test:e2e:auth         # Auth smoke test

# Building
npm run build                 # Production build → dist/
npm run build:analyze         # Build with bundle analyzer
npm run preview               # Preview production build

# Utilities
npm run seed:mock-profiles    # Seed test profiles (requires env vars)
npm run storybook             # Start Storybook on :6006
```

### Adding New Features

#### 1. Adding a New Page

```javascript
// 1. Create src/pages/MyFeature.jsx
import { Button } from '@/components/ui/button';

export default function MyFeature() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold">My Feature</h1>
      <Button>Click Me</Button>
    </div>
  );
}

// 2. Register in src/pages.config.js
import MyFeature from './pages/MyFeature';

export const PAGES = {
  // ... existing pages
  "MyFeature": MyFeature,
}

// 3. (Optional) Add custom route in src/App.jsx
// Bible routes like /my-feature or legacy /${PageKey} routes work automatically
```

#### 2. Adding an API Endpoint

```javascript
// Create api/my-feature.js (Vercel Serverless Function)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Your logic here
  const { data, error } = await supabase.from('my_table').select('*');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ data });
}

// For local dev: Add route in vite.config.js > localApiRoutes()
```

#### 3. Adding a UI Component

```javascript
// Create src/components/MyComponent.jsx
import { cn } from '@/lib/utils';

export function MyComponent({ className, children, ...props }) {
  return (
    <div 
      className={cn("p-4 rounded-lg border", className)} 
      {...props}
    >
      {children}
    </div>
  );
}

// Use in pages
import { MyComponent } from '@/components/MyComponent';

<MyComponent className="bg-purple-500">Content</MyComponent>
```

### Environment Variables

**Client-side (exposed to browser):**
- Prefix with `VITE_` (e.g., `VITE_SUPABASE_URL`)
- Available as `import.meta.env.VITE_*` in code
- ⚠️ Never put secrets here!

**Server-side (Vercel Functions only):**
- No `VITE_` prefix (e.g., `SUPABASE_SERVICE_ROLE_KEY`)
- Available as `process.env.*` in `api/*` files
- 🔒 Perfect for API keys and secrets

**Where to set them:**
- **Local dev:** `.env.local` (gitignored)
- **Vercel production:** Project Settings → Environment Variables
- **GitHub Actions:** Repository Settings → Secrets

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add my feature"

# 3. Push and create PR
git push origin feature/my-feature
# Then open PR on GitHub

# 4. CI checks run automatically
# - ESLint
# - TypeScript
# - Vitest tests
# - Playwright E2E
# - Build verification

# 5. Merge after approval and passing checks
# 6. Auto-deploys to Vercel
```

### Code Style Guidelines

- **Use Tailwind CSS** for styling (avoid custom CSS)
- **Use existing components** from `src/components/ui/*`
- **Follow React best practices:** functional components, hooks, prop types
- **Use the logger** from `src/utils/logger.js` (not `console.log`)
- **Handle errors** with try/catch and error boundaries
- **Type your code** with JSDoc comments (TypeScript checking enabled)
- **Keep functions small** (< 50 lines) and single-purpose
- **Test your changes** before pushing

### Local API Development

The dev server includes middleware to handle `/api/*` routes locally:

```javascript
// vite.config.js includes localApiRoutes() middleware
// It:
// 1. Loads .env.local per request (no restart needed for env changes)
// 2. Hydrates req.query from URL params
// 3. Routes to the correct api/*.js handler

// To add a new API route for local dev:
// Edit vite.config.js > localApiRoutes() > add case for your route
```

---

## 📡 API Documentation

### Base URL

- **Production:** `https://your-domain.vercel.app/api`
- **Local dev:** `http://localhost:5173/api`

### Authentication

Most API endpoints require authentication via Supabase access token:

```javascript
// Client-side: Get token from Supabase auth
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Send in Authorization header
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Key Endpoints

#### `GET /api/profiles`
**Profiles feed with pagination**

Query params:
- `cursor` (string): Offset for pagination
- `limit` (number): Results per page (1-60, default 40)

Response:
```json
{
  "items": [
    {
      "id": "profile_abc123",
      "profileName": "Alex",
      "locationLabel": "London",
      "geoLat": 51.5074,
      "geoLng": -0.1278,
      "photos": [{"url": "https://...", "isPrimary": true}],
      "tags": ["tag1", "tag2"]
    }
  ],
  "nextCursor": "40"
}
```

**Client helper:** `src/features/profilesGrid/useInfiniteProfiles.ts`

#### `POST /api/travel-time`
**Calculate travel time between two points**

Request body:
```json
{
  "origin": { "lat": 51.5074, "lng": -0.1278 },
  "destination": { "lat": 51.5099, "lng": -0.1181 }
}
```

Response:
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

**Client helper:** `src/features/profilesGrid/travelTime.ts`

#### `POST /api/premium/unlock`
**Unlock premium content with XP**

Requires: `VITE_XP_PURCHASING_ENABLED=true`

Request body:
```json
{
  "contentId": "content_123",
  "creatorId": "user_456",
  "xpCost": 100
}
```

#### `POST /api/premium/subscribe`
**Subscribe to a creator's premium content**

Request body:
```json
{
  "creatorId": "user_456",
  "tier": "monthly"
}
```

#### `GET /api/shopify/products`
**Fetch Shopify products**

Query params:
- `collection` (string): Collection handle
- `limit` (number): Max results

#### `POST /api/routing/directions`
**Get directions between two points**

Requires: `GOOGLE_MAPS_API_KEY`

Request body:
```json
{
  "origin": "51.5074,-0.1278",
  "destination": "51.5099,-0.1181",
  "mode": "walking"
}
```

**📚 Full API reference:** See individual files in `api/` directory for detailed implementation

---

## 🧪 Testing

### Test Infrastructure

- **Unit/Integration:** Vitest (Vite-native test runner)
- **Component:** Testing Library React
- **E2E:** Playwright (browser automation)
- **Coverage:** V8 coverage (via Vitest)

### Running Tests

```bash
# Unit/integration tests
npm test                      # Watch mode
npm run test:run              # Run once
npm run test:run:verbose      # Verbose output
npm run test:ui               # Visual test UI
npm run test:coverage         # Generate coverage report

# E2E tests
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui           # Playwright UI mode
npm run test:e2e:headed       # Run with visible browser
npm run test:e2e:auth         # Auth flow smoke test

# Full CI suite
npm run test:ci               # Runs: lint + typecheck + test + e2e
```

### Writing Tests

#### Unit Test Example

```javascript
// src/utils/myFunction.test.js
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

#### Component Test Example

```javascript
// src/components/MyComponent.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent>Test</MyComponent>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

#### E2E Test Example

```javascript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign in', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Sign In');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/home');
});
```

### E2E Auth Smoke Test

Special focused test for core member flow:

```bash
# Requires env vars:
E2E_EMAIL=test@example.com
E2E_PASSWORD=yourpassword
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

npm run test:e2e:auth
```

Tests: Auth → Social → New Message → Send

### Test Coverage Goals

- **Unit tests:** Critical utility functions and business logic
- **Component tests:** Reusable UI components
- **E2E tests:** Critical user journeys (auth, social, checkout)
- **Target coverage:** 60%+ for core features

**📚 Full testing guide:** [TEST_SETUP.md](TEST_SETUP.md)

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

**Automatic deployment is configured!** Push to `main` branch → auto-deploys to production.

#### First-Time Setup

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite configuration

2. **Configure build settings:**
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Set environment variables:**
   - Go to Project → Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set for Production, Preview, and Development environments

4. **Deploy:**
   - Push to `main` branch
   - Or click "Deploy" in Vercel dashboard
   - Build logs appear in real-time

#### Vercel ↔ Supabase Direct Integration

**Recommended:** Connect Vercel and Supabase directly for auto-synced env vars:

1. Visit [Vercel Marketplace → Supabase](https://vercel.com/integrations/supabase)
2. Install integration and link your Supabase project
3. Auto-syncs: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
4. No need to manually set these in Vercel!

#### Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel
- [ ] Supabase migrations applied
- [ ] `npm run build` succeeds locally
- [ ] `npm run test:ci` passes
- [ ] Security checklist reviewed ([SECURITY.md](SECURITY.md))
- [ ] CSP headers configured in `vercel.json`
- [ ] Domain configured (optional)
- [ ] Analytics/error tracking enabled (optional)

**📚 Full deployment guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

### Alternative Platforms

#### Netlify

```bash
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### AWS S3 + CloudFront

```bash
npm run build
aws s3 sync dist/ s3://your-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

#### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "run", "preview"]
EXPOSE 4173
```

### CI/CD Pipeline

**GitHub Actions workflows** (`.github/workflows/`):

- **On Pull Request:**
  - Lint code (ESLint)
  - Type check (TypeScript)
  - Run unit tests (Vitest)
  - Run E2E tests (Playwright)
  - Build application
  - Post status checks

- **On Push to Main:**
  - All PR checks
  - Deploy to Vercel production
  - Run post-deployment smoke tests

**📚 CI/CD documentation:** [CI_CD_SETUP.md](CI_CD_SETUP.md)

### Vercel Cron Jobs

Scheduled tasks configured in `vercel.json`:

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 3 * * *` | `/api/events/cron` | Daily event scraping (3 AM UTC) |
| `*/5 * * * *` | `/api/notifications/process` | Process notification queue |
| `*/5 * * * *` | `/api/notifications/dispatch` | Send pending notifications |
| `20 4 * * *` | `/api/admin/cleanup/rate-limits` | Clean old rate limit records |
| `*/15 * * * *` | `/api/safety/check-ins` | Process safety check-ins |
| `*/2 * * * *` | `/api/telegram/send` | Telegram notification bridge |

**Protect cron endpoints** with secrets:
```env
EVENT_SCRAPER_CRON_SECRET=your_secret
OUTBOX_CRON_SECRET=your_secret
RATE_LIMIT_CLEANUP_SECRET=your_secret
```

---

## 🔒 Security

**✅ Security Audit Completed** (January 2026)
- 0 npm vulnerabilities remaining
- Automated security scanning in CI/CD
- Comprehensive security documentation

### Security Best Practices

#### Environment Variables

```bash
# ❌ DON'T: Use VITE_ for secrets
VITE_STRIPE_SECRET_KEY=sk_live_xxx  # ❌ EXPOSED TO BROWSER!

# ✅ DO: Use VITE_ only for public values
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # ✅ Safe for browser

# ✅ DO: Keep secrets server-side (no VITE_ prefix)
STRIPE_SECRET_KEY=sk_live_xxx  # ✅ Only in Vercel Functions
SUPABASE_SERVICE_ROLE_KEY=xxx  # ✅ Never exposed to client
```

#### Content Security Policy

Configured in `vercel.json`:
- `script-src`: Only self, Stripe, SoundCloud, Vercel Live
- `connect-src`: Only trusted APIs (Supabase, Stripe, etc.)
- `frame-src`: Limited to payment/embed iframes
- `default-src 'self'`: Deny by default

#### Authentication

- **Supabase Auth** with row-level security (RLS)
- **JWT tokens** in HTTP-only cookies
- **Session management** via `AuthContext`
- **Protected routes** check authentication before rendering

#### Data Protection

- **Input validation** with Zod schemas
- **SQL injection prevention** via Supabase parameterized queries
- **XSS prevention** via React's built-in escaping
- **CSRF protection** via SameSite cookies

### Security Checklist

**Before deploying:**
- [ ] No secrets in client code (check `VITE_*` vars)
- [ ] All API endpoints validate authentication
- [ ] Input sanitization on all user inputs
- [ ] CSP headers configured correctly
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Dependency vulnerabilities resolved (`npm audit`)

### Reporting Security Issues

**Found a vulnerability?**
- Email: security@sicqr.com (update with actual contact)
- **Do not** open public GitHub issues for security vulnerabilities
- We aim to respond within 48 hours

### Automated Security

- **Daily npm audit** via GitHub Actions
- **Secret scanning** with TruffleHog on every commit
- **CodeQL analysis** on all pull requests
- **Dependabot** alerts for vulnerable dependencies

**📚 Full security guide:** [SECURITY.md](SECURITY.md)

---

## 🤝 Contributing

We welcome contributions from the community!

### Before You Start

1. **Read the docs:**
   - [SECURITY.md](SECURITY.md) - Security guidelines
   - [CODE_QUALITY_RECOMMENDATIONS.md](CODE_QUALITY_RECOMMENDATIONS.md) - Code standards
   - [docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md](docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md) - Product navigation
   - [INCOMPLETE_FEATURES.md](INCOMPLETE_FEATURES.md) - Known limitations

2. **Check existing issues:**
   - [ISSUES-TRACKER.md](ISSUES-TRACKER.md) - Current priorities
   - GitHub Issues tab - Open issues and discussions

### Contribution Workflow

1. **Fork the repository**
   ```bash
   # On GitHub: Click "Fork" button
   git clone https://github.com/YOUR_USERNAME/hotmess-globe.git
   cd hotmess-globe
   git remote add upstream https://github.com/SICQR/hotmess-globe.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-fix
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests for new features
   - Update documentation if needed

4. **Test your changes**
   ```bash
   npm run lint          # Check code quality
   npm run typecheck     # TypeScript validation
   npm test              # Unit tests
   npm run test:e2e      # E2E tests
   npm run build         # Verify build works
   ```

5. **Commit with conventional commits**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   # or: fix:, docs:, style:, refactor:, test:, chore:
   ```

6. **Push and create Pull Request**
   ```bash
   git push origin feature/amazing-feature
   # Then open PR on GitHub
   ```

7. **Fill out PR template**
   - Describe your changes
   - Link related issues
   - Complete security checklist
   - Add screenshots for UI changes

8. **Wait for review**
   - CI checks must pass (lint, typecheck, tests, build)
   - At least one approval required
   - Address review feedback

### Code Quality Requirements

All PRs must pass:
- ✅ `npm run lint` (ESLint)
- ✅ `npm run typecheck` (TypeScript)
- ✅ `npm run test:run` (Vitest)
- ✅ `npm run test:e2e` (Playwright)
- ✅ `npm run build` (production build)
- ✅ Security checklist completed

### What We're Looking For

**High Priority:**
- Bug fixes
- Security improvements
- Performance optimizations
- Accessibility improvements
- Test coverage increases
- Documentation updates

**Medium Priority:**
- New features (discuss first in an issue)
- UI/UX improvements
- Code refactoring

**Low Priority:**
- Stylistic changes
- Dependencies updates (unless security-related)

### Code Style

- **JavaScript/JSX:** ES6+, functional components, hooks
- **Styling:** Tailwind CSS utility classes
- **Components:** Reuse from `src/components/ui/*`
- **Formatting:** Handled by ESLint
- **Comments:** JSDoc for functions, inline for complex logic
- **File naming:** `PascalCase.jsx` for components, `camelCase.js` for utilities

### Commit Message Format

```
<type>(<scope>): <short summary>

<body (optional)>

<footer (optional)>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(social): add travel time to profile cards
fix(auth): prevent duplicate session creation
docs(readme): update deployment instructions
test(api): add tests for profiles endpoint
```

---

## 🐛 Troubleshooting

### Common Issues

#### Build Fails

**Problem:** `npm run build` fails with errors

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Check Node version (must be 20+)
node --version

# Try with clean environment
npm run build -- --clearScreen
```

#### Dev Server Won't Start

**Problem:** `npm run dev` fails or port already in use

**Solutions:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :5173   # Windows (find PID, then taskkill /PID xxxx)

# Use different port
npm run dev -- --port 3000

# Check for errors in .env.local
cat .env.local  # Verify format and values
```

#### Supabase Connection Fails

**Problem:** API calls fail with "Invalid API key" or connection errors

**Solutions:**
```bash
# 1. Verify environment variables are set
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# 2. Check .env.local exists and has correct values
cat .env.local

# 3. Restart dev server after changing .env.local
# Ctrl+C, then npm run dev

# 4. Verify Supabase project is active
# Go to supabase.com and check project status

# 5. Check for typos in keys (no spaces, no quotes)
```

#### TypeScript Errors

**Problem:** `npm run typecheck` fails

**Solutions:**
```bash
# Install type definitions
npm install --save-dev @types/node @types/react @types/react-dom

# Clear TypeScript cache
rm -rf node_modules/.cache

# Check tsconfig.json is valid
cat tsconfig.json
```

#### Tests Fail

**Problem:** `npm test` or `npm run test:e2e` fail

**Solutions:**
```bash
# Unit tests
npm run test:run -- --reporter=verbose  # See detailed output

# E2E tests
npm run test:e2e:headed  # Run with visible browser to see what's happening

# Clear test cache
rm -rf node_modules/.vitest

# Check environment variables required for tests
cat .env.local | grep E2E
```

#### Import Errors

**Problem:** `Cannot find module '@/components/...'`

**Solutions:**
```javascript
// The @ alias is configured in vite.config.js
// Verify it exists and points to 'src'

// vite.config.js
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},

// If using VSCode, reload window: Cmd+Shift+P → "Reload Window"
```

#### Deployment Issues

**Problem:** App works locally but fails on Vercel

**Solutions:**
```bash
# 1. Check build logs in Vercel dashboard
# Look for missing env vars or build errors

# 2. Verify all env vars are set in Vercel
# Project → Settings → Environment Variables

# 3. Test production build locally
npm run build
npm run preview

# 4. Check vercel.json is valid JSON
cat vercel.json | jq  # Validates JSON syntax

# 5. Check Vercel function logs
# Go to Vercel → Deployments → Functions tab
```

### Getting Help

1. **Check documentation:**
   - This README
   - [TROUBLESHOOTING_CI.md](TROUBLESHOOTING_CI.md) - CI/CD issues
   - [TEST_SETUP.md](TEST_SETUP.md) - Testing issues
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment issues

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/SICQR/hotmess-globe/issues)
   - [GitHub Discussions](https://github.com/SICQR/hotmess-globe/discussions)

3. **Ask for help:**
   - Open a new GitHub issue with:
     - Clear problem description
     - Steps to reproduce
     - Error messages/screenshots
     - Environment info (OS, Node version, browser)

4. **Community:**
   - GitHub Discussions for questions
   - Discord/Slack (if available - update this section)

---

## 📚 Documentation

### Essential Reading

**Start here:**
1. **[README.md](README.md)** ← You are here
2. **[docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md](docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md)** - Navigation & flows ⭐

**Setup:**
3. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
4. **[TEST_SETUP.md](TEST_SETUP.md)** - Testing infrastructure
5. **[CI_CD_SETUP.md](CI_CD_SETUP.md)** - CI/CD pipeline

**Security & Quality:**
6. **[SECURITY.md](SECURITY.md)** - Security best practices ⭐
7. **[CODE_QUALITY_RECOMMENDATIONS.md](CODE_QUALITY_RECOMMENDATIONS.md)** - Code standards

**Feature Documentation:**
8. **[docs/PREMIUM_FEATURES_QUICKSTART.md](docs/PREMIUM_FEATURES_QUICKSTART.md)** - Premium content setup
9. **[INCOMPLETE_FEATURES.md](INCOMPLETE_FEATURES.md)** - Known limitations
10. **[ISSUES-TRACKER.md](ISSUES-TRACKER.md)** - Sprint planning

### Additional Resources

**Analysis & Planning:**
- [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) - High-level overview
- [HYPER-ANALYSIS-REPORT.md](HYPER-ANALYSIS-REPORT.md) - Comprehensive codebase analysis
- [FEATURES_USP_CTA_AUDIT.md](FEATURES_USP_CTA_AUDIT.md) - Feature audit
- [NEXT_SPRINT_PLAN.md](NEXT_SPRINT_PLAN.md) - Upcoming work

**Technical Guides:**
- [docs/SOUNDCLOUD_API_FIELD_REQUIREMENTS.md](docs/SOUNDCLOUD_API_FIELD_REQUIREMENTS.md) - SoundCloud integration
- [docs/SMART_UI_SYSTEM.md](docs/SMART_UI_SYSTEM.md) - UI component system
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - End-user documentation

**Troubleshooting:**
- [TROUBLESHOOTING_CI.md](TROUBLESHOOTING_CI.md) - CI/CD issues
- [PR_FAILURE_ANALYSIS.md](PR_FAILURE_ANALYSIS.md) - PR debug guide

### Documentation Standards

When adding documentation:
- Use Markdown format
- Include table of contents for long docs
- Add code examples
- Keep language clear and concise
- Update this README's doc list
- Link to related documentation

---

## 📱 Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| **Chrome** | Last 2 versions | ✅ Fully supported |
| **Firefox** | Last 2 versions | ✅ Fully supported |
| **Safari** | Last 2 versions | ✅ Fully supported |
| **Edge** | Last 2 versions | ✅ Fully supported |
| **Mobile Safari** | iOS 14+ | ✅ Fully supported |
| **Chrome Android** | Last 2 versions | ✅ Fully supported |

### Progressive Web App (PWA)

HOTMESS works as a PWA on mobile devices:
- **Install to home screen** supported
- **Offline mode** (limited - auth required)
- **Push notifications** (when enabled)

---

## 🌟 Acknowledgments

- **The LGBT+ community** for inspiration and support
- **All contributors** who help make this platform better
- **Open source projects** that power HOTMESS:
  - React, Vite, Supabase, Tailwind CSS, Radix UI
  - Three.js, Framer Motion, React Query, and many more

---

## 📝 License

[Add license information - currently proprietary]

---

## 📧 Contact & Support

### For Users
- **Help Center:** `/help` in the app
- **Community Guidelines:** `/community-guidelines`
- **Safety Center:** `/safety`

### For Developers
- **GitHub Issues:** [Report bugs or request features](https://github.com/SICQR/hotmess-globe/issues)
- **GitHub Discussions:** [Ask questions or discuss ideas](https://github.com/SICQR/hotmess-globe/discussions)
- **Email:** dev@sicqr.com (update with actual contact)

### For Business
- **Promoter/Organizer inquiries:** Contact via `/contact` in app
- **Partnership opportunities:** business@sicqr.com (update with actual contact)

---

<div align="center">

**Made with 🏳️‍🌈 for the LGBT+ community**

⭐ **Star this repo** if you find it useful!

[Report Bug](https://github.com/SICQR/hotmess-globe/issues) • [Request Feature](https://github.com/SICQR/hotmess-globe/issues) • [View Demos](#)

</div>
