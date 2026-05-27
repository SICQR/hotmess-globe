/**
 * Pulse Feedback Sheet V1 — Phil locked 2026-05-27.
 *
 * Six types: Broken / Confusing / Unsafe / Idea / Love This / Other.
 * UNSAFE shortcuts to safety routing (SOS / report / block / Care).
 * Optional text + screenshot upload.
 *
 * Auto-attaches client metadata: route, map_tier (window.__hm_pulse_tier),
 * viewport, device_id, session_id, beacon_id from URL.
 *
 * Server adds: subscription_tier, beta_active, ip_hash, emotional_temperature.
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, Wrench, HelpCircle, ShieldAlert, Lightbulb, Heart, MoreHorizontal,
  Image as ImageIcon, Check, Loader2, Flag, UserX, Phone, LifeBuoy,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';
const URGENT = '#FF3D2E';
const GREEN = '#39FF14';

const TYPES = [
  { key: 'broken',    label: 'Broken',     icon: Wrench,         color: URGENT,    hint: 'Something didn’t work' },
  { key: 'confusing', label: 'Confusing',  icon: HelpCircle,     color: '#FFAB00', hint: 'I’m not sure what to do' },
  { key: 'unsafe',    label: 'Unsafe',     icon: ShieldAlert,    color: URGENT,    hint: 'Trust / safety concern' },
  { key: 'idea',      label: 'Idea',       icon: Lightbulb,      color: GREEN,     hint: 'I want HOTMESS to…' },
  { key: 'love',      label: 'Love This',  icon: Heart,          color: '#FF4F9A', hint: 'Something here feels right' },
  { key: 'other',     label: 'Other',      icon: MoreHorizontal, color: '#FFFFFF', hint: 'Doesn’t fit a category' },
];

function captureMetadata() {
  const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
  const deviceId = safe(() => localStorage.getItem('hm_device_id'));
  const sessionId = safe(() => {
    const raw = sessionStorage.getItem('hm_session');
    return raw ? JSON.parse(raw)?.id || null : null;
  });
  const beaconId = safe(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('beacon') || p.get('beaconId') || null;
  });
  return {
    path: window.location.pathname,
    url: window.location.href,
    referrer: document.referrer || null,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    device_id: deviceId,
    session_id: sessionId,
    beacon_id: beaconId,
    user_agent: navigator.userAgent,
    online: navigator.onLine,
    map_tier: safe(() => window.__hm_pulse_tier),
    flags: safe(() => window.__hm_flags),
    ts: new Date().toISOString(),
  };
}

export function PulseFeedbackSheet({ onClose }) {
  const navigate = useNavigate();
  const [type, setType] = useState(null);
  const [text, setText] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleScreenshot = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image too large (max 2MB).'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target?.result || null);
    reader.readAsDataURL(file);
  }, []);

  const submit = useCallback(async (theType, theText, theScreenshot) => {
    setSubmitting(true); setError(null);
    try {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = data?.session;
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          type: theType,
          text: theText?.trim() || null,
          screenshot_data_url: theScreenshot,
          metadata: captureMetadata(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (!res.ok) {
        setError(json.error === 'rate_limited' ? 'You’re sending a lot — try again in a bit.' : 'Could not send. Try again.');
        return null;
      }
      return json;
    } catch (_e) {
      setError('Network error.');
      setSubmitting(false);
      return null;
    }
  }, []);

  const handleNormalSubmit = useCallback(async () => {
    if (!type) return;
    const json = await submit(type, text, screenshot);
    if (json?.ok) { setStatus('success'); setTimeout(onClose, 1600); }
  }, [type, text, screenshot, submit, onClose]);

  const handleUnsafeRouting = useCallback(async (action) => {
    setStatus('safety_routing');
    submit('unsafe', text, screenshot); // fire and forget — log signal even if user closes
    onClose();
    if (action === 'report')      navigate('/help/safety?from=feedback');
    else if (action === 'block')  navigate('/settings/blocked?from=feedback');
    else if (action === 'care')   navigate('/care?from=feedback');
    else if (action === 'sos')    window.dispatchEvent(new CustomEvent('hotmess:sos-trigger', { detail: { from: 'feedback' } }));
  }, [submit, text, screenshot, onClose, navigate]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
        onDragEnd={(_e, { offset, velocity }) => { if (offset.y > 100 || velocity.y > 500) onClose(); }}
        className="fixed inset-x-0 bottom-0 z-[100] bg-[#050507] border-t border-[#C8962C]/40 rounded-t-[28px] pb-[calc(20px+env(safe-area-inset-bottom,0px))]"
        data-pull-refresh-ignore
      >
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-2 mb-1" />

        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: GOLD }}>HOTMESS</p>
            <h2 className="text-lg font-black text-white">How&apos;s it feel?</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {status === 'success' && (
          <div className="px-5 py-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
                 style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}55` }}>
              <Check className="w-7 h-7" style={{ color: GREEN }} />
            </div>
            <p className="text-white text-base font-black">Got it. HOTMESS saw this.</p>
          </div>
        )}

        {type === 'unsafe' && status === 'idle' && (
          <div className="px-5 pt-2 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: URGENT }}>Unsafe</p>
            <h3 className="text-white text-lg font-black leading-tight">What do you need right now?</h3>
            <p className="text-white/55 text-xs mt-1 leading-relaxed">
              Real concerns don&apos;t get queued. Pick the fastest path. We&apos;ll log the signal either way.
            </p>
            <div className="mt-4 space-y-2">
              <button onClick={() => handleUnsafeRouting('sos')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border active:scale-[0.98] transition-transform"
                      style={{ background: `${URGENT}11`, borderColor: `${URGENT}44` }}>
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: URGENT }} />
                <div className="text-left flex-1">
                  <p className="text-white text-sm font-black">Trigger SOS</p>
                  <p className="text-white/40 text-[10px]">Alert your trusted contacts now</p>
                </div>
              </button>
              <button onClick={() => handleUnsafeRouting('report')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 active:scale-[0.98] transition-transform">
                <Flag className="w-4 h-4 flex-shrink-0 text-[#FFAB00]" />
                <div className="text-left flex-1">
                  <p className="text-white text-sm font-black">Report someone</p>
                  <p className="text-white/40 text-[10px]">Harassment / abuse / impersonation</p>
                </div>
              </button>
              <button onClick={() => handleUnsafeRouting('block')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 active:scale-[0.98] transition-transform">
                <UserX className="w-4 h-4 flex-shrink-0 text-white" />
                <div className="text-left flex-1">
                  <p className="text-white text-sm font-black">Block someone</p>
                  <p className="text-white/40 text-[10px]">Manage your blocked list</p>
                </div>
              </button>
              <button onClick={() => handleUnsafeRouting('care')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 active:scale-[0.98] transition-transform">
                <LifeBuoy className="w-4 h-4 flex-shrink-0 text-[#FF4F9A]" />
                <div className="text-left flex-1">
                  <p className="text-white text-sm font-black">Care Hub</p>
                  <p className="text-white/40 text-[10px]">Harm reduction, recovery, emergency lines</p>
                </div>
              </button>
            </div>
            <button onClick={() => setType(null)} className="mt-4 w-full py-2 text-white/40 text-[11px] font-bold underline">
              ← Back to feedback types
            </button>
          </div>
        )}

        {!type && status === 'idle' && (
          <div className="px-5 pt-2 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => setType(t.key)}
                          className="text-left p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 active:scale-[0.98] transition-all">
                    <Icon className="w-4 h-4 mb-2" style={{ color: t.color }} />
                    <p className="text-white text-sm font-black">{t.label}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{t.hint}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-white/30 text-[10px] text-center mt-4 leading-relaxed">
              We read every message. No tickets. No bots.
            </p>
          </div>
        )}

        {type && type !== 'unsafe' && status === 'idle' && (
          <div className="px-5 pt-2 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setType(null)} className="text-white/40 text-[11px] font-bold underline">change</button>
              <span className="text-[10px] uppercase tracking-widest font-black"
                    style={{ color: TYPES.find(t => t.key === type)?.color || GOLD }}>
                {TYPES.find(t => t.key === type)?.label}
              </span>
            </div>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder={
                type === 'love' ? 'What should stay forever?' :
                type === 'idea' ? 'What should HOTMESS do?' :
                type === 'broken' ? 'What didn’t work?' :
                type === 'confusing' ? 'What didn’t make sense?' :
                'Tell us anything.'
              }
              rows={4} maxLength={2000}
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
              {screenshot && <button onClick={() => setScreenshot(null)} className="text-white/40 text-[11px] underline">remove</button>}
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <button
              onClick={handleNormalSubmit}
              disabled={submitting}
              className="w-full mt-4 h-12 rounded-xl text-black font-black text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: GOLD }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

export default PulseFeedbackSheet;
