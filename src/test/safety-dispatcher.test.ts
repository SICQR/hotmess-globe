/**
 * Unit + integration tests for the safety dispatcher.
 *
 * Provider clients are mocked via env-var absence (channels return skipped) and
 * via Supabase client stubs. The DB itself is mocked via an in-memory shim so
 * tests run without network and without Supabase running.
 */
import { describe, it, expect, beforeEach } from 'vitest';
// dispatcher is .js — Vitest's resolver handles JS from a .test.ts via tsconfig allowJs
// (the project already imports .js files from .ts elsewhere).
import { dispatchSafetyEvent, __testing, CHANNEL_MAP } from '../../api/notifications/dispatcher.js';

type DBRow = Record<string, unknown>;

function makeSupabaseMock(seed: Record<string, DBRow[]>) {
  const tables: Record<string, DBRow[]> = JSON.parse(JSON.stringify(seed));

  function from(tableName: string) {
    const rows = (tables[tableName] = tables[tableName] || []);
    let filtered = rows.slice();
    // mode is sticky once insert/update/delete is set; .select() after them
    // is a returning-clause hint, not a mode change.
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let returning: 'array' | 'single' | 'maybeSingle' = 'array';
    let pendingInsert: DBRow | DBRow[] | null = null;
    let pendingUpdate: DBRow | null = null;
    let insertedRows: DBRow[] = [];

    function runIfWriteMode() {
      if (mode === 'insert' && insertedRows.length === 0 && pendingInsert) {
        const ins = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
        for (const row of ins) {
          const newRow: DBRow = { id: `mock-${Math.random().toString(36).slice(2)}`, ...row };
          rows.push(newRow);
          insertedRows.push(newRow);
        }
      }
    }

    const builder: any = {
      select(_cols?: string) {
        // Don't change mode if already insert/update/delete — this is a
        // returning clause for those operations.
        if (mode === 'select') mode = 'select';
        return builder;
      },
      insert(payload: DBRow | DBRow[]) {
        mode = 'insert';
        pendingInsert = payload;
        return builder;
      },
      update(patch: DBRow) {
        mode = 'update';
        pendingUpdate = patch;
        return builder;
      },
      delete() { mode = 'delete'; return builder; },
      eq(col: string, val: unknown) {
        filtered = filtered.filter(r => r[col] === val);
        return builder;
      },
      maybeSingle() { returning = 'maybeSingle'; return builder.then(); },
      single() { returning = 'single'; return builder.then(); },
      limit(_n: number) { return builder; },
      then(resolve?: Function) {
        if (mode === 'insert') {
          runIfWriteMode();
          const last = insertedRows[insertedRows.length - 1];
          const out = returning === 'array'
            ? { data: insertedRows, error: null }
            : { data: last ?? null, error: null };
          return resolve ? resolve(out) : Promise.resolve(out);
        }
        if (mode === 'update') {
          for (const row of filtered) Object.assign(row, pendingUpdate);
          const out = returning === 'array'
            ? { data: filtered, error: null }
            : { data: filtered[0] ?? null, error: null };
          return resolve ? resolve(out) : Promise.resolve(out);
        }
        if (mode === 'delete') {
          for (const row of filtered) {
            const idx = rows.indexOf(row);
            if (idx >= 0) rows.splice(idx, 1);
          }
          return resolve ? resolve({ data: null, error: null }) : Promise.resolve({ data: null, error: null });
        }
        // select
        const out = returning === 'array'
          ? { data: filtered, error: null }
          : { data: filtered[0] ?? null, error: null };
        return resolve ? resolve(out) : Promise.resolve(out);
      },
    };
    return builder;
  }

  return { from, _tables: tables };
}

describe('dispatcher helpers', () => {
  it('isP0Type identifies SOS and Get Out', () => {
    expect(__testing.isP0Type('sos')).toBe(true);
    expect(__testing.isP0Type('get_out')).toBe(true);
    expect(__testing.isP0Type('land_time_miss')).toBe(false);
    expect(__testing.isP0Type('window_alert')).toBe(false);
  });

  it('eventLocationStr formats coords from metadata', () => {
    const s = __testing.eventLocationStr(
      { metadata: { lat: 51.5, lng: -0.12 } },
      { last_lat: null, last_lng: null },
    );
    expect(s).toBe('51.50000, -0.12000');
  });

  it('eventLocationStr falls back to profile coords', () => {
    const s = __testing.eventLocationStr(
      { metadata: {} },
      { last_lat: 1.234567, last_lng: 5.678901 },
    );
    expect(s).toBe('1.23457, 5.67890');
  });

  it('eventLocationStr returns Location unavailable when both empty', () => {
    expect(__testing.eventLocationStr({ metadata: {} }, {})).toBe('Location unavailable');
  });

  it('SEQUENTIAL_SCHEDULE has 5 steps escalating over 15 minutes', () => {
    expect(__testing.SEQUENTIAL_SCHEDULE.length).toBe(5);
    const offsets = __testing.SEQUENTIAL_SCHEDULE.map(s => s.offsetSec);
    expect(offsets).toEqual([0, 60, 120, 300, 900]);
  });

  it('FANOUT_IMMEDIATE excludes voice (held back as 90s escalation)', () => {
    expect(__testing.FANOUT_IMMEDIATE).toEqual(['push', 'sms', 'whatsapp', 'email']);
  });
});

