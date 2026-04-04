/**
 * L2ReportListingSheet -- Report a preloved listing
 *
 * Opens from listing page or chat. Writes to preloved_listing_reports.
 * Reason code selection + optional details. No raw moderation exposed.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, CheckCircle, Loader2, X } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { reportListing, REPORT_REASONS } from '@/lib/reportListing';
import { toast } from 'sonner';

export default function L2ReportListingSheet({ listingId, listingTitle }: {
  listingId?: string;
  listingTitle?: string;
}) {
  const { closeSheet } = useSheet();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !listingId) return;
    setSubmitting(true);
    const ok = await reportListing({
      listingId,
      reason,
      details: details.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
    } else {
      toast.error('Could not submit report. Please try again.');
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-[#30D158]/15 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[#30D158]" />
        </div>
        <h2 className="text-white font-bold text-lg">Report submitted</h2>
        <p className="text-white/40 text-sm max-w-xs">
          We'll review this listing. If it violates our rules, it will be removed.
        </p>
        <button
          onClick={() => closeSheet()}
          className="mt-2 h-10 px-6 rounded-xl text-sm font-bold text-white/60 border border-white/15 active:scale-95 transition-transform"
        >
          Done
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-[#FF3B30]" />
          <h2 className="text-sm font-bold text-white">Report listing</h2>
        </div>
        <button onClick={() => closeSheet()} className="w-8 h-8 flex items-center justify-center">
          <X className="w-5 h-5 text-white/30" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {listingTitle && (
          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Listing</p>
            <p className="text-white text-sm font-bold truncate">{listingTitle}</p>
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            What's wrong?
          </label>
          <div className="space-y-1.5">
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setReason(r.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-[0.98] ${
                  reason === r.value
                    ? 'border-[#FF3B30]/50 bg-[#FF3B30]/10 text-white'
                    : 'border-white/10 bg-[#1C1C1E] text-white/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-1.5">
            Details <span className="text-white/20">(optional)</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Add any additional context..."
            rows={3}
            maxLength={500}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none text-sm resize-none"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      <div className="px-4 py-4 border-t border-white/10 bg-black/80">
        <button
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className={`w-full py-3.5 font-black uppercase tracking-wide rounded-2xl text-sm transition-all active:scale-[0.98] ${
            reason ? 'bg-[#FF3B30] text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {submitting
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
            : 'Submit report'}
        </button>
      </div>
    </div>
  );
}
