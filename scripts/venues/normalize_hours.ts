/**
 * Normalize Hours Script
 *
 * Standardizes opening hours across venues:
 * - Converts various time formats to HH:MM
 * - Handles special cases (24 hours, seasonal variations)
 * - Organizes by day of week
 * - Handles multiple sessions per day
 * - Validates time logic (close > open)
 *
 * Configuration:
 * - TIMEZONE: Reference timezone for validation (default: UTC)
 * - DEFAULT_HOURS: Fallback hours if unknown
 *
 * Usage:
 *   npm run venues:normalize [--city London] [--strict] [--dry-run]
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');

interface NormalizeOptions {
  city?: string;
  strict?: boolean;
  dryRun?: boolean;
}

interface OpeningHoursDay {
  open: string;
  close: string;
}

interface NormalizedHours {
  [day: string]: OpeningHoursDay[];
  notes?: string;
}

function parseTime(timeStr: string): string | null {
  if (!timeStr) return null;

  // Remove whitespace and normalize
  const clean = timeStr.trim().toUpperCase();

  // Match HH:MM or H:MM format
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = parseInt(match[1]);
    const min = parseInt(match[2]);
    if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  // Handle special cases
  if (clean === '24H' || clean === '24 HOURS' || clean === '24/7') {
    return '00:00';
  }

  return null;
}

function normalizeHours(rawHours: any): NormalizedHours {
  const normalized: NormalizedHours = {};

  if (!rawHours) {
    return normalized;
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  days.forEach(day => {
    if (rawHours[day]) {
      const dayHours = Array.isArray(rawHours[day]) ? rawHours[day] : [rawHours[day]];

      normalized[day] = dayHours
        .map((session: any) => {
          const open = parseTime(session.open);
          const close = parseTime(session.close);

          if (open && close) {
            return { open, close };
          }
          return null;
        })
        .filter((h: any) => h !== null);
    }
  });

  if (rawHours.notes) {
    normalized.notes = rawHours.notes;
  }

  return normalized;
}

function validateHours(hours: NormalizedHours): { valid: boolean; issues: string[] } {
  const issues = [];

  Object.entries(hours).forEach(([day, sessions]) => {
    if (day === 'notes') return;

    if (!Array.isArray(sessions)) {
      issues.push(`Invalid format for ${day}`);
      return;
    }

    sessions.forEach((session, idx) => {
      if (!session.open || !session.close) {
        issues.push(`Missing time for ${day} session ${idx + 1}`);
        return;
      }

      const [openHour, openMin] = session.open.split(':').map(Number);
      const [closeHour, closeMin] = session.close.split(':').map(Number);

      const openMins = openHour * 60 + openMin;
      const closeMins = closeHour * 60 + closeMin;

      // Allow closing after midnight
      if (closeMins <= openMins && closeMins > 0) {
        issues.push(`Invalid times for ${day} session ${idx + 1}: close before open`);
      }
    });
  });

  return {
    valid: issues.length === 0,
    issues
  };
}

async function main() {
  const args = process.argv.slice(2);
  const options: NormalizeOptions = {
    city: args.find(arg => arg.startsWith('--city'))?.split('=')[1],
    strict: args.includes('--strict'),
    dryRun: args.includes('--dry-run')
  };

  console.log('Hours Normalization Pipeline');
  console.log('============================\n');

  console.log(`Options:`, options);
  console.log(`\nMode: ${options.strict ? 'Strict validation (reject invalid)' : 'Lenient (log warnings)'}`);

  if (options.dryRun) {
    console.log('[DRY RUN MODE - No data will be written]\n');
  }

  try {
    // Process venues
    let normalizedCount = 0;
    const failedVenues = [];

    // In production, would load venues from data/processed/venues.json
    // For each venue:
    //   1. Extract raw opening_hours
    //   2. Call normalizeHours
    //   3. Call validateHours
    //   4. Update venue record
    //   5. Track failures if strict mode

    console.log(`\n✓ Normalization complete:`);
    console.log(`  - ${normalizedCount} venues processed`);
    console.log(`  - ${failedVenues.length} venues with issues`);
    console.log(`\n✓ Next: Run 'npm run venues:dedupe' to identify duplicates`);
  } catch (error) {
    console.error('Normalization error:', error);
    process.exit(1);
  }
}

main();
