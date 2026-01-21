import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import * as Sentry from '@sentry/react'

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

// Error tracking (production-safe; no-op unless VITE_SENTRY_DSN is set).
try {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Keep tracing off by default to avoid unexpected quota/overhead.
      tracesSampleRate: 0,
    });
  }
} catch {
  // ignore
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
} catch (err) {
  showFatalOverlay(err);
}

