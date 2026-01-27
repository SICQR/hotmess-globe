import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/lux-brutalist.css'
import { initAnalytics } from '@/components/utils/analytics'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { setupGlobalErrorHandlers } from '@/utils/errorHandler'
import { SkipToContent } from '@/lib/accessibility'
import { WebsiteJsonLd, OrganizationJsonLd } from '@/components/seo/SEO'
import { I18nProvider } from '@/hooks/useTranslation'

// Initialize analytics and error tracking
initAnalytics()

// Setup global error handlers for unhandled rejections and errors
setupGlobalErrorHandlers()

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(() => {
        // Service worker registration failed silently
      });
  });
}

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
      <I18nProvider>
        {/* Skip to main content link for accessibility */}
        <SkipToContent />
        
        {/* Global structured data */}
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        
        {/* Main application */}
        <App />
      </I18nProvider>
    </ErrorBoundary>
  )
} catch (err) {
  showFatalOverlay(err);
}
