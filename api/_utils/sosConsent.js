/**
 * SOS trusted-contact consent gate (Option B — consent gate + invite-on-add
 * + interim grace).
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * Historically SOS fanned out to every trusted_contact with notify_on_sos=true,
 * with no check that the contact had ever agreed to be an emergency contact.
 * We now gate the fan-out on consent (accepted_at) so we stop paging people who
 * never opted in. But flipping that switch cold would make SOS reach NOBODY
 * during the transition (0/8 real contacts are currently consented, because
 * adding a contact never used to send an acceptance invite).
 *
 * ── Grace window ────────────────────────────────────────────────────────────
 * To avoid a safety regression during rollout we honour a time-boxed grace
 * window controlled by the env var SOS_CONSENT_GRACE_UNTIL (an ISO-8601
 * timestamp, e.g. "2026-09-01T00:00:00Z"):
 *
 *   • While Date.now() < SOS_CONSENT_GRACE_UNTIL:
 *       SOS pages CONSENTED contacts AND still-PENDING contacts (never-answered).
 *       Pending recipients are tagged `_unconsented: true` so callers can (a)
 *       prepend a one-line "you haven't confirmed yet" notice to their message,
 *       and (b) flag to the owner/ops that some contacts are unconfirmed.
 *
 *   • After SOS_CONSENT_GRACE_UNTIL passes (or if the var is unset/invalid):
 *       ONLY consented contacts are paged. Pending contacts are dropped.
 *
 * DECLINED contacts (declined_at set) are NEVER paged, in the grace window or
 * outside it.
 *
 * ── Fail-safe posture ───────────────────────────────────────────────────────
 * This module is safety-critical. It must never THROW and must never silently
 * drop a *consented* recipient: consented contacts are included unconditionally,
 * before any grace logic runs. If a contact row is missing consent columns
 * entirely (legacy row with no accepted_at/declined_at), it is treated as
 * PENDING — never as declined — so the grace window can still reach them.
 */

/**
 * Is the interim consent grace window currently active?
 *
 * Reads SOS_CONSENT_GRACE_UNTIL (ISO-8601). Returns false if the var is unset,
 * empty, unparseable, or already in the past. Once this returns false, only
 * consented contacts are paged.
 *
 * @returns {boolean}
 */
export function isGraceActive() {
  const raw = process.env.SOS_CONSENT_GRACE_UNTIL || '';
  const until = Date.parse(raw);
  if (Number.isNaN(until)) return false;
  return Date.now() < until;
}

/**
 * Split a set of trusted_contacts into consent buckets.
 *
 *   consented → accepted_at != null && declined_at == null
 *   pending   → accepted_at == null && declined_at == null
 *   excluded  → declined_at != null   (declined; never paged)
 *
 * Rows with an accepted_at AND a declined_at (shouldn't happen, but be safe)
 * are treated as excluded — a decline is the stronger, opt-out signal.
 *
 * @param {Array<Object>} contacts
 * @returns {{ consented: Object[], pending: Object[], excluded: Object[] }}
 */
export function partitionContacts(contacts) {
  const consented = [];
  const pending = [];
  const excluded = [];
  for (const c of contacts || []) {
    const accepted = c && c.accepted_at != null;
    const declined = c && c.declined_at != null;
    if (declined) {
      excluded.push(c);
    } else if (accepted) {
      consented.push(c);
    } else {
      pending.push(c);
    }
  }
  return { consented, pending, excluded };
}

/**
 * Select which contacts should actually be paged for an SOS, applying the
 * consent gate + grace window.
 *
 *   • Always includes consented contacts.
 *   • If isGraceActive(), also includes pending contacts, each tagged with
 *     `_unconsented: true` (the returned object is a shallow copy so the caller
 *     can read the flag without mutating the source row).
 *   • Never includes declined contacts.
 *
 * The returned array is what fan-out sites should iterate over instead of the
 * raw `notify_on_sos = true` set.
 *
 * @param {Array<Object>} contacts — trusted_contacts rows (must include
 *   accepted_at + declined_at to be gated; missing columns are treated pending).
 * @returns {Array<Object>} recipients to page (consented + grace-pending)
 */
export function selectSosRecipients(contacts) {
  const { consented, pending } = partitionContacts(contacts);
  // Consented contacts are always paged — added first and never filtered, so
  // a bug in the grace logic can never drop a consented recipient.
  const recipients = consented.slice();
  if (isGraceActive()) {
    for (const c of pending) {
      recipients.push({ ...c, _unconsented: true });
    }
  }
  return recipients;
}

/**
 * One-line notice prepended to the outbound message body for a still-pending
 * (grace-window) recipient, so they understand why they were contacted and how
 * to confirm or opt out. Kept short so it survives SMS segment budgets.
 */
export const CONSENT_NOTICE =
  "You're listed as an emergency contact on HOTMESS but haven't confirmed yet — reply ACCEPT to confirm, STOP to opt out.";

/**
 * Prepend CONSENT_NOTICE to a message body when the recipient is unconsented.
 * No-op (returns body unchanged) for consented recipients. Never throws.
 *
 * @param {string} body — the composed message body
 * @param {Object|null} recipient — a recipient from selectSosRecipients()
 * @returns {string}
 */
export function applyConsentNotice(body, recipient) {
  if (recipient && recipient._unconsented === true) {
    return `${CONSENT_NOTICE}\n\n${body || ''}`;
  }
  return body;
}
