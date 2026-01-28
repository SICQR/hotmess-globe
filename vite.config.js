import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config as dotenvConfig } from 'dotenv'

// Pre-load environment variables from .env.local for API routes
dotenvConfig({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const importFresh = async (relativePath) => {
  const href = pathToFileURL(path.resolve(__dirname, relativePath)).href;
  // Cache-bust so edits to handler files are picked up without restarting.
  const mod = await import(`${href}?t=${Date.now()}`);
  return mod?.default;
};

const VITE_ENV_FILES_ORDER = (mode) => [
  '.env',
  '.env.local',
  `.env.${mode}`,
  `.env.${mode}.local`,
];

const readEnvKeyFromFiles = ({ envDir, mode, key }) => {
  if (!envDir || !mode || !key) return null;

  let value = null;
  for (const filename of VITE_ENV_FILES_ORDER(mode)) {
    const fullPath = path.resolve(envDir, filename);
    if (!fs.existsSync(fullPath)) continue;

    let text = '';
    try {
      text = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    for (const rawLine of text.split(/\n/)) {
      const line = rawLine.replace(/\r$/, '');
      if (!line || /^\s*#/.test(line)) continue;

      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      if (match[1] !== key) continue;

      let next = match[2] ?? '';
      const quoted =
        (next.startsWith('"') && next.endsWith('"')) ||
        (next.startsWith("'") && next.endsWith("'"));
      if (!quoted) next = next.split('#')[0];
      next = next.trim();
      if (
        (next.startsWith('"') && next.endsWith('"')) ||
        (next.startsWith("'") && next.endsWith("'"))
      ) {
        next = next.slice(1, -1);
      }

      value = next;
    }
  }

  return value && String(value).trim() ? String(value) : null;
};

function localApiRoutes() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      let loggedEnvReloadError = false;
      server.middlewares.use((req, res, next) => {
        const method = (req.method || 'GET').toUpperCase();
        const url = req.url || '';
        const path = url.split('?')[0];

        // Vercel-style handlers often expect `req.query`.
        // Vite's dev server (connect) does not populate it by default.
        try {
          const parsed = new URL(url, 'http://localhost');
          req.query = Object.fromEntries(parsed.searchParams.entries());
        } catch {
          // ignore
        }

        // Add Express/Vercel-like helper methods to response
        if (!res.status) {
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
        }
        if (!res.json) {
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };
        }

        // Reload env on each request so `.env.local` edits apply without a restart.
        try {
          const mode = server?.config?.mode || process.env.NODE_ENV || 'development';
          const envDir = server?.config?.envDir || server?.config?.root || process.cwd();
          const env = loadEnv(mode, envDir, '');
          Object.assign(process.env, env);

          // If a shell exported an empty value, Vite's env loading can preserve
          // the empty string instead of the file value. For security-sensitive
          // keys, explicitly prefer the .env* file value when the runtime value
          // is empty.
          for (const key of ['TICKET_QR_SIGNING_SECRET', 'QR_SIGNING_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) {
            const current = process.env[key];
            const isEmpty = typeof current === 'string' && current.trim().length === 0;
            if (!isEmpty) continue;

            const fromFiles = readEnvKeyFromFiles({ envDir, mode, key });
            if (fromFiles) process.env[key] = fromFiles;
          }
        } catch {
          if (!loggedEnvReloadError) {
            loggedEnvReloadError = true;
            // Keep this short: it's only for local debugging.
            console.error('[local-api-routes] Failed to reload env from .env.local/.env files');
          }
        }

        if (path === '/api/shopify/import' && (method === 'POST' || method === 'GET')) {
          return importFresh('./api/shopify/import.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load import handler' }));
            });
        }

        if (path === '/api/shopify/sync' && (method === 'POST' || method === 'GET')) {
          return importFresh('./api/shopify/sync.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load sync handler' }));
            });
        }

        if (path === '/api/shopify/product' && method === 'GET') {
          return importFresh('./api/shopify/product.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load product handler' }));
            });
        }

        if (path === '/api/shopify/collections' && method === 'GET') {
          return importFresh('./api/shopify/collections.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load collections handler' }));
            });
        }

        if (path === '/api/shopify/collection' && method === 'GET') {
          return importFresh('./api/shopify/collection.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load collection handler' }));
            });
        }

        if (path === '/api/shopify/featured' && method === 'GET') {
          return importFresh('./api/shopify/featured.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load featured handler' }));
            });
        }

        if (path === '/api/shopify/cart' && (method === 'POST' || method === 'GET')) {
          return importFresh('./api/shopify/cart.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load cart handler' }));
            });
        }

        if (path === '/api/health' && method === 'GET') {
          return importFresh('./api/health.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load health handler' }));
            });
        }

        if (path === '/api/time/now' && method === 'GET') {
          return importFresh('./api/time/now.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load time now handler' }));
            });
        }

        // Event scraper endpoints (handled locally in dev)
        if (path === '/api/events/scrape' && method === 'POST') {
          return importFresh('./api/events/scrape.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load scrape handler' }));
            });
        }

        if (path === '/api/events/cron' && (method === 'POST' || method === 'GET')) {
          return importFresh('./api/events/cron.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load cron handler' }));
            });
        }

        if (path === '/api/events/diag' && method === 'GET') {
          return importFresh('./api/events/diag.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load diag handler' }));
            });
        }

        // Connect proximity endpoints (handled locally in dev)
        if (path === '/api/nearby' && method === 'GET') {
          return importFresh('./api/nearby.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load nearby handler' }));
            });
        }

        if (path === '/api/routing/etas' && method === 'POST') {
          return importFresh('./api/routing/etas.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              try {
                if (res.headersSent || res.writableEnded) return;
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error?.message || 'Failed to load etas handler' }));
              } catch {
                // If the client disconnected mid-request, do not crash dev server.
              }
            });
        }

        if (path === '/api/routing/directions' && method === 'POST') {
          return importFresh('./api/routing/directions.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              try {
                if (res.headersSent || res.writableEnded) return;
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error?.message || 'Failed to load directions handler' }));
              } catch {
                // If the client disconnected mid-request, do not crash dev server.
              }
            });
        }

        if (path === '/api/presence/update' && method === 'POST') {
          return importFresh('./api/presence/update.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load presence update handler' }));
            });
        }

        if (path === '/api/notifications/settings' && (method === 'GET' || method === 'PATCH' || method === 'OPTIONS')) {
          return importFresh('./api/notifications/settings.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load notifications settings handler' }));
            });
        }

        if (path === '/api/notifications/preferences' && (method === 'GET' || method === 'POST')) {
          return importFresh('./api/notifications/preferences.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load notifications preferences handler' }));
            });
        }

        if (path === '/api/notifications/dispatch' && (method === 'POST' || method === 'GET')) {
          return importFresh('./api/notifications/dispatch.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load notifications dispatch handler' }));
            });
        }

        if (path === '/api/admin/notifications/dispatch' && method === 'POST') {
          return importFresh('./api/admin/notifications/dispatch.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load admin notifications dispatch handler' }));
            });
        }

        if (path === '/api/admin/cleanup/rate-limits' && (method === 'POST' || method === 'GET')) {
          return importFresh('./api/admin/cleanup/rate-limits.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load rate-limits cleanup handler' }));
            });
        }

        if (path === '/api/subscriptions/me' && method === 'GET') {
          return importFresh('./api/subscriptions/me.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load subscriptions handler' }));
            });
        }

        if (path === '/api/gdpr/request' && method === 'POST') {
          return importFresh('./api/gdpr/request.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load gdpr request handler' }));
            });
        }

        // Profiles Grid demo endpoints (handled locally in dev)
        if (path === '/api/profiles' && method === 'GET') {
          return importFresh('./api/profiles.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load profiles handler' }));
            });
        }

        if (path === '/api/profile' && method === 'GET') {
          return importFresh('./api/profile.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load profile handler' }));
            });
        }

        if (path === '/api/viewer-location' && method === 'GET') {
          return importFresh('./api/viewer-location.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load viewer location handler' }));
            });
        }

        if (path === '/api/travel-time' && method === 'POST') {
          return importFresh('./api/travel-time.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load travel time handler' }));
            });
        }

        // SoundCloud OAuth + upload + public widgets (handled locally in dev)
        if (path === '/api/soundcloud/authorize' && method === 'GET') {
          return importFresh('./api/soundcloud/authorize.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load authorize handler' }));
            });
        }

        if (path === '/api/soundcloud/callback' && method === 'GET') {
          return importFresh('./api/soundcloud/callback.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load callback handler' }));
            });
        }

        if (path === '/api/soundcloud/status' && method === 'GET') {
          return importFresh('./api/soundcloud/status.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load status handler' }));
            });
        }

        if (path === '/api/soundcloud/upload' && method === 'POST') {
          return importFresh('./api/soundcloud/upload.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load upload handler' }));
            });
        }

        if (path === '/api/soundcloud/disconnect' && method === 'POST') {
          return importFresh('./api/soundcloud/disconnect.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load disconnect handler' }));
            });
        }

        if (path === '/api/soundcloud/public-profile' && method === 'GET') {
          return importFresh('./api/soundcloud/public-profile.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load public profile handler' }));
            });
        }

        if (path === '/api/soundcloud/public-tracks' && method === 'GET') {
          return importFresh('./api/soundcloud/public-tracks.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load public tracks handler' }));
            });
        }

        if (path === '/api/email/send' && method === 'POST') {
          return importFresh('./api/email/send.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load email handler' }));
            });
        }

        if (path === '/api/notifications/process' && (method === 'GET' || method === 'POST')) {
          return importFresh('./api/notifications/process.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load notifications processor' }));
            });
        }

        // Scan endpoints (handled locally in dev)
        if (path === '/api/scan/check-in' && (method === 'POST' || method === 'OPTIONS')) {
          return importFresh('./api/scan/check-in.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load scan check-in handler' }));
            });
        }

        if (path === '/api/scan/redeem' && (method === 'POST' || method === 'OPTIONS')) {
          return importFresh('./api/scan/redeem.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load scan redeem handler' }));
            });
        }

        // Tickets endpoints (handled locally in dev)
        if (path === '/api/tickets/qr' && method === 'GET') {
          return importFresh('./api/tickets/qr.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load ticket QR handler' }));
            });
        }

        // Username check endpoint
        if (path === '/api/username/check' && method === 'GET') {
          return importFresh('./api/username/check.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load username check handler' }));
            });
        }

        // Match probability endpoints
        if (path === '/api/match-probability' && method === 'GET') {
          return importFresh('./api/match-probability/index.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load match-probability handler' }));
            });
        }

        if (path === '/api/match-probability/single' && method === 'GET') {
          return importFresh('./api/match-probability/single.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load match-probability single handler' }));
            });
        }

        // Embeddings endpoints
        if (path === '/api/embeddings' && (method === 'GET' || method === 'POST')) {
          return importFresh('./api/embeddings/index.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load embeddings handler' }));
            });
        }

        if (path === '/api/embeddings/trigger' && method === 'POST') {
          return importFresh('./api/embeddings/trigger.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load embeddings trigger handler' }));
            });
        }

        // Recommendations endpoints
        if (path === '/api/recommendations' && method === 'GET') {
          return importFresh('./api/recommendations/index.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load recommendations handler' }));
            });
        }

        if (path === '/api/recommendations/learn' && method === 'POST') {
          return importFresh('./api/recommendations/learn.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load recommendations learn handler' }));
            });
        }

        // Daily check-in endpoint
        if (path === '/api/daily-checkin' && method === 'POST') {
          return importFresh('./api/daily-checkin.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load daily-checkin handler' }));
            });
        }

        // Push notifications endpoints
        if (path === '/api/push/subscribe' && method === 'POST') {
          return importFresh('./api/push/subscribe.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load push subscribe handler' }));
            });
        }

        if (path === '/api/push/send' && method === 'POST') {
          return importFresh('./api/push/send.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load push send handler' }));
            });
        }

        // Stripe API routes for local development
        if (path === '/api/stripe/create-checkout-session' && method === 'POST') {
          return importFresh('./api/stripe/create-checkout-session.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load checkout session handler' }));
            });
        }

        if (path === '/api/stripe/cancel-subscription' && method === 'POST') {
          return importFresh('./api/stripe/cancel-subscription.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load cancel subscription handler' }));
            });
        }

        if (path === '/api/stripe/webhook' && method === 'POST') {
          return importFresh('./api/stripe/webhook.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load webhook handler' }));
            });
        }

        return next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars into process.env for dev server middleware (API routes).
  // This does not expose them to the client unless they match envPrefix.
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    logLevel: mode === 'development' ? 'info' : 'error',
    // Vite only exposes env vars to import.meta.env when they match envPrefix.
    // We keep the default VITE_ prefix, and also support existing Vercel env vars
    // that were created with a "vite_public" prefix.
    envPrefix: ['VITE_', 'vite_public', 'NEXT_PUBLIC_'],
    // Local dev convenience: if you only have SUPABASE_URL/SUPABASE_ANON_KEY in .env.local
    // (and not the VITE_ prefixed versions), define the VITE_ vars explicitly.
    // This keeps the client working without exposing the service role key.
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // Replace moment.js with date-fns (already installed)
        'moment': 'date-fns',
      },
    },
    plugins: [
      localApiRoutes(),
      react(),
      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    // Bundle optimization
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core vendor chunk
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // UI libraries
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              'framer-motion',
              'lucide-react',
            ],
            // Data layer
            'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
            // Heavy visualization libraries (lazy loaded)
            'vendor-three': ['three'],
            'vendor-charts': ['recharts'],
            // Form handling
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            // Utilities
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'lodash'],
          },
        },
      },
      // Increase chunk size warning limit for vendor bundles
      chunkSizeWarningLimit: 600,
      // Enable source maps for production debugging
      sourcemap: mode === 'development',
      // Minification options
      minify: 'esbuild',
      target: 'es2020',
    },
    // Optimize deps
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'date-fns',
        'framer-motion',
      ],
      exclude: [
        'three', // Lazy loaded
      ],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: true,
      exclude: [
        'e2e/**',
        'node_modules/**',
        'dist/**',
        'hotmess-globe/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/dist/**'],
      },
    },
  };
});