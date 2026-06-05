/**
 * D58 S0 composer tests.
 *
 * Enforces:
 *   - Banned-phrase regression (no pre-D58 weak text leaks through)
 *   - Required-field presence per channel
 *   - Cross-channel event_code parity (Amendment 8)
 *   - Missing-phone fallback explicit
 *   - Event ID format matches HM-SOS-YYYYMMDD-XXXX
 *
 * Runs under the existing vitest config: `npm run test -- _payload-compose`
 */
import { describe, it, expect } from 'vitest';
import { composeSosPayload, TEMPLATE_VERSION, __testing as composeTesting } from './_payload-compose.js';
import { formatEventCode, __testing as idTesting } from './_event-id.js';

const FIXTURE_EVENT = {
  id: 'd7b6d253-9377-46d5-8bfa-bab44111f625',
  created_at: '2026-06-04T18:02:11.000Z',
  type: 'sos',
  metadata: { lat: 51.55592, lng: -0.18582 },
};

const FIXTURE_USER = {
  display_name: 'Alex Smith',
  phone: '+447700900123',
  last_lat: 51.5,
  last_lng: -0.1,
};

const FIXTURE_ACK = 'https://hotmessldn.com/sos/ack/abc123def456';

describe('D58 event ID format', () => {
  it('matches HM-SOS-YYYYMMDD-XXXX shape', () => {
    const code = formatEventCode({
      createdAt: FIXTURE_EVENT.created_at,
      eventId: FIXTURE_EVENT.id,
    });
    expect(code).toMatch(/^HM-SOS-\d{8}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it('is deterministic — same uuid → same tag', () => {
    const a = formatEventCode({ createdAt: '2026-06-04T18:02:11Z', eventId: FIXTURE_EVENT.id });
    const b = formatEventCode({ createdAt: '2026-06-04T22:55:00Z', eventId: FIXTURE_EVENT.id });
    // Same uuid → same tag (different time-of-day same UTC day)
    expect(a).toBe(b);
  });

  it('encodes the UTC date correctly', () => {
    const code = formatEventCode({ createdAt: '2026-06-04T18:02:11Z', eventId: FIXTURE_EVENT.id });
    expect(code).toContain('HM-SOS-20260604-');
  });

  it('handles missing uuid with XXXX fallback', () => {
    const code = formatEventCode({ createdAt: FIXTURE_EVENT.created_at, eventId: null });
    expect(code).toMatch(/HM-SOS-\d{8}-XXXX/);
  });
});

describe('D58 composer — Telegram channel', () => {
  it('includes identity, recognition line, phone, view-live, map, time, event ID', () => {
    const { body } = composeSosPayload({
      channel: 'telegram',
      event: FIXTURE_EVENT,
      user: FIXTURE_USER,
      ackUrl: FIXTURE_ACK,
    });
    expect(body).toContain('🚨 HOTMESS SOS');
    expect(body).toContain('ALEX SMITH triggered SOS');
    expect(body).toContain('You are receiving this alert because Alex listed you as a contact to reach in an emergency');
    expect(body).toContain('Call now:');
    expect(body).toContain('+447700900123');
    expect(body).toContain('View live location:');
    expect(body).toContain(FIXTURE_ACK);
    expect(body).toContain('Last known location:');
    expect(body).toMatch(/https:\/\/maps\.apple\.com\/\?ll=51\.55592,-0\.18582/);
    expect(body).toContain('Triggered:');
    expect(body).toMatch(/\d{2}:\d{2} (BST|GMT)/);
    expect(body).toContain('SOS Event:');
    expect(body).toMatch(/HM-SOS-20260604-[0-9A-HJKMNP-TV-Z]{4}/);
    expect(body).toContain('— HOTMESS member safety');
  });

  it('falls back explicitly when phone missing', () => {
    const { body, missingFields } = composeSosPayload({
      channel: 'telegram',
      event: FIXTURE_EVENT,
      user: { ...FIXTURE_USER, phone: null },
      ackUrl: FIXTURE_ACK,
    });
    expect(body).toContain('Phone not on file');
    expect(missingFields).toContain('phone');
  });

  it('falls back to "A HOTMESS member" when display_name missing', () => {
    const { body, missingFields } = composeSosPayload({
      channel: 'telegram',
      event: FIXTURE_EVENT,
      user: { ...FIXTURE_USER, display_name: null },
      ackUrl: FIXTURE_ACK,
    });
    expect(body).toContain('A HOTMESS MEMBER triggered SOS');
    expect(missingFields).toContain('display_name');
  });
});

describe('D58 composer — SMS channel', () => {
  it('preserves core safety contract within length budget', () => {
    const { body } = composeSosPayload({
      channel: 'sms',
      event: FIXTURE_EVENT,
      user: FIXTURE_USER,
      ackUrl: FIXTURE_ACK,
    });
    expect(body).toContain('🚨 HOTMESS SOS');
    expect(body).toContain('Alex Smith triggered SOS');
    expect(body).toContain('Alex listed you as an emergency contact');
    expect(body).toContain('Call: +447700900123');
    expect(body).toMatch(/Map: https:\/\/maps\.apple\.com/);
    expect(body).toMatch(/At \d{2}:\d{2}/);
    expect(body).toMatch(/Event: HM-SOS-\d{8}-[0-9A-HJKMNP-TV-Z]{4}/);
    // Two-segment budget (≤320 chars)
    expect(body.length).toBeLessThanOrEqual(320);
  });

  it('still includes event ID when phone missing', () => {
    const { body } = composeSosPayload({
      channel: 'sms',
      event: FIXTURE_EVENT,
      user: { ...FIXTURE_USER, phone: null },
      ackUrl: FIXTURE_ACK,
    });
    expect(body).toContain('Phone not on file');
    expect(body).toMatch(/Event: HM-SOS-/);
  });
});

describe('D58 composer — Ops channel', () => {
  it('marks as OPS ALERT and includes full telegram body + event uuid', () => {
    const { body } = composeSosPayload({
      channel: 'ops',
      event: FIXTURE_EVENT,
      user: FIXTURE_USER,
      ackUrl: FIXTURE_ACK,
    });
    expect(body).toContain('[ OPS ALERT — SOS ]');
    expect(body).toContain('ALEX SMITH triggered SOS');
    expect(body).toContain(`Event UUID: ${FIXTURE_EVENT.id}`);
  });
});

describe('D58 cross-channel parity (Amendment 8)', () => {
  it('all channels emit the same event_code for the same event', () => {
    const tg = composeSosPayload({ channel: 'telegram', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    const sms = composeSosPayload({ channel: 'sms', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    const ops = composeSosPayload({ channel: 'ops', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    expect(tg.eventCode).toBe(sms.eventCode);
    expect(sms.eventCode).toBe(ops.eventCode);
  });

  it('all channels report the same template_version', () => {
    const tg = composeSosPayload({ channel: 'telegram', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    const sms = composeSosPayload({ channel: 'sms', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    const ops = composeSosPayload({ channel: 'ops', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    expect(tg.templateVersion).toBe(TEMPLATE_VERSION);
    expect(sms.templateVersion).toBe(TEMPLATE_VERSION);
    expect(ops.templateVersion).toBe(TEMPLATE_VERSION);
  });
});

describe('D58 banned-phrase regression (Amendment 8)', () => {
  it('NO channel output contains pre-D58 weak phrases', () => {
    for (const channel of ['telegram', 'sms', 'ops']) {
      const { body } = composeSosPayload({
        channel,
        event: FIXTURE_EVENT,
        user: FIXTURE_USER,
        ackUrl: FIXTURE_ACK,
      });
      for (const banned of composeTesting.BANNED_PHRASES) {
        expect(body, `${channel} channel must not contain "${banned}"`).not.toContain(banned);
      }
    }
  });

  it('also catches case variants of the banned phrases', () => {
    const tg = composeSosPayload({ channel: 'telegram', event: FIXTURE_EVENT, user: FIXTURE_USER, ackUrl: FIXTURE_ACK });
    expect(tg.body.toLowerCase()).not.toContain('a friend just pressed sos');
    expect(tg.body.toLowerCase()).not.toContain('acknowledge here');
    expect(tg.body.toLowerCase()).not.toContain('call the member now');
  });
});
