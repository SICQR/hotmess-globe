/**
 * L2SupportSheet — Support ticket form
 *
 * Fields: type dropdown, subject, body textarea.
 * Submit inserts into support_tickets table.
 * Fallback: if DB write fails, opens mailto:support@hotmessldn.com.
 */

import { useState } from 'react';
import { Send, Loader2, ChevronDown, CheckCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errorUtils';

const TICKET_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'question', label: 'Question' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
];

export default function L2SupportSheet() {
  const { closeSheet } = useSheet();
  const [type, setType] = useState('bug');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      // Get current user (optional — allow anonymous support tickets)
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      const { error } = await supabase.from('support_tickets').insert({
        user_id: userId,
        user_email: userEmail,
        type,
        subject: subject.trim(),
        body: body.trim(),
        status: 'open',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Support ticket submitted. We\'ll get back to you.');
    } catch (err) {
      console.warn('[Support] DB write failed, falling back to email:', err);
      // Fallback: open mailto with pre-filled content
      const mailSubject = encodeURIComponent(`[${type.toUpperCase()}] ${subject.trim()}`);
      const mailBody = encodeURIComponent(body.trim());
      window.open(
        `mailto:support@hotmessldn.com?subject=${mailSubject}&body=${mailBody}`,
        '_blank'
      );
      toast('Opening your email app as a backup.', {
        description: humanizeError(err, 'Couldn\'t submit ticket directly.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-[#C8962C]/15 flex items-center justify-center mb-4">
          <CheckCircle className="w-7 h-7 text-[#C8962C]" />
        </div>
        <p className="text-white font-bold text-base mb-1">Ticket submitted</p>
        <p className="text-white/40 text-sm mb-5">
          We'll review it and get back to you as soon as possible.
        </p>
        <button
          onClick={closeSheet}
          className="h-11 px-6 rounded-xl bg-[#C8962C] text-black font-bold text-sm active:scale-95 transition-transform"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
        {/* Type dropdown */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-black block mb-2">
            What is this about?
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full appearance-none bg-[#1C1C1E] border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-[#C8962C]/50 transition-colors"
            >
              {TICKET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-black block mb-2">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value.slice(0, 100))}
            placeholder="Brief summary of the issue"
            maxLength={100}
            className="w-full bg-[#1C1C1E] border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#C8962C]/50 transition-colors"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-black block mb-2">
            Details
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 2000))}
            placeholder="Tell us what happened, what you expected, and any steps to reproduce..."
            maxLength={2000}
            rows={6}
            className="w-full bg-[#1C1C1E] border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#C8962C]/50 transition-colors resize-none leading-relaxed"
          />
          <p className="text-white/15 text-[10px] mt-1 text-right">{body.length}/2000</p>
        </div>

        <p className="text-white/20 text-[10px] leading-relaxed">
          If the form doesn't work, your message will be sent via email to support@hotmessldn.com instead.
        </p>
      </div>

      {/* Submit button */}
      <div className="px-4 py-4 border-t border-white/8">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            canSubmit
              ? 'bg-[#C8962C] text-black active:scale-95'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit
            </>
          )}
        </button>
      </div>
    </div>
  );
}
