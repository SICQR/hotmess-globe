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
 *   • After a VALID SOS_CONSENT_GRACE_UNTIL timestamp passes:
 *       ONLY consented contacts are paged. Pending contacts are dropped (hard gate).
 *
 *   • If SOS_CONSENT_GRACE_UNTIL is UNSET or invalid:
 *       grace is FORCED ACTIVE + a loud error is logged. A missing/typo'd env
 *       var must NEVER silently hard-gate SOS to zero reachable contacts.
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
 * Reads SOS_CONSENT_GRACE_UNTIL (ISO-8601). Returns false ONLY when the var is a
 * valid timestamp already in the past (the intended 14-day hard-gate cutover).
 * If the var is unset/empty/unparseable it returns TRUE (fail-open) and logs
 * loudly — a forgotten env var must not equal silent SOS.
 *
 * GRACE LENGTH = 14 DAYS. The length is NOT hardcoded here — it is expressed
 * purely as the absolute cutoff timestamp in SOS_CONSENT_GRACE_UNTIL. At deploy
 * Phil sets SOS_CONSENT_GRACE_UNTIL = (deploy time + 14 days) on Vercel, e.g.
 * `2026-07-15T00:00:00Z` for a 2026-07-01 deploy. Do NOT commit a literal date.
 *
 * Fail-safe posture for THIS flag: if the env var is unset or invalid we treat
 * the grace window as ACTIVE (return true) and log loudly — i.e. we fail toward
 * still reaching people (consented normally + pending with a warning), NEVER
 * toward silent SOS. A forgotten or typo'd env var at deploy must not silently
 * hard-gate to zero reachable contacts. The hard gate engages only when the var
 * is a VALID timestamp that has passed. (Consented contacts are always paged
 * regardless — see selectSosRecipients.)
 *
 * @returns {boolean}
 */
export function isGraceActive() {
  const raw = (process.env.SOS_CONSENT_GRACE_UNTIL || '').trim();
  const until = Date.parse(raw);
  if (Number.isNaN(until)) {
    // SAFETY FAIL-OPEN: env unset/empty/unparseable => grace ACTIVE. A forgotten
    // or mistyped var must never silently hard-gate SOS to zero reachable
    // contacts. Log loudly so ops sets the real (deploy + 14d) cutover; until
    // then we keep reaching consented contacts normally and pending with notice.
    console.error('[SOS][CONSENT] SOS_CONSENT_GRACE_UNTIL unset/invalid — grace FORCED ACTIVE (fail-open). Set it to (deploy time + 14 days) on Vercel to arm the hard gate.');
    return true;
  }
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
 * Fallback owner display name when the SOS owner's name is unknown at
 * compose time. Never leak a real name we don't have — use a neutral word.
 */
export const OWNER_FALLBACK_NAME = 'someone';

/**
 * Owner-facing warning shown when an SOS fan-out included one or more pending
 * (unconfirmed) recipients that were only reached because the consent grace
 * window is still open. Surfaced to the OWNER (not just logged) so they know
 * their contact list has unconfirmed entries that will stop being paged once
 * the 14-day grace window closes. EXACT approved copy (Phil).
 */
export const OWNER_UNCONSENTED_WARNING =
  "Some of your SOS contacts haven\u2019t confirmed yet. They may receive alerts during the transition, but after 14 days only confirmed contacts will be paged.";

/**
 * Build the structured owner_warning payload for an SOS result, or null when
 * there is nothing to warn about (no unconfirmed recipients were paged).
 * Never throws.
 *
 * @param {number} unconsentedCount — count of _unconsented recipients paged
 * @returns {{ code: string, unconsented_count: number, message: string } | null}
 */
export function buildOwnerWarning(unconsentedCount) {
  const n = Number(unconsentedCount) || 0;
  if (n <= 0) return null;
  return {
    code: 'unconfirmed_contacts_paged',
    unconsented_count: n,
    message: OWNER_UNCONSENTED_WARNING,
  };
}

/**
 * Build the one-line notice prepended to the outbound message body for a
 * still-pending (grace-window) recipient, so they understand why they were
 * contacted and can decide whether to accept future emergency alerts.
 *
 * Templated with the SOS owner's display name (never hardcode a person's
 * name). Falls back to OWNER_FALLBACK_NAME ("someone") when the name is
 * unknown. Kept to a single sentence-pair so it survives SMS segment budgets.
 *
 * @param {string|null|undefined} ownerName — the SOS owner's display name
 * @returns {string}
 */
export function consentNotice(ownerName) {
  const owner = (ownerName == null || String(ownerName).trim() === '')
    ? OWNER_FALLBACK_NAME
    : String(ownerName).trim();
  return `You\u2019re receiving this because ${owner} listed you as an SOS safety contact on HOTMESS. Please confirm whether you accept future emergency alerts.`;
}

/**
 * Back-compat constant for call sites that render the notice without an owner
 * name available. Equivalent to consentNotice(undefined) — i.e. templated with
 * the "someone" fallback. Prefer consentNotice(ownerName) / applyConsentNotice
 * with the owner name wherever the owner's display_name is known.
 */
export const CONSENT_NOTICE = consentNotice(undefined);

/**
 * Prepend the consent notice to a message body when the recipient is
 * unconsented (grace-window pending). No-op (returns body unchanged) for
 * consented recipients. Never throws.
 *
 * @param {string} body — the composed message body
 * @param {Object|null} recipient — a recipient from selectSosRecipients()
 * @param {string|null} [ownerName] — SOS owner display name for templating;
 *   omit/null to use the "someone" fallback.
 * @returns {string}
 */
export function applyConsentNotice(body, recipient, ownerName) {
  if (recipient && recipient._unconsented === true) {
    return `${consentNotice(ownerName)}\n\n${body || ''}`;
  }
  return body;
}
