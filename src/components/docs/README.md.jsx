# HOTMESS - LGBT+ Social Network & Nightlife Platform

> **Copy this file to your repository root as `README.md`**

[![CI/CD Pipeline](https://github.com/your-org/hotmess/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/hotmess/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌈 Overview

HOTMESS is a cutting-edge LGBT+ social networking and nightlife discovery platform built on Supabase + Vercel serverless APIs. It combines real-time location-based discovery, gamification, and community features to create an immersive urban nightlife experience.

## ✨ Key Features

### 🌍 Globe Discovery
- Real-time 3D globe visualization with Three.js
- Heat map zones showing activity density
- Beacon-based event and venue discovery
- "Right Now" status for instant connections

### 🎮 Gamification
- XP system with leveling progression
- Venue King challenges and crown competitions
- War multipliers for competitive scanning
- Achievement badges and profile unlocks

### 🛍️ Marketplace
- P2P marketplace with escrow system
- Physical drop beacons for local meetups
- QR-based pickup verification
- Seller profiles and analytics

### 🎵 Radio & Events
- RAW Convict Records integration
- Live radio streaming with track metadata
- Event scraping and curation
- RSVP and ticketing system

### 💬 Social Features
- Telegram-based handshake connections
- Direct messaging and group chats
- AI matchmaking with compatibility scoring
- Squad challenges and tribal communities

### 🛡️ Safety Features
- Safety check-ins with timers
- Panic button with SOS alerts
- Trusted contact management
- Location privacy controls

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- Stripe account (for payments)
- Supabase account (for storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/hotmess.git
cd hotmess

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your environment variables
# Add your Supabase + Stripe keys

# Start development server
npm run dev
```

### Environment Setup

See `.env.example` for required environment variables.

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18, Tailwind CSS, Framer Motion
- **Backend**: Vercel Serverless Functions (`/api/*`)
- **Database**: Supabase Postgres
- **3D Visualization**: Three.js, React Three Fiber
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI, shadcn/ui
- **Maps**: Mapbox GL, React Leaflet
- **Payments**: Stripe
- **Storage**: Supabase

### Key Directories

```
├── components/          # Reusable UI components
│   ├── accessibility/   # A11y features
│   ├── admin/          # Admin dashboard components
│   ├── discovery/      # User discovery & matching
│   ├── events/         # Event management
│   ├── globe/          # 3D globe visualization
│   ├── marketplace/    # P2P marketplace
│   ├── messaging/      # Chat and DMs
│   ├── profile/        # User profiles
│   ├── safety/         # Safety features
│   ├── social/         # Social networking
│   └── utils/          # Shared utilities
├── entities/           # Data models (JSON schemas)
├── api/                # Vercel Serverless Functions
├── pages/              # Top-level page components
└── agents/             # AI agent configurations
```

## 📦 Core Entities

- **User** - Extended with XP, level, membership tier
- **Beacon** - Events, venues, hookups, drops
- **Product** - Marketplace items
- **Order** - Purchase transactions with escrow
- **ZoneBlob** - Real-time activity zones
- **RightNowStatus** - Instant availability
- **VenueKing** - Crown holders per venue
- **UserVibe** - AI-generated character profiles
- **Squad** - Community groups
- **SafetyCheckIn** - Timed safety checks

See `/entities` directory for complete schemas.

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm test             # Run tests (Vitest)
npm audit            # Security vulnerability check
```

### Code Standards

- Use React hooks and functional components
- Implement proper error boundaries
- Add accessibility features (ARIA, keyboard nav)
- Write tests for business logic
- Document complex functions

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 🔐 Security

### Implemented Measures

- Input sanitization (XSS prevention)
- SQL injection protection via Supabase RLS
- Rate limiting on backend functions
- Stripe webhook signature verification
- Age gate and consent management
- User blocking and reporting
- Content moderation queue

### Security Audits

Run `npm audit` regularly to check for vulnerabilities.

## 🌐 Deployment

### Vercel Platform

1. Push code to GitHub
2. Vercel auto-deploys on push to main
3. Monitor deployments in Vercel dashboard

### Environment Variables

Set production secrets in Vercel dashboard:
- `stripe_key` - Stripe secret key
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- Additional secrets as needed

## 📊 Monitoring

### Analytics

- Sentry error tracking
- Custom event tracking via `components/utils/analytics.js`

### Error Tracking

- Error boundaries at layout and page level
- Console error logging (production)
- User-friendly error UI with recovery options

## 🤝 Contributing

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: add your feature"`
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions
- `chore:` - Maintenance tasks

## 📝 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Vercel Platform](https://vercel.com)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Repository](https://github.com/SICQR/hotmess-globe)
- [Issue Tracker](https://github.com/SICQR/hotmess-globe/issues)

## 🙏 Acknowledgments

- Supabase team for the backend
- LGBT+ tech community
- Open source contributors
- RAW Convict Records for music integration

---

**Built with ❤️ by the HOTMESS team**