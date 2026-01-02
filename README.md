# Hotmess Globe

A Base44 application for global social networking and event management.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe
```

2. Install dependencies:
```bash
npm install
```

3. Create an `.env.local` file with the following variables:

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

Example configuration:
```env
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📝 Available Scripts

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

## 🏗️ Project Structure

```
hotmess-globe/
├── .github/
│   └── workflows/      # CI/CD workflows
├── functions/          # Serverless functions
├── src/
│   ├── api/           # API clients and integrations
│   ├── components/    # React components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility libraries
│   ├── pages/         # Page components
│   ├── test/          # Test setup and utilities
│   └── utils/         # Utility functions
├── index.html
├── package.json
└── vite.config.js
```

## 🔒 Security

### Environment Variables

⚠️ **IMPORTANT**: Never commit sensitive credentials to version control.

- All environment variables should be prefixed with `VITE_` to be exposed to the client
- Store production secrets in your deployment platform's environment variables
- Use `.env.local` for local development (this file is gitignored)

### Security Considerations

1. **Client-side exposure**: Environment variables prefixed with `VITE_` are exposed to the client. Do not store sensitive secrets in these variables.
2. **API Keys**: Mapbox and Supabase keys should be restricted with appropriate security rules and domain restrictions.
3. **Backend proxy**: For sensitive operations, implement backend proxying to avoid exposing keys to the client.

### Security Updates

This project is regularly updated to address security vulnerabilities:
- ✅ All npm CVEs resolved (last check: 2026-01-02)
- ✅ Automated security audits run in CI/CD
- ✅ Dependencies are kept up to date

Run `npm audit` to check for vulnerabilities in dependencies.

## 🧪 Testing

This project uses Vitest and React Testing Library for testing.

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

Test files should be placed alongside the component they test with a `.test.jsx` or `.test.js` extension.

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

- **Lint**: ESLint checks on every push and PR
- **Type Check**: TypeScript type checking
- **Build**: Production build verification
- **Test**: Automated test suite
- **Security**: npm audit for dependency vulnerabilities

Workflow files are located in `.github/workflows/`

## 🚧 Known Incomplete Features

The following features are currently placeholders or incomplete:

- **SoundCloud OAuth Integration** (`functions/pushToSoundCloud.ts`) - Integration flow not implemented
- **QR Ticket Scanner** (`src/components/events/TicketScanner.jsx`) - Scanning logic pending
- **Mock Data in Production** - Some components use mock data generators for development

These features are marked with TODOs in the code and are tracked in the project issues.

## 📦 Tech Stack

- **Framework**: React 18 with Vite 6
- **Styling**: Tailwind CSS with custom components
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Backend**: Base44 SDK
- **Maps**: Mapbox GL
- **Database**: Supabase
- **Payments**: Stripe
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🔗 Related Documentation

- [Base44 SDK Documentation](https://base44.io/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)

