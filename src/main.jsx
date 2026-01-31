import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.jsx'
import '@/index.css'
import { initAnalytics } from '@/components/utils/analytics'
import ErrorBoundary from '@/components/error/ErrorBoundary'

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
    // Avoid mutating the React root DOM from a global error handler.
    // It can conflict with React's commit/unmount and cause secondary errors.
    // ErrorBoundary already renders a safe fallback UI.
    console.error('FATAL CLIENT ERROR', message);
  } catch {
    // ignore
  }
};

// In dev, rely on ErrorBoundary + console output.

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  )
} catch (err) {
  showFatalOverlay(err);
}
