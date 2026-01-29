import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/design-tokens.css'
import '@/styles/lux-brutalist.css'
import { initAnalytics } from '@/components/utils/analytics'
import { initSentry } from '@/lib/sentry'
import ErrorBoundary from '@/components/error/ErrorBoundary'

// Initialize error monitoring first (before any errors can occur)
initSentry()

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
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
} catch (err) {
  showFatalOverlay(err);
}
