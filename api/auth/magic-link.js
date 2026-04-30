/**
 * Vercel API Route: Send Custom Magic Link
 * 
 * Generates a Supabase magic link and sends it via Resend using a custom template.
 */

import { createClient } from '@supabase/supabase-js';
import * as templates from '../email/templates.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, redirectTo } = req.body || {};

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  if (!supabaseServiceKey) {
    res.status(500).json({ error: 'Server configuration error: Missing service key' });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Generate the magic link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectTo || `${process.env.VITE_APP_URL || 'https://hotmessldn.com'}/auth/callback`,
      },
    });

    if (error) {
      console.error('[MagicLink] Supabase error:', error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    const { properties } = data;
    const actionLink = properties.action_link;

    // 2. Send via Resend
    if (!resendApiKey) {
      console.log('[MagicLink] Development Mode: Link is', actionLink);
      res.status(200).json({ success: true, message: 'Link generated (Development Mode)', link: actionLink });
      return;
    }

    const html = templates.magicLinkEmail(actionLink);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'HOTMESS <onboarding@resend.dev>',
        to: [email],
        subject: 'Your HOTMESS sign-in link',
        html,
      }),
    });

    const resendData = await response.json();

    if (!response.ok) {
      throw new Error(resendData.message || 'Failed to send email via Resend');
    }

    res.status(200).json({ success: true, id: resendData.id });
  } catch (err) {
    console.error('[MagicLink] Error:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
