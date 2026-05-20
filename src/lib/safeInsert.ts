/**
 * safeInsert — typed insert wrapper for Supabase that fails LOUD on column drift
 *
 * Phil's exec doctrine 2026-05-20: "Add typed insert guards so nonexistent
 * columns cannot fail silently again." Background: the legacy
 * L2GhostedPreviewSheet wrote to `location_shares` with `sender_id` /
 * `receiver_id` / `lat` / `lng`, columns that don't exist on that table.
 * Postgres rejected silently (Supabase's default error swallowing meant
 * the UI showed "Location shared" while NOTHING was written).
 *
 * Pattern: declare allowed columns per table → safeInsert refuses to send
 * anything outside that set and surfaces the mismatch in console + (in
 * dev) throws so it shows up in tests.
 */
import { supabase } from '@/components/utils/supabaseClient';

const isDev = (() => {
  try {
    const env = (import.meta as unknown as { env?: { DEV?: boolean } })?.env;
    return Boolean(env?.DEV);
  } catch {
    return false;
  }
})();

export type AllowedColumns<T extends Record<string, unknown>> = readonly (keyof T)[];

export interface SafeInsertResult<TRow> {
  ok: boolean;
  data: TRow | null;
  error: string | null;
}

/**
 * Insert a row into a table, refusing any keys not in `allowedColumns`.
 *
 * @example
 *   await safeInsert<ChatMessageRow>(
 *     'chat_messages',
 *     ['thread_id','sender_email','content','message_type','metadata'],
 *     { thread_id, sender_email, content: 'hi', message_type: 'text' }
 *   );
 */
export async function safeInsert<TRow extends Record<string, unknown>>(
  table: string,
  allowedColumns: AllowedColumns<TRow>,
  row: Partial<TRow>,
): Promise<SafeInsertResult<TRow>> {
  const allowed = new Set(allowedColumns as readonly string[]);
  const sanitised: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key)) {
      sanitised[key] = value;
    } else {
      dropped.push(key);
    }
  }

  if (dropped.length > 0) {
    const msg = `[safeInsert] table="${table}" dropped unknown columns: ${dropped.join(', ')}`;
    if (isDev) {
      throw new Error(msg);
    }
    if (typeof console !== 'undefined') console.error(msg, { row, allowed: Array.from(allowed) });
  }

  const { data, error } = await supabase
    .from(table)
    .insert(sanitised)
    .select()
    .single();

  if (error) {
    return { ok: false, data: null, error: error.message };
  }
  return { ok: true, data: data as TRow, error: null };
}
