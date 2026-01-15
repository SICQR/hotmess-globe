import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const importFresh = async (relativePath) => {
  const href = pathToFileURL(path.resolve(__dirname, relativePath)).href;
  // Cache-bust so edits to handler files are picked up without restarting.
  const mod = await import(`${href}?t=${Date.now()}`);
  return mod?.default;
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

        // Reload env on each request so `.env.local` edits apply without a restart.
        try {
          const mode = server?.config?.mode || process.env.NODE_ENV || 'development';
          const envDir = server?.config?.envDir || server?.config?.root || process.cwd();
          const env = loadEnv(mode, envDir, '');
          Object.assign(process.env, env);
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

        if (path === '/api/presence/update' && method === 'POST') {
          return importFresh('./api/presence/update.js')
            .then((handler) => handler(req, res))
            .catch((error) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Failed to load presence update handler' }));
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
    envPrefix: ['VITE_', 'vite_public'],
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
      },
    },
    plugins: [
      // Local dev handlers for /api/* endpoints.
      localApiRoutes(),
      react(),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: true,
      exclude: [
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