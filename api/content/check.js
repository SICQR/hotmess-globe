/**
 * POST /api/content/check
 *
 * Server-side content policy filter — Chunk 12 (v6_content_policy flag).
 *
 * Flag OFF  → { ok: true }   (no filter during ramp)
 * Flag ON   → runs prohibited-pattern checks; returns { ok, blocked, reason, priority }
 *
 * Body: { text: string, surface: 'profile'|'message'|'beacon'|'event'|'chat', userId?: string }
 * Auth: Bearer token (optional — anon requests only get flag check, no user-scoped context)
 */

import { supabaseAdmin, supabaseAnon, getBearerToken } from '../_utils/supabaseAdmin.js';

// ── Prohibited patterns ────────────────────────────────────────────────────────
// P1 = immediate removal / ops alert
// P2 = review queue within 2h
// Patterns are intentionally conservative to keep false-positive rate < 3% (KPI)

const PROHIBITED = [
  // P1 — drug supply solicitation (not culture language, actual supply)
  {
    priority: 'p1',
    reason: 'drug_supply',
    label: 'Drug supply solicitation',
    patterns: [
      /\bsell(?:ing)?\s+(g\b|ket\b|ketamine|ghb|gbl|tina|meth|coke|cocaine|mdma|pills)\b/i,
      /\b(g\b|ket\b|tina|meth|coke|mdma)\s+for\s+sale\b/i,
      /\bdm\s+me\s+for\s+(g\b|ket\b|tina|meth|coke|mdma|drugs)\b/i,
      /\bsupply(?:ing)?\s+(drugs|g\b|ket\b|tina|meth)\b/i,
    ],
  },
  // P1 — credible threats of violence
  {
    priority: 'p1',
    reason: 'threats',
    label: 'Threats of violence',
    patterns: [
      /\b(i.?ll\s+)?(kill|hurt|attack|stab|shoot)\s+(you|him|her|them)\b/i,
      /\byou.?re\s+(dead|gonna\s+die)\b/i,
    ],
  },
  // P1 — CSAM language
  {
    priority: 'p1',
    reason: 'csam',
    label: 'Child safety violation',
    patterns: [
      /\b(under\s*age|underage|minor|child|kid|teen)\s+(nude|naked|sex|sexual|explicit|pic|photo)\b/i,
      /\b(cp|csam)\b/i,
    ],
  },
  // P2 — outing / non-consensual identity disclosure
  {
    priority: 'p2',
    reason: 'outing',
    label: 'Identity outing',
    patterns: [
      /\bhiv\s+positive\b.*\bwithout\s+consent\b/i,
    ],
  },
  // P2 — commercial sex solicitation (explicit, not discussion)
  {
    priority: 'p2',
    reason: 'sex_work_solicitation',
    label: 'Commercial sex work solicitation',
    patterns: [
      /\b(pay|paid|\£[\d]+|[\d]+\s*\£)\s+for\s+sex\b/i,
      /\bescort\s+service\b/i,
    ],
  },
];

// ── Feature flag resolver ─────────────────────────────────────────────────────
async function isFlagEnabled(flagKey, userId) {
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from('feature_flags')
      .select('enabled_globally, enabled_for_user_ids, enabled_for_cohort')
      .eq('flag_key', flagKey)
      .single();

    if (!data) return false;
    if (data.enabled_globally) return true;
    if (userId && Array.isArray(data.enabled_for_user_ids)) {
      return data.enabled_for_user_ids.includes(userId);
    }
    return false;
  } catch {
    return false; // fail open — don't block content if flag check errors
  }
}

// ── Check function ────────────────────────────────────────────────────────────
function checkText(text) {
  if (!text || typeof text !== 'string') return null;
  const normalised = text.trim();
  if (!normalised) return null;

  for (const rule of PROHIBITED) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalised)) {
        return { blocked: true, reason: rule.reason, label: rule.label, priority: rule.priority };
      }
    }
  }
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, surface = 'unknown', userId: bodyUserId } = req.body || {};

  // Resolve caller identity
  let userId = bodyUserId || null;
  if (!userId) {
    const token = getBearerToken(req);
    if (token) {
      try {
        const { data } = await supabaseAnon().auth.getUser(token);
        userId = data?.user?.id ?? null;
      } catch { /* ignore */ }
    }
  }

  // Check kill switch first
  const killSwitch = await isFlagEnabled('v6_all_off', userId);
  if (killSwitch) {
    return res.status(200).json({ ok: true, flagOff: true });
  }

  // Check content policy flag
  const flagOn = await isFlagEnabled('v6_content_policy', userId);
  if (!flagOn) {
    return res.status(200).json({ ok: true, flagOff: true });
  }

  // Run prohibited-pattern check
  const violation = checkText(text);
  if (!violation) {
    return res.status(200).json({ ok: true });
  }

  // P1 violations → write to notification_outbox for ops
  if (violation.priority === 'p1') {
    try {
      const admin = supabaseAdmin();
      await admin.from('notification_outbox').insert({
        recipient_id: null, // ops channel
        type: 'content_policy_p1',
        payload: {
          surface,
          reason: violation.reason,
          label: violation.label,
          userId,
          preview: typeof text === 'string' ? text.slice(0, 120) : null,
        },
        status: 'queued',
      });
    } catch { /* non-fatal — don't let ops alert failure block the response */ }
  }

  return res.status(200).json({
    ok: false,
    blocked: true,
    reason: violation.reason,
    label: violation.label,
    priority: violation.priority,
    message: getPolicyMessage(violation.reason),
  });
}

function getPolicyMessage(reason) {
  const messages = {
    drug_supply: 'This content appears to solicit drug supply, which isn\'t allowed on HOTMESS.',
    threats: 'Threats of violence aren\'t permitted on HOTMESS.',
    csam: 'This content violates our child safety policy and has been blocked.',
    outing: 'Sharing someone\'s identity without consent isn\'t allowed.',
    sex_work_solicitation: 'Commercial solicitation isn\'t permitted on HOTMESS.',
  };
  return messages[reason] || 'This content violates HOTMESS community guidelines.';
}
