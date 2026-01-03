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

**⚠️ IMPORTANT**: This project requires immediate attention. See comprehensive analysis reports:
- 📊 [**HYPER-ANALYSIS-REPORT.md**](./HYPER-ANALYSIS-REPORT.md) - Complete codebase analysis
- 📋 [**ISSUES-TRACKER.md**](./ISSUES-TRACKER.md) - Trackable issues and sprint planning
- 🔧 [**CI_CD_SETUP.md**](./CI_CD_SETUP.md) - CI/CD pipeline setup guide
- 🧪 [**TEST_SETUP.md**](./TEST_SETUP.md) - Testing infrastructure setup guide

**Critical Actions Needed**:
1. Install dependencies: `npm install`
2. Fix security vulnerabilities: `npm audit fix`
3. Set up CI/CD pipeline (see [CI_CD_SETUP.md](./CI_CD_SETUP.md))
4. Implement test infrastructure (see [TEST_SETUP.md](./TEST_SETUP.md))

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
   
   Create an `.env.local` file with the following variables:
   ```
   VITE_BASE44_APP_ID=your_app_id
   VITE_BASE44_APP_BASE_URL=your_backend_url
   ```

   Example:
   ```
   VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
   VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
   ```

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

This project has known security vulnerabilities that need immediate attention. See [HYPER-ANALYSIS-REPORT.md](./HYPER-ANALYSIS-REPORT.md#-critical-findings) for details.

### Security Best Practices
- Never commit sensitive credentials or API keys
- Use environment variables for all configuration
- Keep dependencies up to date with `npm audit fix`
- Review the [Security Policy](./SECURITY.md) for reporting vulnerabilities

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read the [Issues Tracker](./ISSUES-TRACKER.md) for current priorities and guidelines.

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
