/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { selectSosRecipients, isGraceActive } from './sosConsent.js';

// ── Fixtures ────────────────────────────────────────────────────────────────
const accepted = { id: 'a', contact_name: 'Accepted', accepted_at: '2026-01-01T00:00:00Z', declined_at: null };
const pending  = { id: 'p', contact_name: 'Pending',  accepted_at: null,                   declined_at: null };
const declined = { id: 'd', contact_name: 'Declined', accepted_at: null,                   declined_at: '2026-01-02T00:00:00Z' };

// Grace window is driven entirely by SOS_CONSENT_GRACE_UNTIL. We mock it via the
// env var (per spec): set it far in the future to open grace, unset it to close.
const FUTURE = '2999-01-01T00:00:00Z';
const PAST   = '2000-01-01T00:00:00Z';

describe('sosConsent.selectSosRecipients — consent gate + grace', () => {
  const original = process.env.SOS_CONSENT_GRACE_UNTIL;

  beforeEach(() => {
    delete process.env.SOS_CONSENT_GRACE_UNTIL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SOS_CONSENT_GRACE_UNTIL;
    else process.env.SOS_CONSENT_GRACE_UNTIL = original;
  });

  it('CASE 1 — accepted contacts are ALWAYS paged (grace open)', () => {
    process.env.SOS_CONSENT_GRACE_UNTIL = FUTURE;
    expect(isGraceActive()).toBe(true);
    const out = selectSosRecipients([accepted]);
    expect(out.map(c => c.id)).toEqual(['a']);
    expect(out[0]._unconsented).toBeUndefined();
  });

  it('CASE 1b — accepted contacts are ALWAYS paged (grace closed / unset)', () => {
    // Grace INACTIVE (env unset) — consented still paged.
    expect(isGraceActive()).toBe(false);
    const out = selectSosRecipients([accepted]);
    expect(out.map(c => c.id)).toEqual(['a']);
  });

  it('CASE 2 — pending contacts are paged DURING grace, tagged _unconsented', () => {
    process.env.SOS_CONSENT_GRACE_UNTIL = FUTURE;
    expect(isGraceActive()).toBe(true);
    const out = selectSosRecipients([pending]);
    expect(out.map(c => c.id)).toEqual(['p']);
    expect(out[0]._unconsented).toBe(true);
    // shallow copy — source row not mutated
    expect(pending._unconsented).toBeUndefined();
  });

  it('CASE 3 — pending contacts are NOT paged after grace (expired)', () => {
    process.env.SOS_CONSENT_GRACE_UNTIL = PAST;
    expect(isGraceActive()).toBe(false);
    const out = selectSosRecipients([pending]);
    expect(out).toEqual([]);
  });

  it('CASE 3b — pending contacts are NOT paged when grace unset/invalid', () => {
    // unset
    expect(isGraceActive()).toBe(false);
    expect(selectSosRecipients([pending])).toEqual([]);
    // invalid value → also inactive
    process.env.SOS_CONSENT_GRACE_UNTIL = 'not-a-date';
    expect(isGraceActive()).toBe(false);
    expect(selectSosRecipients([pending])).toEqual([]);
  });

  it('CASE 4 — declined contacts are NEVER paged (grace open or closed)', () => {
    process.env.SOS_CONSENT_GRACE_UNTIL = FUTURE;
    expect(selectSosRecipients([declined])).toEqual([]);
    delete process.env.SOS_CONSENT_GRACE_UNTIL;
    expect(selectSosRecipients([declined])).toEqual([]);
  });

  it('mixed set — during grace: accepted + pending(tagged), declined dropped', () => {
    process.env.SOS_CONSENT_GRACE_UNTIL = FUTURE;
    const out = selectSosRecipients([accepted, pending, declined]);
    expect(out.map(c => c.id).sort()).toEqual(['a', 'p']);
    const p = out.find(c => c.id === 'p');
    expect(p._unconsented).toBe(true);
    const a = out.find(c => c.id === 'a');
    expect(a._unconsented).toBeUndefined();
  });

  it('mixed set — after grace: only accepted survives', () => {
    process.env.SOS_CONSENT_GRACE_UNTIL = PAST;
    const out = selectSosRecipients([accepted, pending, declined]);
    expect(out.map(c => c.id)).toEqual(['a']);
  });
});
