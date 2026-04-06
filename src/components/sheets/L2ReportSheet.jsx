/**
 * L2ReportSheet -- Standardized 4-step report flow
 *
 * Step 1: Select reason
 * Step 2: Add note (optional)
 * Step 3: Submit -> insert into reports table
 * Step 4: "Thanks for reporting" + "Block this user?" prompt
 *
 * Props: targetType, targetId, targetName, profileId (optional, for block prompt)
 */

import { useState } from 'react';
import { Flag, CheckCircle, Ban, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake', label: 'Fake profile' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

export default function L2ReportSheet({ targetType, targetId, targetName, profileId }) {
  const { closeSheet } = useSheet();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast('Select a reason');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Please sign in');
        setSubmitting(false);
        return;
      }
      await supabase.from('reports').insert({
        reporter_id: session.user.id,
        target_type: targetType || 'unknown',
        target_id: targetId || 'unknown',
        reason,
        details: note || null,
      });
      setStep(4);
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlock = async () => {
    if (!profileId) {
      closeSheet();
      return;
    }
    setBlocking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        closeSheet();
        return;
      }
      await supabase.from('blocks').insert({
        blocker_id: session.user.id,
        blocked_id: profileId,
      });
      toast('User blocked');
      // Optimistically remove from grid
      window.dispatchEvent(new CustomEvent('hm_user_blocked', { detail: { blockedId: profileId } }));
      window.dispatchEvent(new CustomEvent('hm_pull_refresh'));
    } catch {
      // duplicate block or table missing
    } finally {
      setBlocking(false);
      closeSheet();
    }
  };

  // Step 1: Select reason
  if (step === 1) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Report {targetName || targetType || 'this'}</p>
            <p className="text-white/40 text-xs">Step 1 of 2 -- Select a reason</p>
          </div>
        </div>
        <div className="space-y-2">
          {REASONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setReason(value); setStep(2); }}
              className={`w-full px-4 py-3.5 rounded-2xl text-left text-sm font-semibold transition-all active:scale-[0.98] ${
                reason === value
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-[#1C1C1E] text-white border border-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Add note
  if (step === 2) {
    return (
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Add details (optional)</p>
            <p className="text-white/40 text-xs">Step 2 of 2 -- Reason: {reason}</p>
          </div>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder="Tell us more about this issue..."
          className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl text-white text-sm p-3 h-28 resize-none focus:border-[#C8962C] focus:outline-none placeholder:text-white/20"
          maxLength={500}
        />
        <p className="text-right text-[10px] text-white/20 mt-1">{note.length}/500</p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setStep(1)}
            className="flex-1 h-12 rounded-xl bg-white/5 text-white/60 text-sm font-bold"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 h-12 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
          </button>
        </div>
      </div>
    );
  }

  // Step 4: Thanks + block prompt
  return (
    <div className="px-4 pt-4 pb-6 text-center">
      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-[#30D158]" />
      <h2 className="text-white font-black text-lg mb-2">Thanks for reporting</h2>
      <p className="text-white/50 text-sm max-w-xs mx-auto mb-6">
        Our team will review this report. We take every report seriously.
      </p>
      {profileId && (
        <button
          onClick={handleBlock}
          disabled={blocking}
          className="w-full h-12 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 mb-3"
        >
          {blocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
          Block this user
        </button>
      )}
      <button
        onClick={closeSheet}
        className="w-full h-12 rounded-xl bg-white/5 text-white/60 text-sm font-bold active:scale-95 transition-transform"
      >
        Done
      </button>
    </div>
  );
}
