# Hotmess Globe

A feature-rich LGBT+ social networking and nightlife discovery platform built with React + Vite, with Supabase as the backend for auth and data.

## 📋 Project Status

**⚠️ IMPORTANT**: This project requires immediate attention. See comprehensive analysis reports:
- 📊 [**HYPER-ANALYSIS-REPORT.md**](./HYPER-ANALYSIS-REPORT.md) - Complete codebase analysis
- 📋 [**ISSUES-TRACKER.md**](./ISSUES-TRACKER.md) - Trackable issues and sprint planning

**Critical Actions Needed**:
1. Install dependencies: `npm install`
2. Fix security vulnerabilities: `npm audit fix`
3. Set up CI/CD pipeline
4. Implement test infrastructure

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

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

   Copy `.env.example` to `.env.local` and fill in at least the required Supabase values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

   Optional (used by uploads):
   ```
   VITE_SUPABASE_STORAGE_BUCKET=public
   ```

   Note: Legacy Base44 env vars may still appear in `.env.example` during migration, but Supabase is the intended source of truth.

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Supabase RLS (important)

If Row Level Security (RLS) is enabled without policies, the app may sign in but fail to read/write tables.

- See `supabase/README.md`
- Apply the starter policies in `supabase/policies.sql`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking (`tsc --noEmit`)

## ▲ Deploying to Vercel

This repo is a Vite SPA using React Router. Deep links like `/${PageKey}` require an SPA rewrite.

- Vercel settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
- Environment Variables (Vercel Project → Settings → Environment Variables):
   - Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Optional: `VITE_SUPABASE_STORAGE_BUCKET`
   - Optional (removes Base44 proxy warning): `VITE_BASE44_APP_BASE_URL` (set to your production URL)
- Routing:
   - `vercel.json` includes an SPA rewrite to `index.html` for all routes.

## 📖 Documentation

- [Hyper Analysis Report](./HYPER-ANALYSIS-REPORT.md) - Comprehensive codebase analysis
- [Issues Tracker](./ISSUES-TRACKER.md) - Prioritized issues and sprint planning
- [London OS Bible v1.5](./docs/London-OS-Bible-v1.5.md) - Product + routing + gating spec grounded in repo code

## 🔒 Security

This project has known security vulnerabilities that need immediate attention. See [HYPER-ANALYSIS-REPORT.md](./HYPER-ANALYSIS-REPORT.md#-critical-findings) for details.

## 🤝 Contributing

Please read the [Issues Tracker](./ISSUES-TRACKER.md) for guidelines on contributing to this project.

## 📝 License

[Add license information]
