export const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export const getEnv = (name, fallbacks = []) => {
  const candidates = [name, ...fallbacks];
  for (const key of candidates) {
    const value = process.env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return null;
};

export const normalizeShopDomain = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return new URL(raw).host;
    }
    return new URL(`https://${raw}`).host;
  } catch {
    return raw;
  }
};

export const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const value = Array.isArray(header) ? header[0] : header;
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
};

export const safeJsonParse = (value) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const normalizeDetails = (details) => {
  if (!details) return null;
  if (typeof details === 'object') return details;
  if (typeof details === 'string') {
    const parsed = safeJsonParse(details);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }
  return null;
};

export const readJsonBody = async (req) => {
  if (req?.body && typeof req.body === 'object') return req.body;
  if (typeof req?.body === 'string' && req.body.trim()) return safeJsonParse(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return null;
  return safeJsonParse(text);
};

export const getQueryParam = (req, key) => {
  const fromQuery = req?.query?.[key];
  if (typeof fromQuery === 'string') return fromQuery;
  if (Array.isArray(fromQuery) && typeof fromQuery[0] === 'string') return fromQuery[0];

  const rawUrl = req?.url;
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl, 'http://localhost');
    return url.searchParams.get(key);
  } catch {
    return null;
  }
};
