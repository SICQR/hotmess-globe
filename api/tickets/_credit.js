/**
 * HOTMESS member credit helpers (service-role).
 *
 * The credit ledger is append-only: each row is a signed pence amount. Balance
 * is the sum. Resale proceeds are credited (decision 2026-06-26: members are
 * paid in HOTMESS credit, not cash) and redeemed against future ticket buys.
 *
 * Idempotency is enforced by a unique index on (reason, ref_type, ref_id) — a
 * webhook replay that re-inserts the same entry hits a 23505 and is treated as
 * already-applied.
 */

/** Net pence a seller keeps after the platform fee and card processing. */
export function sellerNetPence(grossPence, feeRate) {
  const gross = Math.max(0, Math.round(grossPence));
  const fee = Math.round(gross * (Number(feeRate) || 0));
  const processing = gross > 0 ? Math.round(gross * 0.014 + 20) : 0; // 1.4% + 20p
  return Math.max(0, gross - fee - processing);
}

/** Current balance in pence for a user (service-role client). */
export async function getBalancePence(supabase, userId) {
  if (!userId) return 0;
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('amount_pence')
    .eq('user_id', userId);
  if (error) return 0;
  return (data || []).reduce((a, r) => a + (r.amount_pence || 0), 0);
}

/**
 * Insert one ledger entry. Idempotent on (reason, ref_type, ref_id).
 * @returns {{ ok: boolean, skipped?: boolean, error?: string }}
 */
export async function ledgerEntry(supabase, { userId, amountPence, reason, refType = null, refId = null, metadata = {} }) {
  if (!userId || !Number.isInteger(amountPence) || amountPence === 0) {
    return { ok: false, error: 'invalid ledger args' };
  }
  const { error } = await supabase.from('credit_ledger').insert({
    user_id: userId, amount_pence: amountPence, reason,
    ref_type: refType, ref_id: refId, metadata,
  });
  if (error) {
    if (error.code === '23505') return { ok: true, skipped: true }; // already applied
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
