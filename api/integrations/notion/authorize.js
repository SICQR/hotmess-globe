/**
 * Notion OAuth Authorization Initiator
 * 
 * Redirects users to Notion's OAuth consent screen.
 * Call this endpoint when user clicks "Connect Notion" button.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI || 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://hotmess-globe.vercel.app'}/api/integrations/notion/callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'Notion integration not configured' });
  }

  // Get user ID from query or session (optional - for linking integration to user)
  const { userId } = req.query;

  // Encode state with user info for callback
  const state = userId 
    ? Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64')
    : undefined;

  // Build Notion OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user', // or 'workspace' for workspace-level access
  });

  if (state) {
    params.set('state', state);
  }

  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;

  // Redirect to Notion
  return res.redirect(notionAuthUrl);
}
