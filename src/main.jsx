import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from '@/App.jsx'
import '@/styles/tokens.css'
import '@/index.css'
import '@/styles/enhanced-design.css'
import '@/styles/typography.css'
import { initAnalytics } from '@/components/utils/analytics'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { clearBadSupabaseSessions } from '@/lib/clearBadSessions'
import { setupGlobalErrorHandlers } from '@/utils/errorHandler'
import { OSProvider } from '@/os'
import { injectLayerCSSVars } from '@/lib/layerSystem'

// Inject z-index CSS custom properties ASAP so animations never compete
injectLayerCSSVars();

// Vite chunk-load resilience (Phil audit 2026-05-26 found a real production
// failure: after a deploy, an open client kept a reference to the previous
// L2CartSheet bundle hash. The dynamic import 404'd and the cart sheet
// failed to open. This handler catches Vite's preloadError event and
// triggers a single auto-reload to pull the new bundle. Guards against
// reload loops by recording the attempt in sessionStorage.
//
// Same handler also catches generic chunk-load failures bubbled through
// window.error so legacy imports without the vite: event are covered.)
function handleChunkLoadFailure(reason) {
  try {
    const KEY = 'hm_chunk_reload_at';
    const last = Number(sessionStorage.getItem(KEY) || '0');
    const now = Date.now();
    // If we already reloaded in the last 30s, stop — avoids loops when the
    // server itself is broken. Surface the original error instead.
    if (now - last < 30000) {
      console.error('[chunk-load] reload-throttle hit, surfacing error:', reason);
      return false;
    }
    sessionStorage.setItem(KEY, String(now));
    console.warn('[chunk-load] missing chunk detected, reloading:', reason);
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
window.addEventListener('vite:preloadError', (event) => {
  handleChunkLoadFailure(event.payload || event);
});
window.addEventListener('error', (event) => {
  const msg = String(event?.message || '');
  if (/Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk \d+ failed/i.test(msg)) {
    handleChunkLoadFailure(msg);
  }
});
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || event?.reason || '');
  if (/Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk \d+ failed/i.test(msg)) {
    handleChunkLoadFailure(msg);
  }
});

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

// Setup global error handlers
setupGlobalErrorHandlers();

// Initialize analytics
initAnalytics()

const showFatalOverlay = (err) => {
  if (!import.meta.env.DEV) return;
  try {
    const root = document.getElementById('root');
    if (!root) return;
    const message = err instanceof Error ? (err.stack || err.message) : String(err);
    // Fatal error - logged by global error handlers
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
