/**
 * PulseFeedbackButton — floating gold dot bottom-right + felt-copy sheet.
 *
 * Phil 2026-05-28. Restores the surface that task #206 thought it shipped but
 * never committed to git. Writes to beta_feedback (RLS: anon + authed both OK).
 *
 * obs_feedback_clusters_72h view depends on rows landing here. Without this
 * button the observation phase has no signal source.
 *
 * Felt-copy doctrine: one question at a time, no chrome, addresses the moment
 * not the technical state.
 */
import React, { useEffect, useState } from 'react';
import { MessageSquareHeart, X, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'something broke', emoji: '⚠' },
  { value: 'idea', label: 'an idea', emoji: '💡' },
  { value: 'praise', label: 'this landed', emoji: '★' },
  { value: 'confused', label: 'I got lost', emoji: '?' },
];

const TEMPERATURE_OPTIONS = [
  { value: 'warm', label: 'warm' },
  { value: 'cool', label: 'cool' },
  { value: 'tense', label: 'tense' },
  { value: 'neutral', label: 'neutral' },
];

export default function PulseFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null);
  const [temperature, setTemperature] = useState(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentAt, setSentAt] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setUserId(data?.user?.id ?? null);
    });
    return () => { alive = false; };
  }, []);

  const reset = () => {
    setFeedbackType(null);
    setTemperature(null);
    setText('');
    setSentAt(null);
  };

  const closeSheet = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const submit = async () => {
    if (!feedbackType || submitting) return;
    setSubmitting(true);
    try {
      const sessionId = (() => {
        try {
          let s = sessionStorage.getItem('hm_feedback_session');
          if (!s) {
            s = crypto.randomUUID();
            sessionStorage.setItem('hm_feedback_session', s);
          }
          return s;
        } catch { return null; }
      })();
      const deviceId = (() => {
        try {
          let d = localStorage.getItem('hm_device_id');
          if (!d) {
            d = crypto.randomUUID();
            localStorage.setItem('hm_device_id', d);
          }
          return d;
        } catch { return null; }
      })();

      await supabase.from('beta_feedback').insert({
        user_id: userId,
        feedback_type: feedbackType,
        emotional_temperature: temperature,
        text: text.trim() || null,
        path: window.location.pathname + window.location.search,
        session_id: sessionId,
        device_id: deviceId,
        user_agent: navigator.userAgent,
        state: 'new',
      });
      setSentAt(Date.now());
      setTimeout(closeSheet, 1500);
    } catch (err) {
      console.warn('[PulseFeedback] insert failed', err);
      // Don't block the user — silent fail per "feedback button must never block"
      setSentAt(Date.now());
      setTimeout(closeSheet, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-[120] flex items-center justify-center w-12 h-12 rounded-full
                     shadow-lg transition-transform active:scale-95"
          style={{
            backgroundColor: GOLD,
            color: '#000',
            bottom: 'calc(env(safe-area-inset-bottom) + 78px)',
            right: '12px',
          }}
          aria-label="Send feedback to HOTMESS"
          title="Send feedback"
        >
          <MessageSquareHeart className="w-5 h-5" />
        </button>
      )}

      {/* Sheet */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={closeSheet}
        >
          <div
            className="w-full sm:max-w-md bg-[#0a0a0c] rounded-t-2xl sm:rounded-2xl border-t sm:border border-white/10
                       p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-white text-lg font-black tracking-tight">
                  Tell us
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  We read every one. Nothing is shared.
                </p>
              </div>
              <button
                onClick={closeSheet}
                className="text-white/40 hover:text-white/70 p-1"
                aria-label="Close feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sentAt ? (
              <div className="py-8 text-center">
                <p className="text-[#C8962C] text-lg font-black">Got it.</p>
                <p className="text-white/50 text-xs mt-2">Phil reads these.</p>
              </div>
            ) : (
              <>
                {/* Type */}
                <p className="text-white/40 text-[11px] uppercase tracking-widest mt-5 mb-2">
                  What's the signal
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setFeedbackType(t.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm
                                  border transition-colors ${
                                    feedbackType === t.value
                                      ? 'bg-[#C8962C]/15 border-[#C8962C]/50 text-white'
                                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                  }`}
                    >
                      <span className="text-base">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Temperature (optional) */}
                <p className="text-white/40 text-[11px] uppercase tracking-widest mt-5 mb-2">
                  How did it feel <span className="text-white/25 normal-case">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPERATURE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTemperature(temperature === t.value ? null : t.value)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        temperature === t.value
                          ? 'bg-white/15 border-white/40 text-white'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Free text */}
                <p className="text-white/40 text-[11px] uppercase tracking-widest mt-5 mb-2">
                  Anything else <span className="text-white/25 normal-case">(optional)</span>
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 1000))}
                  placeholder="What broke / what's missing / what landed"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-white text-sm placeholder-white/30 focus:outline-none
                             focus:border-[#C8962C]/40 resize-none"
                />
                <p className="text-white/20 text-[10px] mt-1 text-right">
                  {text.length}/1000
                </p>

                <button
                  onClick={submit}
                  disabled={!feedbackType || submitting}
                  className="w-full mt-5 py-3 rounded-lg font-bold text-sm tracking-wide
                             flex items-center justify-center gap-2 transition-opacity disabled:opacity-30"
                  style={{ backgroundColor: GOLD, color: '#000' }}
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Send'}
                </button>
                <p className="text-white/25 text-[10px] mt-3 text-center leading-relaxed">
                  Auto-attached: which page, your session. Nothing tracked across sites.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
