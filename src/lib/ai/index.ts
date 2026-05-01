/**
 * src/lib/ai/index.ts — Central AI Layer (Chunk 13)
 *
 * ALL AI calls in src/ MUST go through this module.
 * This enforces Runtime Isolation (Chunk 01) before any context reaches OpenAI.
 *
 * Usage:
 *   import { callWingman, callSceneScout, callChat } from '@/lib/ai';
 *   const result = await callWingman({ targetProfileId, extraContext });
 *
 * Any AI_BLOCKED_FIELD in the context throws IsolationViolationError
 * and writes an audit row — the call is never made.
 */

import { sanitiseForAI, IsolationViolationError } from '@/lib/v6/isolationEnforcement';
import { supabase } from '@/components/utils/supabaseClient';

export { IsolationViolationError };

// ── Types ──────────────────────────────────────────────────────────────────────

export type AIEndpoint = 'wingman' | 'scene-scout' | 'profile-analysis' | 'chat';

export interface AICallOptions {
  userId?: string;
  requestId?: string;
}

export interface AICallResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

// ── Core call ──────────────────────────────────────────────────────────────────

/**
 * callAI — sanitises context through Runtime Isolation, then POSTs to the AI endpoint.
 *
 * @throws IsolationViolationError if any AI_BLOCKED_FIELD is detected in context.
 */
export async function callAI<T = unknown>(
  endpoint: AIEndpoint,
  context: Record<string, unknown>,
  opts: AICallOptions = {}
): Promise<AICallResult<T>> {
  // ── 1. Runtime Isolation guard — MUST run before the request is assembled ──
  await sanitiseForAI(context, {
    userId:    opts.userId,
    requestId: opts.requestId,
  });

  // ── 2. Get auth token for API request ──
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // ── 3. POST to API route ──
  try {
    const res = await fetch(`/api/ai/${endpoint}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(context),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok:     false,
        error:  errBody.error || `AI request failed (${res.status})`,
        status: res.status,
      };
    }

    const data = await res.json() as T;
    return { ok: true, data };
  } catch (err) {
    if (err instanceof IsolationViolationError) throw err; // re-throw isolation errors
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

// ── Typed wrappers ─────────────────────────────────────────────────────────────

export interface WingmanContext {
  targetProfileId: string;
  /** Extra real-time context injected by caller — passed through sanitiseForAI */
  viewerTrack?:      string | null;   // current_track_title if music_visibility allows
  targetRightNow?:   string | null;   // target's right_now_status intent
  targetVenue?:      string | null;   // target's current venue_name
  viewerMovement?:   string | null;   // viewer's movement_state (en_route / etc.)
  sharedEventTitle?: string | null;   // first shared RSVP event title
}

export interface WingmanResult {
  openers: Array<{ type: 'personal' | 'flirty' | 'question'; text: string }>;
}

export async function callWingman(
  context: WingmanContext,
  opts?: AICallOptions
): Promise<AICallResult<WingmanResult>> {
  return callAI<WingmanResult>('wingman', context as Record<string, unknown>, opts);
}

// ──

export interface SceneScoutContext {
  city?:          string;
  preferences?:   Record<string, unknown>;
  locationLat?:   number;
  locationLng?:   number;
  personaActive?: string;
  rightNowState?: string;
}

export interface SceneScoutResult {
  events: Array<Record<string, unknown>>;
  narrative: string;
}

export async function callSceneScout(
  context: SceneScoutContext,
  opts?: AICallOptions
): Promise<AICallResult<SceneScoutResult>> {
  return callAI<SceneScoutResult>('scene-scout', context as Record<string, unknown>, opts);
}

// ──

export interface ChatContext {
  message:      string;
  pageContext?: Record<string, unknown>;
  userContext?: Record<string, unknown>;
  history?:    Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResult {
  reply:    string;
  crisis?:  boolean;
}

export async function callChat(
  context: ChatContext,
  opts?: AICallOptions
): Promise<AICallResult<ChatResult>> {
  return callAI<ChatResult>('chat', context as Record<string, unknown>, opts);
}

// ──

export interface ProfileAnalysisContext {
  profileId: string;
}

export async function callProfileAnalysis(
  context: ProfileAnalysisContext,
  opts?: AICallOptions
): Promise<AICallResult<Record<string, unknown>>> {
  return callAI('profile-analysis', context as Record<string, unknown>, opts);
}
