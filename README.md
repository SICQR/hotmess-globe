# HOTMESS - LGBT+ Social Network & Nightlife Platform

A comprehensive social networking and nightlife discovery platform designed specifically for the LGBT+ community. Built with modern web technologies including React, Vite, and Base44 SDK.

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

**✅ SECURITY AUDIT COMPLETED** (2026-01-03)

### Recent Updates:
- ✅ **All npm security vulnerabilities fixed** (0 vulnerabilities remaining)
- ✅ **CI/CD pipeline implemented** (GitHub Actions workflows)
- ✅ **Security documentation created** (SECURITY.md)
- ✅ **Structured logging system added** (replaces unsafe console statements)
- ✅ **Code quality improvements** (fixed parsing errors, removed invalid file extensions)

### 📚 Important Documentation:
- 🔒 [**SECURITY.md**](./SECURITY.md) - Security best practices and policies
- 🚀 [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Deployment checklist and guide
- 📊 [**CODE_QUALITY_RECOMMENDATIONS.md**](./CODE_QUALITY_RECOMMENDATIONS.md) - Code improvement roadmap
- 🚧 [**INCOMPLETE_FEATURES.md**](./INCOMPLETE_FEATURES.md) - Known limitations and TODOs
- 📋 [**ISSUES-TRACKER.md**](./ISSUES-TRACKER.md) - Trackable issues and sprint planning
- 🔧 [**CI_CD_SETUP.md**](./CI_CD_SETUP.md) - CI/CD pipeline documentation
- 🧪 [**TEST_SETUP.md**](./TEST_SETUP.md) - Testing infrastructure setup guide

### ⚠️ Before Production Deployment:
1. Review [SECURITY.md](./SECURITY.md) for security best practices
2. Complete items in [INCOMPLETE_FEATURES.md](./INCOMPLETE_FEATURES.md)
3. Set up error tracking (Sentry recommended)
4. Implement test suite (see TEST_SETUP.md)
5. Review and complete [DEPLOYMENT.md](./DEPLOYMENT.md) checklist

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
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
   VITE_BASE44_APP_ID=your_app_id
   VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
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
- `npm run typecheck` - Run TypeScript type checking

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

This application can be deployed to various platforms:

- **Vercel** - Recommended for Vite applications
- **Netlify** - Easy deployment with continuous integration
- **AWS S3 + CloudFront** - Enterprise-grade hosting
- **GitHub Pages** - Free hosting for open-source projects

See [CI_CD_SETUP.md](./CI_CD_SETUP.md) for automated deployment configuration.

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
