/**
 * Standard JSON response envelope for all HOTMESS API endpoints.
 *
 * Shape:
 *   success → { success: true, data: ... }
 *   failure → { success: false, error: "..." }
 *
 * Never leaks raw stack traces to the client.
 */

/**
 * Send a success response.
 * @param {import('http').ServerResponse} res
 * @param {unknown} data  — payload to return
 * @param {number}  [status=200]
 */
export function success(res, data = null, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({ success: true, data }));
}

/**
 * Send an error response.
 * @param {import('http').ServerResponse} res
 * @param {string} message — human-readable error (never raw stack)
 * @param {number} [status=500]
 */
export function failure(res, message = 'Internal server error', status = 500) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({ success: false, error: message }));
}

/**
 * Guard: reject if method does not match.
 * Returns true if blocked (caller should return early).
 */
export function rejectMethod(req, res, allowed = 'POST') {
  const method = (req.method || 'GET').toUpperCase();
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  if (methods.includes(method)) return false;
  failure(res, `Method ${method} not allowed`, 405);
  return true;
}

/**
 * Guard: reject if required env var is missing.
 * Returns true if blocked.
 */
export function requireEnv(res, key) {
  if (process.env[key]) return false;
  console.warn(`[api] Missing env var: ${key}`);
  failure(res, 'not_configured', 503);
  return true;
}

/**
 * Read JSON body from request (works with both Vercel and Vite dev).
 */
export function readBody(req) {
  // Vercel pre-parses body
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);

  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}
