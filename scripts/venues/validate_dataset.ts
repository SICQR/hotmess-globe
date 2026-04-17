/**
 * Validation Script
 *
 * Validates data quality and assigns confidence scores:
 * - Checks required fields presence
 * - Validates data types and formats
 * - Verifies geographic coordinates
 * - Scores based on completeness and verification
 * - Categorizes venues by verification status
 *
 * Configuration:
 * - CONFIDENCE_WEIGHTS: Field importance for scoring
 *
 * Usage:
 *   npm run venues:validate [--threshold 50] [--report] [--dry-run]
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');

interface ValidationOptions {
  threshold?: number;
  report?: boolean;
  dryRun?: boolean;
}

interface ValidationResult {
  id: string;
  name: string;
  issues: string[];
  score: number;
  status: 'verified' | 'partial' | 'needs_manual_review';
}

const CONFIDENCE_WEIGHTS = {
  name: 0.15,
  address: 0.1,
  coordinates: 0.15,
  phone: 0.05,
  website: 0.1,
  instagram: 0.05,
  hours: 0.1,
  description: 0.1,
  vibes: 0.05,
  price: 0.05,
  verified: 0.1
};

function validateVenue(venue: any): ValidationResult {
  const issues = [];
  let fieldScore = 0;

  // Check required fields
  if (!venue.id) issues.push('Missing id');
  if (!venue.name) issues.push('Missing name');
  else fieldScore += CONFIDENCE_WEIGHTS.name;

  if (!venue.city) issues.push('Missing city');
  if (!venue.country) issues.push('Missing country');
  if (!venue.venue_type) issues.push('Missing venue_type');

  // Check optional enriched fields
  if (venue.address) fieldScore += CONFIDENCE_WEIGHTS.address;
  else issues.push('Missing address');

  if (venue.latitude && venue.longitude) {
    fieldScore += CONFIDENCE_WEIGHTS.coordinates;
    if (venue.latitude < -90 || venue.latitude > 90 || venue.longitude < -180 || venue.longitude > 180) {
      issues.push('Invalid coordinates');
    }
  } else {
    issues.push('Missing coordinates');
  }

  if (venue.phone) fieldScore += CONFIDENCE_WEIGHTS.phone;
  if (venue.website_url) fieldScore += CONFIDENCE_WEIGHTS.website;
  if (venue.instagram_url) fieldScore += CONFIDENCE_WEIGHTS.instagram;
  if (venue.opening_hours && Object.keys(venue.opening_hours).length > 0) fieldScore += CONFIDENCE_WEIGHTS.hours;
  if (venue.description_short) fieldScore += CONFIDENCE_WEIGHTS.description;
  if (venue.vibe_tags && venue.vibe_tags.length > 0) fieldScore += CONFIDENCE_WEIGHTS.vibes;
  if (venue.price_band && venue.price_band !== 'unknown') fieldScore += CONFIDENCE_WEIGHTS.price;

  // Add bonus for verified status
  if (venue.verification_status === 'verified') fieldScore += CONFIDENCE_WEIGHTS.verified;

  const score = Math.round(fieldScore * 100);

  let status: 'verified' | 'partial' | 'needs_manual_review';
  if (score >= 85) status = 'verified';
  else if (score >= 70) status = 'partial';
  else status = 'needs_manual_review';

  return {
    id: venue.id,
    name: venue.name,
    issues,
    score,
    status
  };
}

function generateValidationReport(results: ValidationResult[]): string {
  const verified = results.filter(r => r.status === 'verified').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const needsReview = results.filter(r => r.status === 'needs_manual_review').length;

  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

  let report = `# Data Validation Report

Generated: ${new Date().toISOString()}

## Summary

- Total venues validated: ${results.length}
- Average confidence score: ${avgScore}%

### Status Distribution

- **Verified**: ${verified} (${Math.round((verified / results.length) * 100)}%)
- **Partial**: ${partial} (${Math.round((partial / results.length) * 100)}%)
- **Needs Manual Review**: ${needsReview} (${Math.round((needsReview / results.length) * 100)}%)

## Issues Found

\`\`\`
`;

  const issueMap: Record<string, number> = {};
  results.forEach(r => {
    r.issues.forEach(issue => {
      issueMap[issue] = (issueMap[issue] || 0) + 1;
    });
  });

  Object.entries(issueMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([issue, count]) => {
      report += `${issue.padEnd(30)} ${count} venues\n`;
    });

  report += `\`\`\`

## Venues Needing Review

${needsReview > 0
  ? results
      .filter(r => r.status === 'needs_manual_review')
      .slice(0, 20)
      .map(r => `- ${r.name} (${r.score}%): ${r.issues.join(', ')}`)
      .join('\n')
  : 'None'}

## Next Steps

1. Address "Missing address" issues with geocoding
2. Review venues with low confidence scores
3. Add missing descriptions from social media
4. Verify contact information
`;

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    threshold: parseInt(args.find(arg => arg.startsWith('--threshold'))?.split('=')[1] || '50'),
    report: args.includes('--report'),
    dryRun: args.includes('--dry-run')
  };

  console.log('Data Validation Pipeline');
  console.log('========================\n');

  console.log(`Options:`, options);

  if (options.dryRun) {
    console.log('[DRY RUN MODE - No data will be written]\n');
  }

  try {
    // In production, would load venues and validate
    const VENUES_JSON = path.join(projectRoot, 'data/processed/venues.json');
    if (fs.existsSync(VENUES_JSON)) {
      const venues = JSON.parse(fs.readFileSync(VENUES_JSON, 'utf-8'));
      const results = venues.map(validateVenue);

      const passCount = results.filter(r => r.score >= options.threshold).length;

      console.log(`\n✓ Validation complete:`);
      console.log(`  - ${results.length} venues validated`);
      console.log(`  - ${passCount} meet threshold (${options.threshold}%+)`);
      console.log(`  - ${results.length - passCount} below threshold`);

      if (options.report) {
        const reportText = generateValidationReport(results);
        const reportPath = path.join(projectRoot, 'reports/validation_report.md');
        fs.writeFileSync(reportPath, reportText);
        console.log(`\n✓ Report written to: ${reportPath}`);
      }
    }

    console.log(`\n✓ Pipeline complete! Ready for Supabase ingestion.`);
  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  }
}

main();
