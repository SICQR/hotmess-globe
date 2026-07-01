/**
 * ownerWarning.test.js
 *
 * Banner-lifecycle unit tests around the pure predicate shouldShowOwnerWarning
 * and its helpers. Presentation-only: verifies the "should the owner-warning
 * banner show?" decision across pending / dismissed / accepted / declined
 * states. No rendering or DB required.
 */

import { describe, it, expect } from 'vitest';
import {
  isPendingSosContact,
  countPendingSosContacts,
  shouldShowOwnerWarning,
  OWNER_WARNING_COPY,
} from './ownerWarning';

const pending  = { id: 'p', notify_on_sos: true, accepted_at: null, declined_at: null };
const accepted = { id: 'a', notify_on_sos: true, accepted_at: '2026-06-01T00:00:00Z', declined_at: null };
const declined = { id: 'd', notify_on_sos: true, accepted_at: null, declined_at: '2026-06-01T00:00:00Z' };
const optedOut = { id: 'o', notify_on_sos: false, accepted_at: null, declined_at: null };

describe('isPendingSosContact', () => {
  it('true only when opted into SOS and neither accepted nor declined', () => {
    expect(isPendingSosContact(pending)).toBe(true);
    expect(isPendingSosContact(accepted)).toBe(false);
    expect(isPendingSosContact(declined)).toBe(false);
    expect(isPendingSosContact(optedOut)).toBe(false);
  });
  it('treats undefined accepted/declined the same as null', () => {
    expect(isPendingSosContact({ notify_on_sos: true })).toBe(true);
  });
  it('is null-safe', () => {
    expect(isPendingSosContact(null)).toBe(false);
    expect(isPendingSosContact(undefined)).toBe(false);
  });
});

describe('countPendingSosContacts', () => {
  it('counts only pending SOS contacts', () => {
    expect(countPendingSosContacts([pending, accepted, declined, optedOut, pending])).toBe(2);
  });
  it('is safe on non-arrays', () => {
    expect(countPendingSosContacts(null)).toBe(0);
    expect(countPendingSosContacts(undefined)).toBe(0);
  });
});

describe('shouldShowOwnerWarning — banner lifecycle', () => {
  it('shows when >=1 pending contact and not dismissed', () => {
    expect(shouldShowOwnerWarning([pending, accepted], false)).toBe(true);
  });

  it('stays hidden for the session after dismiss (still pending)', () => {
    // simulate the session dismiss flag flipping to true while a contact is still pending
    let dismissed = false;
    expect(shouldShowOwnerWarning([pending], dismissed)).toBe(true);
    dismissed = true; // user tapped X
    expect(shouldShowOwnerWarning([pending], dismissed)).toBe(false);
  });

  it('no longer shows once the pending contact becomes accepted', () => {
    expect(shouldShowOwnerWarning([accepted], false)).toBe(false);
  });

  it('no longer shows once the pending contact becomes declined', () => {
    expect(shouldShowOwnerWarning([declined], false)).toBe(false);
  });

  it('does not show with no contacts', () => {
    expect(shouldShowOwnerWarning([], false)).toBe(false);
  });
});

describe('OWNER_WARNING_COPY', () => {
  it('is the exact approved sentence with a curly apostrophe', () => {
    expect(OWNER_WARNING_COPY).toBe(
      'Some of your SOS contacts haven’t confirmed yet. They may receive alerts during the transition, but after 14 days only confirmed contacts will be paged.'
    );
  });
});
