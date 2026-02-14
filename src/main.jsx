import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.jsx'
import '@/index.css'
import { initAnalytics } from '@/components/utils/analytics'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { clearBadSupabaseSessions } from '@/lib/clearBadSessions'
import { OSProvider } from '@/os'

// FIRST: Clear any cached sessions from wrong Supabase projects
// This MUST run before Supabase client initializes
clearBadSupabaseSessions();

// Initialize Sentry as early as possible
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

// Initialize analytics
initAnalytics()

const showFatalOverlay = (err) => {
  if (!import.meta.env.DEV) return;
  try {
    const root = document.getElementById('root');
    if (!root) return;
    const message = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error('FATAL CLIENT ERROR', message);
  } catch {
    // ignore
  }
};

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
      <ErrorBoundary>
        <OSProvider>
          <App />
        </OSProvider>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  )
} catch (err) {
  showFatalOverlay(err);
}
