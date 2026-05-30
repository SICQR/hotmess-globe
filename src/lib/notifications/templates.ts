/**
 * Notification Templates — HOTMESS Push + In-App
 *
 * Core rule: No generic notifications. Every push must be earned.
 * Tone: something is happening — not "we want you back"
 *
 * Priority order (max 1–2 per day):
 *   1. Music drop
 *   2. Pulse activity spike
 *   3. Radio live
 *   4. Personal incomplete (stem interest, preview abandon)
 */

// ── Template types ──────────────────────────────────────────────────────────

export type NotifType =
  | 'music_drop'
  | 'pulse_activity'
  | 'radio_live'
  | 'stem_interest'
  | 'preview_abandon';

interface NotifTemplate {
  title: string;
  body: string;
  url: string;
  tag: string;
  priority: number; // 1 = highest
}

// ── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES: Record<NotifType, NotifTemplate[]> = {
  music_drop: [
    {
      title: 'Smash Daddys just dropped.',
      body: 'Tap in.',
      url: '/music',
      tag: 'hm-music-drop',
      priority: 1,
    },
    {
      title: 'New drop — live now.',
      body: 'You either catch it or you don\'t.',
      url: '/music',
      tag: 'hm-music-drop',
      priority: 1,
    },
  ],

  pulse_activity: [
    {
      title: 'Something\'s moving near you.',
      body: 'Open Pulse.',
      url: '/pulse',
      tag: 'hm-pulse',
      priority: 2,
    },
    {
      title: '{count} signals just lit up.',
      body: 'See what\'s happening.',
      url: '/pulse',
      tag: 'hm-pulse',
      priority: 2,
    },
  ],

  radio_live: [
    {
      title: 'HOTMESS RADIO is live.',
      body: 'No repeats.',
      url: '/radio',
      tag: 'hm-radio',
      priority: 3,
    },
  ],

  stem_interest: [
    {
      title: 'Still thinking about that track?',
      body: 'Get the stems.',
      url: '/music',
      tag: 'hm-stems',
      priority: 4,
    },
  ],

  preview_abandon: [
    {
      title: 'You didn\'t hear the whole thing.',
      body: 'Pick up where you left off.',
      url: '/music',
      tag: 'hm-preview',
      priority: 4,
    },
  ],
};

// ── Get a random template for a type ────────────────────────────────────────

export function getNotifTemplate(
  type: NotifType,
  vars?: Record<string, string | number>
): NotifTemplate {
  const pool = TEMPLATES[type];
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Interpolate {var} placeholders
  let title = template.title;
  let body = template.body;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      title = title.replace(`{${k}}`, String(v));
      body = body.replace(`{${k}}`, String(v));
    }
  }

  return { ...template, title, body };
}

// ── Rate limiter — max 2 pushes per day ─────────────────────────────────────

const LS_KEY = 'hm_push_log';

interface PushLogEntry {
  type: NotifType;
  ts: number;
}

function getPushLog(): PushLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePushLog(log: PushLogEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(log));
  } catch { /* noop */ }
}

/**
 * Check if we can send a push of this type.
 * Rules:
 *   - Max 2 pushes per 24h total
 *   - No duplicate type within 6h
 *   - Higher priority types can preempt lower ones
 */
export function canSendPush(type: NotifType): boolean {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h6 = 6 * 60 * 60 * 1000;

  const log = getPushLog().filter(e => now - e.ts < h24);

  // Max 2 per day
  if (log.length >= 2) return false;

  // No duplicate type within 6h
  if (log.some(e => e.type === type && now - e.ts < h6)) return false;

  return true;
}

/**
 * Record a push was sent (call after successful delivery)
 */
export function recordPush(type: NotifType): void {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const log = getPushLog().filter(e => now - e.ts < h24);
  log.push({ type, ts: now });
  writePushLog(log);
}

// ── Intent tracking (for personal notifications) ────────────────────────────

const INTENT_KEY = 'hm_intent_log';

interface IntentEntry {
  type: 'stem_view' | 'preview_abandon';
  releaseId?: string;
  trackId?: string;
  ts: number;
}

export function trackIntent(entry: Omit<IntentEntry, 'ts'>): void {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    const log: IntentEntry[] = raw ? JSON.parse(raw) : [];
    log.push({ ...entry, ts: Date.now() });
    // Keep last 20
    localStorage.setItem(INTENT_KEY, JSON.stringify(log.slice(-20)));
  } catch { /* noop */ }
}

export function getRecentIntents(type: IntentEntry['type'], withinMs = 24 * 60 * 60 * 1000): IntentEntry[] {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    const log: IntentEntry[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - withinMs;
    return log.filter(e => e.type === type && e.ts > cutoff);
  } catch {
    return [];
  }
}
