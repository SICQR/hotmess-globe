/**
 * Pulse Feedback Sheet — 6-type selector → optional text/screenshot → submit.
 *
 * Phil 2026-05-27 — culturally-aligned feedback UI.
 * Copy throughout: "What's feeling weird?" not "Submit support ticket".
 * Success: "Got it. HOTMESS saw this."
 *
 * Unsafe type → success-redirects to existing /api/safety report flow.
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Bug, HelpCircle, ShieldAlert, Sparkles, Lightbulb, Heart, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { trackEvent } from '@/components/utils/analytics';

const GOLD = '#C8962C';
const CARD = '#0D0D0F';
const URGENT = '#FF3D2E';

const TYPES = [
  { key: 'bug',       label: 'Bug',         icon: Bug,         color: '#FF3D2E', sub: 'Something broke' },
  { key: 'confusing', label: 'Confusing',   icon: HelpCircle,  color: '#FFAB00', sub: 'Not sure what to do' },
  { key: 'unsafe',    label: 'Unsafe',      icon: ShieldAlert, color: URGENT,    sub: 'Trust / safety concern', escalate: true },
  { key: 'vibe',      label: 'Vibe',        icon: Sparkles,    color: '#C8962C', sub: 'How this feels' },
  { key: 'idea',      label: 'Idea',        icon: Lightbulb,   color: '#39FF14', sub: 'What should HOTMESS do' },
  { key: 'love',      label: 'Love This',   icon: Heart,       color: '#FF4F9A', sub: 'What should stay forever' },
];

function captureMetadata(extra = {}) {
  const deviceId = (() => { try { return localStorage.getItem('hm_device_id'); } catch { return null; } })();
  const sessionId = (() => {
    try {
      const raw = sessionStorage.getItem('hm_session');
      if (raw) return JSON.parse(raw)?.id || null;
    } catch { return null; }
    return null;
  })();
  return {
    path: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    device_id: deviceId,
    session_id: sessionId,
    user_agent: navigator.userAgent,
    online: navigator.onLine,
    map_tier: window.__hm_pulse_tier || null,
    ...extra,
  };
}

export function PulseFeedbackSheet({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [type, setType] = useState(null);
  const [text, setText] = useState('');
  const [screenshot, setScreenshot] = useState(null); // base64 dataURL
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [error, setError] = useState(null);

  const handleScreenshot = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image too large (max 2MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result || null);
    reader.readAsDataURL(file);
  }, []);

  const submit = useCallback(async () => {
    if (!type) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          type,
          text: text.trim() || null,
          screenshot_data_url: screenshot,
          metadata: captureMetadata(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error === 'rate_limited'
          ? 'You’re sending a lot — try again in a bit.'
          : 'Could not send. Try again.');
        setStatus('error');
        setSubmitting(false);
        return;
      }
      trackEvent('feedback_submitted_client', { category: 'feedback', feedback_type: type, escalated: json.escalated });
      setStatus('success');
      setSubmitting(false);

      // Unsafe — also nudge into existing safety/report flow after 1.2s.
      if (json.escalated) {
        setTimeout(() => {
          onClose();
          navigate('/help/safety');
        }, 1200);
      } else {
        setTimeout(onClose, 1600);
      }
    } catch (e) {
      setError('Network error. Try again.');
      setStatus('error');
      setSubmitting(false);
    }
  }, [type, text, screenshot, onClose, navigate]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, { offset, velocity }) => {
          if (offset.y > 100 || velocity.y > 500) onClose();
        }}
        className="fixed inset-x-0 bottom-0 z-[100] bg-[#050507] border-t border-[#C8962C]/40 rounded-t-[28px] pb-[calc(20px+env(safe-area-inset-bottom,0px))]"
        data-pull-refresh-ignore
      >
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-2 mb-1" />

        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>HOTMESS</p>
            <h2 className="text-lg font-black text-white">What&apos;s feeling weird?</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
                 style={{ background: '#39FF1422', border: '1px solid #39FF1455' }}>
              <Check className="w-7 h-7" style={{ color: '#39FF14' }} />
            </div>
            <p className="text-white text-base font-black">Got it. HOTMESS saw this.</p>
            {type === 'unsafe' && (
              <p className="text-white/50 text-xs mt-2">Taking you to the safety flow now …</p>
            )}
          </div>
        ) : !type ? (
          <div className="px-5 pt-2 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className="text-left p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 active:scale-[0.98] transition-all"
                  >
                    <Icon className="w-4 h-4 mb-2" style={{ color: t.color }} />
                    <p className="text-white text-sm font-black">{t.label}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{t.sub}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-white/30 text-[10px] text-center mt-4 leading-relaxed">
              We read every message. No tickets. No bots.
            </p>
          </div>
        ) : (
          <div className="px-5 pt-2 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setType(null)} className="text-white/40 text-[11px] font-bold underline">change</button>
              <span className="text-[10px] uppercase tracking-widest font-black"
                    style={{ color: TYPES.find(t => t.key === type)?.color || GOLD }}>
                {TYPES.find(t => t.key === type)?.label}
              </span>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={type === 'love' ? 'What should stay forever?' :
                          type === 'idea' ? 'What should HOTMESS do?' :
                          type === 'vibe' ? 'How does this feel?' :
                          type === 'unsafe' ? 'What happened? (we route this straight to safety)' :
                          type === 'confusing' ? 'What didn’t make sense?' :
                          'What broke?'}
              rows={4}
              maxLength={1000}
              className="w-full bg-white/5 rounded-xl px-3.5 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/60 resize-none"
            />

            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 cursor-pointer text-white/60 text-xs font-bold">
                <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
                <span className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-lg active:scale-95 transition-transform">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {screenshot ? 'Image attached' : 'Attach screenshot'}
                </span>
              </label>
              {screenshot && (
                <button onClick={() => setScreenshot(null)} className="text-white/40 text-[11px] underline">remove</button>
              )}
            </div>

            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full mt-4 h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: type === 'unsafe' ? URGENT : GOLD, color: type === 'unsafe' ? '#fff' : '#000' }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (type === 'unsafe' ? 'Send + open safety' : 'Send')}
            </button>

            {type === 'unsafe' && (
              <p className="text-white/40 text-[10px] mt-2 text-center leading-relaxed">
                Serious issues get escalated to our safety team and you’ll be taken to the full report flow.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}

export default PulseFeedbackSheet;
