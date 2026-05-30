/**
 * L2ReportSheet — v6 Content Policy aligned
 *
 * Surface-aware report categories per HOTMESS-Content-Policy.docx v1.1:
 *   profile  → Fake profile · Harassment · Underage · Explicit without consent · Hate speech · CSAM
 *   message  → Harassment · Threats · Unsolicited explicit · Drug supply · Spam
 *   event    → Fake event · Misleading information · Unsafe conditions
 *   beacon   → Spam beacon · Misleading location
 *   listing  → (kept from existing L2ReportListingSheet pattern)
 *
 * Priority auto-assigned: underage/csam/threats → P1, harassment/outing → P2, rest → P3
 * Urgent flag: routes directly to P1 queue
 * P1 reports → notification_outbox entry for ops
 * All reports → acknowledgement copy per spec ("No report goes silent")
 */

import { useState } from 'react';
import { Flag, CheckCircle, Ban, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

// ── Surface-aware reason config ───────────────────────────────────────────────
const REASONS_BY_SURFACE = {
  profile: [
    { value: 'fake_profile',           label: 'Fake or impersonation',      priority: 'p3' },
    { value: 'harassment',             label: 'Harassment',                  priority: 'p2' },
    { value: 'underage',               label: 'Appears to be under 18',      priority: 'p1', urgent: true },
    { value: 'explicit_no_consent',    label: 'Explicit content without consent', priority: 'p2' },
    { value: 'hate_speech',            label: 'Hate speech',                 priority: 'p2' },
    { value: 'csam',                   label: 'Child sexual abuse material', priority: 'p1', urgent: true },
    { value: 'outing',                 label: 'Outing without consent',      priority: 'p1' },
    { value: 'drug_supply',            label: 'Drug supply solicitation',    priority: 'p1' },
  ],
  message: [
    { value: 'harassment',             label: 'Harassment',                  priority: 'p2' },
    { value: 'threats',                label: 'Threats of violence',         priority: 'p1', urgent: true },
    { value: 'unsolicited_explicit',   label: 'Unsolicited explicit content', priority: 'p2' },
    { value: 'drug_supply',            label: 'Drug supply solicitation',    priority: 'p1' },
    { value: 'spam',                   label: 'Spam',                        priority: 'p3' },
  ],
  event: [
    { value: 'fake_event',             label: 'Fake or misleading event',    priority: 'p3' },
    { value: 'misleading_info',        label: 'Misleading information',      priority: 'p3' },
    { value: 'unsafe_conditions',      label: 'Unsafe conditions',           priority: 'p2' },
    { value: 'explicit_no_consent',    label: 'Inappropriate content',       priority: 'p2' },
  ],
  beacon: [
    { value: 'spam_beacon',            label: 'Spam beacon',                 priority: 'p3' },
    { value: 'misleading_location',    label: 'Misleading location',         priority: 'p3' },
    { value: 'harassment',             label: 'Harassment',                  priority: 'p2' },
  ],
  listing: [
    { value: 'fake_listing',           label: 'Fake or fraudulent listing',  priority: 'p2' },
    { value: 'misleading_info',        label: 'Misleading description',      priority: 'p3' },
    { value: 'spam',                   label: 'Spam',                        priority: 'p3' },
    { value: 'inappropriate',          label: 'Inappropriate content',       priority: 'p2' },
  ],
  // fallback
  default: [
    { value: 'spam',                   label: 'Spam',                        priority: 'p3' },
    { value: 'harassment',             label: 'Harassment',                  priority: 'p2' },
    { value: 'fake',                   label: 'Fake content',                priority: 'p3' },
    { value: 'inappropriate',          label: 'Inappropriate content',       priority: 'p2' },
    { value: 'other',                  label: 'Other',                       priority: 'p3' },
  ],
};

function getReasonsForSurface(surface) {
  return REASONS_BY_SURFACE[surface] || REASONS_BY_SURFACE.default;
}

// ── P1 alert copy ─────────────────────────────────────────────────────────────
const P1_LABELS = new Set(['csam', 'underage', 'threats']);

function isP1Urgent(value) {
  return P1_LABELS.has(value);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function L2ReportSheet({ targetType, targetId, targetName, profileId }) {
  const { closeSheet } = useSheet();
  const surface = targetType || 'default';
  const reasons = getReasonsForSurface(surface);

  const [step, setStep]           = useState(1);
  const [selectedReason, setSelectedReason] = useState(null);
  const [note, setNote]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking]   = useState(false);

  const handleSelectReason = (reason) => {
    setSelectedReason(reason);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast('Select a reason');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Please sign in to report');
        setSubmitting(false);
        return;
      }

      const isUrgent = selectedReason.urgent || isP1Urgent(selectedReason.value);

      // Insert report
      await supabase.from('reports').insert({
        reporter_id:  session.user.id,
        target_type:  surface,
        target_id:    targetId   || null,
        reason:       selectedReason.value,
        details:      note || null,
        priority:     selectedReason.priority || 'p3',
        urgent:       isUrgent,
      });

      // P1 → ops notification
      if (selectedReason.priority === 'p1') {
        await supabase.from('notification_outbox').insert({
          recipient_id: null,
          type:         'content_report_p1',
          payload: {
            surface,
            reason:      selectedReason.value,
            target_id:   targetId || null,
            reporter_id: session.user.id,
            urgent:      isUrgent,
          },
          status: 'queued',
        }).throwOnError();
      }

      setStep(4);
    } catch {
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!profileId) { closeSheet(); return; }
    setBlocking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('blocks').insert({
          blocker_id: session.user.id,
          blocked_id: profileId,
        });
        toast('User blocked');
        window.dispatchEvent(new CustomEvent('hm_user_blocked', { detail: { blockedId: profileId } }));
        window.dispatchEvent(new CustomEvent('hm_pull_refresh'));
      }
    } catch { /* duplicate block — ignore */ }
    finally { setBlocking(false); closeSheet(); }
  };

  // ── Step 1: Select reason ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              Report {targetName ? `"${targetName}"` : (surface !== 'default' ? surface : 'this')}
            </p>
            <p className="text-white/40 text-xs">Step 1 of 2 — Select a reason</p>
          </div>
        </div>

        <div className="space-y-2">
          {reasons.map((r) => {
            const isHighPriority = r.priority === 'p1';
            return (
              <button
                key={r.value}
                onClick={() => handleSelectReason(r)}
                className={`w-full px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] ${
                  isHighPriority
                    ? 'bg-red-900/20 text-red-300 border border-red-500/30 text-sm font-bold'
                    : 'bg-[#1C1C1E] text-white border border-white/5 text-sm font-semibold'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isHighPriority && (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-white/25 text-[10px] text-center mt-4 leading-relaxed">
          All reports are reviewed. Reporting is anonymous — the person you report won't know it was you.
        </p>
      </div>
    );
  }

  // ── Step 2: Add note ──────────────────────────────────────────────────────
  if (step === 2) {
    const isUrgent = selectedReason?.urgent || isP1Urgent(selectedReason?.value);
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isUrgent ? 'bg-red-500/20' : 'bg-[#C8962C]/15'
          }`}>
            <Flag className={`w-5 h-5 ${isUrgent ? 'text-red-400' : 'text-[#C8962C]'}`} />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{selectedReason?.label}</p>
            <p className="text-white/40 text-xs">Step 2 of 2 — Add detail (optional)</p>
          </div>
        </div>

        {isUrgent && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-red-900/20 border border-red-500/30">
            <p className="text-red-300 text-xs font-semibold">
              This report goes directly to our urgent review queue — we'll act within 15 minutes.
            </p>
          </div>
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any details that might help us review this report…"
          rows={4}
          className="w-full px-4 py-3 rounded-2xl bg-[#1C1C1E] text-white text-sm border border-white/10 placeholder-white/30 resize-none focus:outline-none focus:border-white/20"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setStep(1)}
            className="flex-1 py-3.5 rounded-2xl bg-white/5 text-white/60 text-sm font-semibold border border-white/8 active:scale-[0.98] transition-all"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-2xl bg-red-500/20 text-red-300 text-sm font-bold border border-red-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Confirmation ──────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-8 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-[#C8962C]/15 flex items-center justify-center">
        <CheckCircle className="w-7 h-7 text-[#C8962C]" />
      </div>

      <div>
        <p className="text-white font-bold text-base mb-1">Report received</p>
        <p className="text-white/50 text-sm leading-relaxed">
          Thanks for keeping HOTMESS safe. Your report has been submitted and will be reviewed.
          {selectedReason?.priority === 'p1'
            ? ' This type of report is prioritised — we\'ll review it within 15 minutes.'
            : ' We aim to review all reports within 24 hours.'}
        </p>
      </div>

      <p className="text-white/25 text-xs">
        Your identity is never shared with the person you reported.
      </p>

      {profileId && (
        <div className="w-full pt-2 border-t border-white/8">
          <p className="text-white/50 text-xs mb-3">Do you also want to block this user?</p>
          <div className="flex gap-2">
            <button
              onClick={closeSheet}
              className="flex-1 py-3 rounded-2xl bg-white/5 text-white/50 text-sm border border-white/8 active:scale-[0.98]"
            >
              No thanks
            </button>
            <button
              onClick={handleBlock}
              disabled={blocking}
              className="flex-1 py-3 rounded-2xl bg-white/8 text-white text-sm font-bold border border-white/15 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <><Ban className="w-4 h-4" /> Block</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
