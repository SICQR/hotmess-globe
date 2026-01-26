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

**🚀 BETA TESTING READY** (2026-01-26)

### Recent Updates:
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
- ⚠️ **Premium Content**: Coming Soon - premium photo/video unlock not yet implemented
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
