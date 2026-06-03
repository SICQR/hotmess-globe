/**
 * Email unsubscribe endpoint.
 *
 * Handles both:
 *  - One-click POST from Gmail/Yahoo (List-Unsubscribe-Post header) — instant opt-out, returns 200.
 *  - GET (user clicks footer link) — verifies token, records opt-out, renders dark gold confirmation page.
 *
 * Token: HMAC-SHA256(email + '|' + campaign, WAVE2_SEND_SECRET).
 * If WAVE2_SEND_SECRET is absent at runtime, /unsubscribe still works in dev mode (no token check)
 * but production must have it set.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

function verifyToken(email, campaign, token, secret) {
  if (!secret) return true; // dev mode
  const expected = crypto.createHmac('sha256', secret).update(`${email}|${campaign}`).digest('hex');
  // Constant-time compare
  if (!token || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(token, 'utf8'));
}

const CONFIRM_HTML = (email) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — HOTMESS</title>
<style>
  body{margin:0;background:#050507;color:#EDEDED;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
  .wrap{max-width:480px;text-align:center;}
  h1{font-size:28px;font-weight:800;letter-spacing:1px;margin:0 0 8px;}
  h1 .m{color:#C8962C;}
  .rule{width:48px;height:3px;background:#C8962C;margin:18px auto 24px;}
  p{font-size:15px;line-height:1.6;color:#C8B79A;margin:0 0 12px;}
  small{display:block;margin-top:28px;color:#8A8A8A;font-size:12px;}
  a{color:#C8962C;text-decoration:underline;}
</style></head><body><div class="wrap">
  <h1><span>HOT</span><span class="m">MESS</span></h1>
  <div class="rule"></div>
  <p>Done. <b>${email}</b> won't get HOTMESS founder emails again.</p>
  <p>The app and any safety alerts you're signed up for still work — this only stops the broadcasts.</p>
  <small>Made a mistake? <a href="mailto:phil@hotmessldn.com?subject=Resubscribe">Email Phil</a> and I'll add you back.</small>
</div></body></html>`;

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const token = url.searchParams.get('token') || '';
  const campaign = url.searchParams.get('c') || 'wave2-welcome';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).send('invalid email');
    return;
  }

  const secret = process.env.WAVE2_SEND_SECRET;
  if (!verifyToken(email, campaign, token, secret)) {
    res.status(403).send('invalid token');
    return;
  }

  // Record opt-out
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const source = req.method === 'POST' ? 'one-click' : 'footer-link';
    await supabase.from('email_optouts').upsert(
      { email, source, campaign, opted_out_at: new Date().toISOString() },
      { onConflict: 'email' }
    );
  } catch (err) {
    // Even if logging fails, return success so user sees confirmation
    console.error('[unsubscribe] log error:', err.message);
  }

  // One-click POST from Gmail: just 200 OK
  if (req.method === 'POST') {
    res.status(200).json({ ok: true, email, opted_out: true });
    return;
  }

  // GET: render confirmation page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(CONFIRM_HTML(email));
}
