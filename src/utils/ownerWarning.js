/**
 * ownerWarning — presentation-only helpers for the SOS owner-warning banner.
 *
 * PRESENTATION ONLY. This module does NOT decide who gets paged during an SOS.
 * Recipient selection / gating / grace fallback lives in api/_utils/sosConsent.js
 * on the server and is the single source of truth. These helpers only read rows
 * the owner surface has ALREADY loaded and answer a display question:
 * "should we warn the owner that some SOS contacts haven't confirmed yet?"
 *
 * A contact is "pending" (unconfirmed) for display purposes when it is opted in
 * to SOS but has neither accepted nor declined the invitation:
 *   notify_on_sos === true && accepted_at == null && declined_at == null
 * (== null intentionally matches both null and undefined.)
 */

/**
 * Is this contact an unconfirmed SOS recipient (for display)?
 * @param {object} c - a trusted_contacts row
 * @returns {boolean}
 */
export function isPendingSosContact(c) {
  return !!c
    && c.notify_on_sos === true
    && c.accepted_at == null
    && c.declined_at == null;
}

/**
 * How many loaded contacts are pending SOS confirmation.
 * @param {Array<object>} contacts
 * @returns {number}
 */
export function countPendingSosContacts(contacts) {
  if (!Array.isArray(contacts)) return 0;
  return contacts.reduce((n, c) => n + (isPendingSosContact(c) ? 1 : 0), 0);
}

/**
 * Pure predicate for the at-rest owner-warning banner.
 * Show the banner when the owner has >= 1 pending SOS contact AND has not
 * dismissed it for this session.
 *
 * @param {Array<object>} contacts - already-loaded trusted_contacts rows
 * @param {boolean} dismissed - has the owner dismissed the banner this session?
 * @returns {boolean}
 */
export function shouldShowOwnerWarning(contacts, dismissed) {
  if (dismissed) return false;
  return countPendingSosContacts(contacts) > 0;
}

// Exact approved banner copy (curly apostrophe). MUST appear verbatim.
export const OWNER_WARNING_COPY =
  "Some of your SOS contacts haven’t confirmed yet. They may receive alerts during the transition, but after 14 days only confirmed contacts will be paged.";
