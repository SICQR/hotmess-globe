import base44 from "@base44/vite-plugin"
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

        if (path === '/api/shopify/cart' && method === 'POST') {
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
    logLevel: 'error', // Suppress warnings, only show errors
    // Vite only exposes env vars to import.meta.env when they match envPrefix.
    // We keep the default VITE_ prefix, and also support existing Vercel env vars
    // that were created with a "vite_public" prefix.
    envPrefix: ['VITE_', 'vite_public'],
    plugins: [
      // Must come before base44() so these endpoints aren't proxied away in dev.
      localApiRoutes(),
      base44({
        // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
        // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        visualEditAgent: true
      }),
      react(),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/dist/**'],
      },
    },
  };
});