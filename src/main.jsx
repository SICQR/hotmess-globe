import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAnalytics } from '@/components/utils/analytics'
import ErrorBoundary from '@/components/error/ErrorBoundary'

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
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
} catch (err) {
  showFatalOverlay(err);
}
