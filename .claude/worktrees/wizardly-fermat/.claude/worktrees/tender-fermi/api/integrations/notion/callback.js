/**
 * Notion OAuth Callback Handler
 * 
 * This endpoint receives the authorization code from Notion after user consent,
 * exchanges it for an access token, and stores the integration credentials.
 * 
 * Redirect URI: https://hotmess-globe.vercel.app/api/integrations/notion/callback
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Only allow GET (redirect from Notion)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  // Handle OAuth errors from Notion
  if (error) {
    console.error('[Notion OAuth] Error from Notion:', error);
    return res.redirect(`/settings?notion_error=${encodeURIComponent(error)}`);
  }

  // Validate authorization code
  if (!code) {
    console.error('[Notion OAuth] No authorization code received');
    return res.redirect('/settings?notion_error=no_code');
  }

  // Validate environment variables
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI || 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://hotmess-globe.vercel.app'}/api/integrations/notion/callback`;

  if (!clientId || !clientSecret) {
    console.error('[Notion OAuth] Missing NOTION_CLIENT_ID or NOTION_CLIENT_SECRET');
    return res.redirect('/settings?notion_error=config_error');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('[Notion OAuth] Token exchange failed:', errorData);
      return res.redirect(`/settings?notion_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // tokenData contains:
    // - access_token: string
    // - token_type: "bearer"
    // - bot_id: string
    // - workspace_id: string
    // - workspace_name: string
    // - workspace_icon: string | null
    // - owner: { type: "user" | "workspace", user?: {...} }
    // - duplicated_template_id: string | null (if template was duplicated)

    console.log('[Notion OAuth] Token received for workspace:', tokenData.workspace_name);

    // Parse state to get user ID (if passed during OAuth initiation)
    let userId = null;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
      } catch {
        console.warn('[Notion OAuth] Could not parse state parameter');
      }
    }

    // Store the integration in Supabase (if configured)
    if (supabaseUrl && supabaseServiceKey && userId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: dbError } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: userId,
          provider: 'notion',
          access_token: tokenData.access_token,
          workspace_id: tokenData.workspace_id,
          workspace_name: tokenData.workspace_name,
          bot_id: tokenData.bot_id,
          metadata: {
            workspace_icon: tokenData.workspace_icon,
            owner: tokenData.owner,
            duplicated_template_id: tokenData.duplicated_template_id,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,provider',
        });

      if (dbError) {
        console.error('[Notion OAuth] Database error:', dbError);
        // Continue anyway - token exchange was successful
      }
    }

    // Redirect to success page
    return res.redirect(`/settings?notion_connected=true&workspace=${encodeURIComponent(tokenData.workspace_name || '')}`);

  } catch (err) {
    console.error('[Notion OAuth] Unexpected error:', err);
    return res.redirect('/settings?notion_error=unexpected_error');
  }
}
