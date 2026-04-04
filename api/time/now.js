export default function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ now: new Date().toISOString(), unixMs: Date.now() }));
}