describe('dispatcher fanout (Mode A)', () => {
  beforeEach(() => {
    // Force every channel to return skipped — proves the dispatcher writes
    // delivery_log rows even when no provider is configured.
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.RESEND_API_KEY;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.META_WHATSAPP_TOKEN;
  });

  it('emits 4 immediate-channel attempts per contact and writes delivery_log rows', async () => {
    const supabase = makeSupabaseMock({
      safety_events: [{
        id: 'evt-1',
        user_id: 'user-1',
        type: 'sos',
        metadata: { lat: 51.5, lng: -0.1 },
        created_at: new Date().toISOString(),
      }],
      profiles: [{ id: 'user-1', display_name: 'Phil', email: 'phil@example.com', last_lat: null, last_lng: null }],
      trusted_contacts: [
        { id: 'tc-1', user_id: 'user-1', contact_name: 'Glen', contact_phone: '+447528148734', contact_email: null, role: 'trusted', notify_on_sos: true },
      ],
      safety_delivery_log: [],
      push_subscriptions: [],
    });

    const result = await dispatchSafetyEvent({ supabase: supabase as any, eventId: 'evt-1' });

    expect(result.mode).toBe('fanout');
    expect(result.event_id).toBe('evt-1');
    // 1 contact × 4 channels = 4 attempts. All skipped because env unset.
    expect(result.skipped + result.delivered + result.failed).toBe(4);
    expect(supabase._tables.safety_delivery_log.length).toBe(4);
    // All 4 are 'skipped' because no provider env
    const statuses = supabase._tables.safety_delivery_log.map((r: any) => r.status);
    expect(statuses.every((s: string) => s === 'skipped')).toBe(true);
  });

  it('returns zero attempts when no contacts opted into SOS', async () => {
    const supabase = makeSupabaseMock({
      safety_events: [{
        id: 'evt-2',
        user_id: 'user-2',
        type: 'sos',
        metadata: {},
        created_at: new Date().toISOString(),
      }],
      profiles: [{ id: 'user-2', display_name: 'Test', email: null, last_lat: null, last_lng: null }],
      trusted_contacts: [],
      safety_delivery_log: [],
      push_subscriptions: [],
    });
    const result = await dispatchSafetyEvent({ supabase: supabase as any, eventId: 'evt-2' });
    expect(result.delivered + result.failed + result.skipped).toBe(0);
  });
});

describe('dispatcher sequential (Mode B)', () => {
  it('schedules 5 steps and fires t+0 self push immediately', async () => {
    const supabase = makeSupabaseMock({
      safety_events: [{
        id: 'evt-3',
        user_id: 'user-3',
        type: 'land_time_miss',
        metadata: {},
        created_at: new Date().toISOString(),
      }],
      profiles: [{ id: 'user-3', display_name: 'Test', email: null, last_lat: null, last_lng: null }],
      trusted_contacts: [
        { id: 'tc-3', user_id: 'user-3', contact_name: 'Glen', contact_phone: '+447528148734', contact_email: null, role: 'trusted', notify_on_sos: true },
      ],
      safety_delivery_log: [],
      push_subscriptions: [],
    });

    const result = await dispatchSafetyEvent({ supabase: supabase as any, eventId: 'evt-3' });
    expect(result.mode).toBe('sequential');
    // Step 1: self push (1 row), step 2: contact push (1), step 3: contact sms (1),
    // step 4: contact whatsapp + email (2), step 5: contact voice (1) = 6 rows scheduled.
    // Plus the t+0 attempt overwrites the queued self-push status.
    expect(supabase._tables.safety_delivery_log.length).toBe(6);
  });
});

describe('channel modules return skipped (not failed) when not configured', () => {
  it.each([
    ['sms', { contact: { contact_phone: '+44...' }, user: {}, event: {} }],
    ['email', { contact: { contact_email: 'x@y.com' }, user: {}, event: {} }],
    ['whatsapp', { contact: { contact_phone: '+44...' }, user: {}, event: {} }],
    ['voice', { contact: { contact_phone: '+44...' }, user: {}, event: {}, deliveryId: 'd-1' }],
  ])('%s skips with reason when env unset', async (name: string, opts: any) => {
    const result = await CHANNEL_MAP[name as keyof typeof CHANNEL_MAP].send(opts as any);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    expect(typeof result.error).toBe('string');
  });
});
