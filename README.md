# Hotmess Globe

A feature-rich LGBT+ social networking and nightlife discovery platform built with React, Vite, and Base44 SDK.

## ✅ Project Status (Updated: January 2026)

**Recent Improvements**:
- ✅ All 8 npm security vulnerabilities have been fixed (0 vulnerabilities)
- ✅ CI/CD workflow established with GitHub Actions
- ✅ Test infrastructure added with Vitest and React Testing Library
- ✅ Invalid file extensions fixed and duplicate files removed

**Ongoing**:
- ⚠️ Linting warnings (unused imports) need cleanup
- 📊 Additional test coverage needed
- 📋 See [**ISSUES-TRACKER.md**](./ISSUES-TRACKER.md) for remaining work

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm 10+

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
   
   Copy `.env.example` to `.env.local` and configure:
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   - `VITE_BASE44_APP_ID` - Your Base44 application ID
   - `VITE_BASE44_APP_BASE_URL` - Your Base44 backend URL
   - `VITE_MAPBOX_ACCESS_TOKEN` - Mapbox API token for map features
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
   - `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

   Example:
   ```
   VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
   VITE_BASE44_APP_BASE_URL=https://my-app.base44.app
   VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage report

## 🧪 Testing

This project uses Vitest and React Testing Library for testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

Tests should be placed alongside the component with a `.test.jsx` extension.

Example:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 🔄 CI/CD

This project uses GitHub Actions for continuous integration:

- **Lint & Build**: ESLint, TypeScript type checking, production build, and tests
- **Security**: npm audit for dependency vulnerabilities

Workflow files are located in `.github/workflows/`

## 🔒 Security

✅ All known security vulnerabilities have been resolved. Run `npm audit` to verify:

```bash
npm audit
# Expected: found 0 vulnerabilities
```

For security issues, please see [SECURITY.md](./SECURITY.md) (coming soon).

## 📖 Documentation

- [Hyper Analysis Report](./HYPER-ANALYSIS-REPORT.md) - Comprehensive codebase analysis
- [Issues Tracker](./ISSUES-TRACKER.md) - Prioritized issues and sprint planning
- [CHANGELOG.md](./CHANGELOG.md) - Technical changes and version history (coming soon)

## 🏗️ Project Structure

```
hotmess-globe/
├── .github/workflows/    # CI/CD workflows
├── functions/           # Serverless functions
├── src/
│   ├── api/            # API clients
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utility libraries
│   ├── pages/          # Page components
│   ├── test/           # Test setup
│   └── utils/          # Utility functions
├── .env.example        # Environment variable template
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite configuration
```

## 💡 Key Features

- **Globe Visualization**: Interactive 3D globe for discovering nightlife and events
- **Social Networking**: Connect with users, create posts, and engage with the community
- **Events Management**: Create, discover, and RSVP to events
- **Marketplace**: Buy and sell tickets and merchandise
- **Real-time Messaging**: Chat with other users
- **Safety Features**: Panic button, location sharing, and safety settings
- **Gamification**: Points, levels, and achievements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please read [Issues Tracker](./ISSUES-TRACKER.md) for guidelines on contributing.

## 📝 License

[Add license information]

## 🔗 Links

- [Base44 SDK Documentation](https://base44.io/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)

