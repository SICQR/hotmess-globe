/**
 * HOTMESS v6 — Runtime Isolation: Enforcement Helpers
 *
 * enforceFieldAccess(service, fields)
 *   — throws ForbiddenError if any field violates the FIELD_MANIFEST.
 *   — call before every DB query or service-to-service call.
 *
 * sanitiseForAI(context)
 *   — throws IsolationViolationError if any AI_BLOCKED_FIELD is present.
 *   — call BEFORE assembling AI context, not after.
 *   — throws, never strips (hiding violations is not acceptable).
 *
 * logIsolationViolation(payload)
 *   — writes an append-only row to isolation_audit_log in Supabase.
 *   — called automatically by enforceFieldAccess and sanitiseForAI.
 *
 * Spec: HOTMESS-RuntimeEnforcement.docx §2, §5, §8
 */

import { createClient } from '@supabase/supabase-js';
import { FIELD_MANIFEST, AI_BLOCKED_FIELDS, ALLOWED_REALTIME_CHANNELS } from './fieldManifest.js';

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class IsolationViolationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'IsolationViolationError';
    this.details = details;
  }
}

export class ForbiddenError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ForbiddenError';
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Supabase client (service-role for audit writes — no RLS bypass elsewhere)
// ---------------------------------------------------------------------------

function _getAuditClient() {
  const url  = import.meta?.env?.VITE_SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL;
  const key  = import.meta?.env?.VITE_SUPABASE_SERVICE_KEY ?? process.env.VITE_SUPABASE_SERVICE_KEY
             ?? import.meta?.env?.VITE_SUPABASE_ANON_KEY   ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Audit logger — append-only, never throws (best-effort)
// ---------------------------------------------------------------------------

export async function logIsolationViolation({
  event_type,
  service,
  field,
  user_id   = null,
  request_id = null,
  stack_trace = null,
}) {
  try {
    const client = _getAuditClient();
    if (!client) return; // no-op in unit-test environments without env vars
    await client.from('isolation_audit_log').insert({
      event_type,
      service,
      field,
      user_id,
      request_id,
      stack_trace,
    });
  } catch {
    // Audit logging must never crash the calling code.
    // Violations are surfaced via the thrown error, not the log.
  }
}

// ---------------------------------------------------------------------------
// enforceFieldAccess — service field manifest check
// ---------------------------------------------------------------------------

/**
 * Enforce that `service` is permitted to access every field in `fields`.
 *
 * @param {string}   service  — key in FIELD_MANIFEST (e.g. "AI_LAYER")
 * @param {string[]} fields   — field names being requested
 * @param {object}   [opts]   — { userId, requestId } for audit context
 * @throws {ForbiddenError}   on first blocked field found
 */
export async function enforceFieldAccess(service, fields, opts = {}) {
  const manifest = FIELD_MANIFEST[service];
  if (!manifest) {
    throw new ForbiddenError(
      `Unknown service "${service}". Every service must be declared in FIELD_MANIFEST.`,
      { service }
    );
  }

  for (const field of fields) {
    if (manifest.blocked.includes(field)) {
      await logIsolationViolation({
        event_type:  'BLOCKED_FIELD_ACCESS',
        service,
        field,
        user_id:     opts.userId    ?? null,
        request_id:  opts.requestId ?? null,
        stack_trace: new Error().stack,
      });

      throw new ForbiddenError(
        `${service} cannot access field "${field}". Isolation violation.`,
        { service, field }
      );
    }

    // Fail-closed: field not in allowed OR blocked is also rejected.
    if (!manifest.allowed.includes(field) && !manifest.blocked.includes(field)) {
      await logIsolationViolation({
        event_type:  'BLOCKED_FIELD_ACCESS',
        service,
        field,
        user_id:     opts.userId    ?? null,
        request_id:  opts.requestId ?? null,
        stack_trace: new Error().stack,
      });

      throw new ForbiddenError(
        `${service} has no declared access to field "${field}". Fail-closed.`,
        { service, field }
      );
    }
  }
}

// ---------------------------------------------------------------------------
// sanitiseForAI — pre-call AI context guard
// ---------------------------------------------------------------------------

/**
 * Verify that `context` contains no AI-blocked fields.
 * Throws before the AI call is made — never strips and continues.
 *
 * @param {object} context    — the assembled AI context object
 * @param {object} [opts]     — { userId, requestId } for audit context
 * @returns {object}          — the original context (unmodified) if clean
 * @throws {IsolationViolationError} on first blocked field found
 */
export async function sanitiseForAI(context, opts = {}) {
  for (const field of AI_BLOCKED_FIELDS) {
    if (field in context) {
      await logIsolationViolation({
        event_type:  'AI_BLOCKED_FIELD_DETECTED',
        service:     'AI_LAYER',
        field,
        user_id:     opts.userId    ?? null,
        request_id:  opts.requestId ?? null,
        stack_trace: new Error().stack,
      });

      throw new IsolationViolationError(
        `Blocked field "${field}" detected in AI context. Call aborted.`,
        { field }
      );
    }
  }
  return context;
}

// ---------------------------------------------------------------------------
// realtimeChannelAllowed — guard for Supabase Realtime subscriptions
// ---------------------------------------------------------------------------

/**
 * Returns true only if the channel is in the permitted broadcast list.
 * Use at subscription setup — reject anything not on the allowlist.
 *
 * @param {string} channelName
 * @returns {boolean}
 */
export function realtimeChannelAllowed(channelName) {
  return ALLOWED_REALTIME_CHANNELS.includes(channelName);
}
