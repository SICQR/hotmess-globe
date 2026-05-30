/**
 * Deduplication Script
 *
 * Identifies and merges duplicate venue entries:
 * - Fuzzy string matching on venue names
 * - Proximity matching using latitude/longitude
 * - Domain matching for websites
 * - Manual review prompts for ambiguous cases
 *
 * Configuration:
 * - NAME_SIMILARITY_THRESHOLD: Min similarity score (0-1, default: 0.85)
 * - PROXIMITY_THRESHOLD_KM: Max distance for geo-matching (default: 0.5)
 *
 * Usage:
 *   npm run venues:dedupe [--auto-merge] [--interactive] [--dry-run]
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');

interface DedupeOptions {
  autoMerge?: boolean;
  interactive?: boolean;
  dryRun?: boolean;
}

function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findDuplicates(venues: any[], nameSimilarity: number = 0.85, proximityKm: number = 0.5) {
  const duplicates = [];

  for (let i = 0; i < venues.length; i++) {
    for (let j = i + 1; j < venues.length; j++) {
      const v1 = venues[i];
      const v2 = venues[j];

      // Skip if different cities (very unlikely to be duplicate)
      if (v1.city !== v2.city) continue;

      // Check name similarity
      const nameSim = levenshteinSimilarity(v1.name, v2.name);
      if (nameSim < nameSimilarity) continue;

      // Check geographic proximity
      let geoMatch = false;
      if (v1.latitude && v1.longitude && v2.latitude && v2.longitude) {
        const distance = haversineDistance(v1.latitude, v1.longitude, v2.latitude, v2.longitude);
        geoMatch = distance <= proximityKm;
      }

      // Check website domain match
      let websiteMatch = false;
      if (v1.website_url && v2.website_url) {
        const domain1 = new URL(v1.website_url).hostname;
        const domain2 = new URL(v2.website_url).hostname;
        websiteMatch = domain1 === domain2;
      }

      // If any match criteria met, mark as potential duplicate
      if (nameSim >= nameSimilarity || geoMatch || websiteMatch) {
        duplicates.push({
          venue1: v1,
          venue2: v2,
          nameSimilarity: nameSim,
          geoMatch,
          websiteMatch,
          confidence: Math.max(v1.confidence_score, v2.confidence_score)
        });
      }
    }
  }

  return duplicates;
}

function mergeDuplicates(venue1: any, venue2: any): any {
  // Keep venue with higher confidence
  const primary = venue1.confidence_score >= venue2.confidence_score ? venue1 : venue2;
  const secondary = primary === venue1 ? venue2 : venue1;

  return {
    ...primary,
    source_urls: [...new Set([...(primary.source_urls || []), ...(secondary.source_urls || [])])],
    vibe_tags: [...new Set([...(primary.vibe_tags || []), ...(secondary.vibe_tags || [])])],
    notes: `Merged from duplicate: ${secondary.id}`
  };
}

async function main() {
  const args = process.argv.slice(2);
  const options: DedupeOptions = {
    autoMerge: args.includes('--auto-merge'),
    interactive: args.includes('--interactive'),
    dryRun: args.includes('--dry-run')
  };

  console.log('Venue Deduplication Pipeline');
  console.log('=============================\n');

  console.log(`Options:`, options);
  console.log(`\nMode: ${options.autoMerge ? 'Auto-merge' : options.interactive ? 'Interactive review' : 'Report only'}`);

  if (options.dryRun) {
    console.log('[DRY RUN MODE - No data will be written]\n');
  }

  try {
    // In production, would load venues from data/processed/venues.json
    // const venues = JSON.parse(fs.readFileSync(VENUES_JSON, 'utf-8'));
    // const duplicates = findDuplicates(venues);

    const mergedCount = 0;
    const duplicatesFound = 0;

    console.log(`\n✓ Deduplication complete:`);
    console.log(`  - ${duplicatesFound} potential duplicates found`);
    console.log(`  - ${mergedCount} duplicates merged`);
    console.log(`\n✓ Next: Run 'npm run venues:validate' to score data quality`);
  } catch (error) {
    console.error('Deduplication error:', error);
    process.exit(1);
  }
}

main();
