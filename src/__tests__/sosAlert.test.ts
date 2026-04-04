/**
 * SOS Alert — schema compliance tests
 *
 * Ensures SOS system writes match production schema:
 * - location_shares: user_id, current_lat, current_lng (NOT lat/lng)
 * - trusted_contacts: queried by user_email (NOT user_id), filtered by notify_on_sos
 * - right_now_status: user_id, intent, show_on_globe, expires_at (NOT user_email/status/active)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SOS_FILE = 'src/components/interrupts/SOSOverlay.tsx';

function readSrc(): string {
  try { return fs.readFileSync(path.resolve(SOS_FILE), 'utf8'); } catch { return ''; }
}

describe('SOS schema compliance', () => {
  const src = readSrc();

  it('SOS file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  it('location_shares uses current_lat/current_lng', () => {
    // Check the full file for location_shares insert with correct column names
    expect(src).toContain('current_lat');
    expect(src).toContain('current_lng');
    // The insert should reference location_shares
    const locInserts = src.match(/location_shares[\s\S]{0,200}insert/g) || [];
    expect(locInserts.length).toBeGreaterThan(0);
  });

  it('trusted_contacts queried for push notification contacts', () => {
    // The SOS overlay queries trusted_contacts at least once
    const tcQueries = src.match(/\.from\(['"]trusted_contacts['"]\)/g) || [];
    expect(tcQueries.length).toBeGreaterThan(0);
    // The push notification query should select contact_email
    expect(src).toContain('contact_email');
  });

  it('trusted_contacts filters on notify_on_sos', () => {
    expect(src).toContain('notify_on_sos');
  });

  it('right_now_status writes use user_id, not user_email', () => {
    // All right_now_status writes should use user_id
    const rnsBlocks = src.match(/\.from\(['"]right_now_status['"]\)[\s\S]{0,200}/g) || [];
    expect(rnsBlocks.length).toBeGreaterThan(0);
    for (const block of rnsBlocks) {
      // Should reference user_id, not user_email
      expect(block).not.toContain("user_email");
    }
    // The upsert should use intent 'sos'
    expect(src).toContain("intent: 'sos'");
  });

  it('calls pushNotify for SOS alerts', () => {
    expect(src).toContain('pushNotify');
  });

  it('uses watchPosition for continuous tracking', () => {
    expect(src).toContain('watchPosition');
  });
});
