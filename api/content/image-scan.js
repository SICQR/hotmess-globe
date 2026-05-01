/**
 * POST /api/content/image-scan
 *
 * Scans an image for CSAM and explicit content.
 * Called server-side after Supabase Storage upload completes.
 *
 * Body: { imageUrl: string, userId?: string, context?: string }
 * Auth: Bearer token (required — not callable anonymously)
 *
 * Returns:
 *   { ok: true }                          — image is safe
 *   { ok: false, reason, priority }       — image blocked
 *   { ok: true, skipped: true }           — scanning unavailable (fail open)
 *
 * P1 violations:
 *   - Written to notification_outbox for ops review
 *   - Supabase Storage file flagged (avatar_scan_status = 'blocked')
 *   - User account flagged for ops review
 *
 * P2 violations:
 *   - Written to notification_outbox for human review queue
 *   - Supabase Storage file allowed pending review
 */

import { supabaseAdmin, getBearerToken } from '../_utils/supabaseAdmin.js';
import { scanImage } from '../_utils/csamScanner.js';

const MAX_IMAGE_SIZE_MB = 25;
const ALLOWED_CONTEXTS = new Set(['profile_photo', 'market_listing', 'message', 'event', 'beacon']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require auth — CSAM endpoint must not be callable anonymously
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const admin = supabaseAdmin();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const { imageUrl, context = 'unknown', storagePath } = req.body || {};

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl required' });
  }

  // Only scan images from Supabase Storage or trusted CDNs
  const allowedHosts = [
    'rfoftonnlwudilafhfkl.supabase.co',
    'hotmessldn.com',
  ];
  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid imageUrl' });
  }
  if (!allowedHosts.some(h => parsedUrl.hostname.endsWith(h))) {
    return res.status(400).json({ error: 'imageUrl must be from trusted host' });
  }

  // Run the scan
  let scanResult;
  const startMs = Date.now();
  try {
    scanResult = await scanImage(imageUrl);
  } catch (err) {
    console.error('[image-scan] unexpected error — fail open', err.message);
    return res.status(200).json({ ok: true, skipped: true });
  }

  const durationMs = Date.now() - startMs;

  // Log scan in ai_usage (reuse for rate tracking)
  try {
    await admin.from('ai_usage').insert({
      user_id: userId,
      feature: 'image_scan',
      tokens_used: 0,
      model: scanResult.layer || 'multi',
      tier_at_use: 'system',
    });
  } catch { /* non-fatal */ }

  if (scanResult.safe) {
    // Mark storage object as scanned-clean if we have a storagePath
    if (storagePath && context === 'profile_photo') {
      try {
        await admin.from('profiles').update({
          avatar_scan_status: 'clean',
          avatar_scan_at: new Date().toISOString(),
        }).eq('id', userId);
      } catch { /* non-fatal — column may not exist yet */ }
    }
    return res.status(200).json({ ok: true, durationMs });
  }

  // ── Violation handling ────────────────────────────────────────────────────

  const { priority, reason, layer, labels, confidence } = scanResult;
  console.warn('[image-scan] VIOLATION', { userId, context, priority, reason, layer });

  // Write to notification_outbox for ops
  try {
    await admin.from('notification_outbox').insert({
      user_id: userId,
      user_email: user.email,
      notification_type: 'image_policy_violation',
      title: `Image ${priority.toUpperCase()} Violation — ${context}`,
      message: `User ${userId} uploaded an image that violated policy: ${reason}`,
      channel: 'ops',
      status: 'queued',
      push_priority: priority === 'p1' ? 10 : 6,
      signal_type: priority === 'p1' ? 'csam' : 'explicit',
      dropped_stale: false,
      metadata: {
        reason,
        layer,
        labels: labels || [],
        confidence: confidence ?? null,
        imageUrl,
        context,
        storagePath: storagePath || null,
        durationMs,
      },
    });
  } catch (err) {
    console.error('[image-scan] outbox write failed', err.message);
  }

  // P1: flag profile + block avatar
  if (priority === 'p1') {
    try {
      await admin.from('profiles').update({
        avatar_scan_status: 'blocked',
        avatar_scan_at: new Date().toISOString(),
      }).eq('id', userId);
    } catch { /* non-fatal */ }

    // Delete the uploaded file from storage if we have the path
    if (storagePath) {
      try {
        await admin.storage.from('avatars').remove([storagePath]);
      } catch { /* non-fatal */ }
    }
  }

  // P2: flag for review queue but allow pending
  if (priority === 'p2' && context === 'profile_photo') {
    try {
      await admin.from('profiles').update({
        avatar_scan_status: 'review',
        avatar_scan_at: new Date().toISOString(),
      }).eq('id', userId);
    } catch { /* non-fatal */ }
  }

  return res.status(200).json({
    ok: priority !== 'p1', // P1 = blocked; P2 = allowed pending review
    blocked: priority === 'p1',
    reason,
    priority,
    message: getViolationMessage(reason, priority),
  });
}

function getViolationMessage(reason, priority) {
  if (reason === 'csam_hash_match' || reason === 'csam_ai_detection') {
    return 'This image cannot be uploaded. If you believe this is an error, contact support.';
  }
  if (priority === 'p1') {
    return 'This image violates our content policy and cannot be uploaded.';
  }
  return 'This image has been flagged for review. It will be visible once approved.';
}

