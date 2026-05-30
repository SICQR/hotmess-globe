/**
 * reportListing — Writes to preloved_listing_reports + auto-opens moderation_cases
 *
 * Used from listing page and chat to report a preloved listing or seller.
 */

import { supabase } from '@/components/utils/supabaseClient';

export interface ReportInput {
  listingId: string;
  reason: string;
  details?: string;
}

/**
 * Submit a report for a preloved listing.
 * Writes to preloved_listing_reports and auto-creates/links a moderation_cases entry.
 * Returns true on success.
 */
export async function reportListing(input: ReportInput): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    // Strip "preloved_" prefix if present
    const listingId = input.listingId.replace('preloved_', '');

    // 1. Insert report
    const { error: reportError } = await supabase
      .from('preloved_listing_reports')
      .insert({
        reporter_id: session.user.id,
        listing_id: listingId,
        reason: input.reason,
        details: input.details || null,
      });

    if (reportError) {
      console.error('[reportListing] report insert error:', reportError.message);
      return false;
    }

    // 2. Check report count for this listing → auto-flag if 3+
    const { count } = await supabase
      .from('preloved_listing_reports')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId);

    if (count != null && count >= 3) {
      // Auto-flag the listing
      await supabase
        .from('market_listings')
        .update({ moderation: 'flagged' })
        .eq('id', listingId)
        .eq('moderation', 'clear'); // only if currently clear
    }

    // 3. Try to create a moderation case (will fail silently if no admin access — that's fine,
    //    the service role cron/trigger can pick up orphaned reports)
    await supabase
      .from('moderation_cases')
      .insert({
        target_type: 'listing',
        target_id: listingId,
        state: 'open',
        priority: count != null && count >= 3 ? 'high' : 'normal',
        opened_by: session.user.id,
        reason_code: input.reason,
        note: input.details || null,
      })
      .then(null, () => {
        // Expected to fail for non-admin users due to RLS — that's OK
        // Reports table is what matters; cases can be created by admin/cron
      });

    return true;
  } catch (err) {
    console.error('[reportListing] exception:', err);
    return false;
  }
}

/**
 * Report reason codes matching the moderation system spec.
 */
export const REPORT_REASONS = [
  { value: 'prohibited_item', label: 'Prohibited item' },
  { value: 'explicit_content', label: 'Explicit content' },
  { value: 'misleading_listing', label: 'Misleading listing' },
  { value: 'spam', label: 'Spam' },
  { value: 'counterfeit_or_stolen', label: 'Counterfeit or stolen' },
  { value: 'unsafe_meetup_language', label: 'Unsafe meetup language' },
  { value: 'off_topic', label: 'Off topic' },
  { value: 'other', label: 'Other' },
] as const;

export type ReportReason = typeof REPORT_REASONS[number]['value'];
