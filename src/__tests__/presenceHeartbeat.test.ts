/**
 * Presence heartbeat — schema compliance tests
 *
 * Verifies usePresenceHeartbeat writes to correct tables:
 * - profiles: last_seen, is_online (5-minute interval)
 * - user_presence: user_id, status, last_seen_at, expires_at (30-second interval)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const HOOK_FILE = 'src/hooks/usePresenceHeartbeat.ts';

function readSrc(): string {
  try { return fs.readFileSync(path.resolve(HOOK_FILE), 'utf8'); } catch { return ''; }
}

describe('Presence heartbeat schema compliance', () => {
  const src = readSrc();

  it('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(50);
  });

  it('updates profiles.last_seen and is_online', () => {
    expect(src).toContain("from('profiles')");
    expect(src).toContain('last_seen');
    expect(src).toContain('is_online');
  });

  it('upserts to user_presence TABLE (not presence view)', () => {
    expect(src).toContain("from('user_presence')");
    expect(src).toContain('upsert');
  });

  it('user_presence includes required fields', () => {
    expect(src).toContain('user_id');
    expect(src).toContain('status');
    expect(src).toContain('last_seen_at');
    expect(src).toContain('expires_at');
  });

  it('uses getSession() not getUser() (avoids auth floods)', () => {
    expect(src).toContain('getSession');
    expect(src).not.toContain('getUser');
  });

  it('cleans up intervals on unmount', () => {
    expect(src).toContain('clearInterval');
  });

  it('fires on visibility change (app foregrounded)', () => {
    expect(src).toContain('visibilitychange');
  });
});
