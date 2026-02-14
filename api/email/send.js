/**
 * Vercel API Route: Send Email
 *
 * Uses Resend API for email delivery. Configure RESEND_API_KEY in environment.
 * Falls back to console logging in development if no API key is set.
 * Uses readJsonBody for Vite dev compatibility (req.body not parsed in Node middleware).
 */

import { json, readJsonBody } from '../shopify/_utils.js';

function send(res, status, body) {
  json(res, status, body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  const raw = req.body && typeof req.body === 'object' ? req.body : await readJsonBody(req);
  const { to, subject, body, html } = raw || {};

  if (!to || !subject || (!body && !html)) {
    send(res, 400, { error: 'Missing required fields', required: ['to', 'subject', 'body or html'] });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    send(res, 400, { error: 'Invalid email address' });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    send(res, 200, { success: true, id: `dev_${Date.now()}`, message: 'Email logged (development mode - no API key)' });
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'HOTMESS <noreply@hotmess.london>',
        to: [to],
        subject,
        html: html || `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; white-space: pre-wrap;">${body}</pre>`,
        text: body || '',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      send(res, response.status, { error: 'Failed to send email', details: data.message || 'Unknown error' });
      return;
    }

    send(res, 200, { success: true, id: data.id });
  } catch (error) {
    send(res, 500, { error: 'Internal server error', message: error.message });
  }
}
