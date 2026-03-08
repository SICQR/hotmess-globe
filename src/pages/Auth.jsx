/**
 * Auth — HOTMESS Universe Landing Page + Auth entry point
 *
 * Scrollable culture platform entrance. Auth form opens as bottom-sheet overlay.
 * Sections: Hero → Universe Grid → Live Radio → From The Floor → Enter Strip
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';

const REDIRECT_DELAY_MS = 500;
const GOLD   = '#C8962C';
const BG     = '#050507';
const CARD   = '#111113';
const MUTED  = '#8E8E93';
const RADIO  = '#00C2E0';
const HUNG   = '#C41230';
const HNH    = '#8B5CF6';

const spring = { type: 'spring', stiffness: 200, damping: 25 };

// ── Universe channels ──────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'radio',   emoji: '📻', label: 'Listen',  sub: 'HOTMESS RADIO',   color: RADIO, path: '/radio' },
  { id: 'ghosted', emoji: '👻', label: 'Meet',    sub: 'GHOSTED',         color: GOLD,  path: '/ghosted' },
  { id: 'care',    emoji: '🤝', label: 'Care',    sub: 'HAND N HAND',     color: HNH,   path: '/' },
  { id: 'mess',    emoji: '🛍️', label: 'Trade',   sub: 'MESS MARKET',     color: GOLD,  path: '/market' },
  { id: 'hung',    emoji: '🔥', label: 'Play',    sub: 'HUNG',            color: HUNG,  path: '/market' },
  { id: 'pulse',   emoji: '📍', label: 'Signal',  sub: 'BEACONS',         color: GOLD,  path: '/pulse' },
];

// ── Radio shows ────────────────────────────────────────────────────────────────
const SHOWS = [
  { name: 'Wake The Mess',    time: 'MON–FRI 07:00',    dj: 'Various',       color: RADIO },
  { name: 'Dial-A-Daddy',     time: 'FRI 22:00',        dj: 'DJ Daddy',      color: GOLD  },
  { name: 'Hand N Hand',      time: 'SUN 16:00',        dj: 'Collective',    color: HNH   },
];

// ── Energy feed ────────────────────────────────────────────────────────────────
const FLOOR_CARDS = [
  { tag: 'GHOSTED GRID',   text: 'someone left a woof at 3am last night. no message. just a woof.',             color: GOLD  },
  { tag: 'DIAL-A-DADDY',   text: 'Last night\'s set had the chat going absolutely feral. Full archive up.',      color: RADIO },
  { tag: 'RAW CONVICT',    text: 'New drop lands midnight Friday. Pre-save now or you\'re too slow.',             color: GOLD  },
  { tag: 'HAND N HAND',    text: 'Sunday circle at SE1. Harm reduction + community care. Everyone welcome.',      color: HNH   },
  { tag: 'HUNG SS25',      text: 'Statement pieces for people who make a statement. Three colourways, one week.', color: HUNG  },
  { tag: 'BEACON ALERT',   text: '47 people checked into Vauxhall in the last hour. Something\'s happening.',     color: GOLD  },
];

export default function Auth() {
  const [showForm, setShowForm]         = useState(false);
  const [isSignUp, setIsSignUp]         = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]           = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const openSignUp  = () => { setIsSignUp(true);  setShowForm(true); };
  const openSignIn  = () => { setIsSignUp(false); setShowForm(true); };
  const closeForm   = () => {
    setShowForm(false);
    setEmail(''); setPassword(''); setConfirmPassword('');
  };
  const switchMode  = (toSignUp) => {
    setIsSignUp(toSignUp);
    setEmail(''); setPassword(''); setConfirmPassword('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { toast.error(error.message || 'Sign in failed'); setLoading(false); return; }
      toast.success('Signed in!');
      setTimeout(() => navigate(searchParams.get('redirect') || '/'), REDIRECT_DELAY_MS);
    } catch (err) {
      toast.error(err.message || 'Sign in failed');
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) { toast.error('Please fill in all fields'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) { toast.error(error.message || 'Sign up failed'); setLoading(false); return; }
      toast.success('Check your email to confirm your account');
      setEmail(''); setPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => toast.info('Email reset not yet enabled');

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: BG }}>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-between px-5 pt-16 pb-10 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 600, height: 600, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(200,150,44,0.07) 0%, transparent 70%)`,
            filter: 'blur(80px)',
          }} />
        </div>

        {/* Nav stub */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/20">hotmessldn.com</p>
          <button
            onClick={openSignIn}
            className="text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-full border"
            style={{ borderColor: `${GOLD}40`, color: GOLD }}
          >
            Sign in
          </button>
        </div>

        {/* Wordmark */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <h1 className="text-[72px] font-black italic leading-none tracking-tight text-white">
              HOT<span style={{ color: GOLD }}>MESS</span>
            </h1>
            <p className="text-xl font-black text-white/60 mt-3 leading-snug">
              Queer culture.<br />No apologies.
            </p>
            <p className="text-sm text-white/30 mt-4 max-w-[260px] leading-relaxed">
              Nightlife OS for London's gay & bi scene. Real-time. Proximity-first. Safety-built.
            </p>
          </motion.div>
        </div>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="relative z-10 flex flex-col gap-3"
        >
          <button
            onClick={openSignUp}
            className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide flex items-center justify-center gap-2"
            style={{ background: GOLD, boxShadow: `0 0 40px rgba(200,150,44,0.3)` }}
          >
            Make a mess <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={openSignIn}
            className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider border"
            style={{ borderColor: `${GOLD}30`, color: 'rgba(255,255,255,0.5)' }}
          >
            I'm already filthy
          </button>
          <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1">
            18+ · Gay & Bi Men · London
          </p>
        </motion.div>
      </section>

      {/* ── UNIVERSE GRID ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
          THE HOTMESS WORLD
        </p>
        <h2 className="text-2xl font-black text-white mb-6">One OS. Every scene.</h2>

        <div className="grid grid-cols-2 gap-3">
          {CHANNELS.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 * i }}
              onClick={openSignUp}
              className="rounded-2xl p-4 cursor-pointer active:scale-[0.97] transition-transform"
              style={{ background: CARD, border: `1px solid ${ch.color}18` }}
            >
              <span className="text-2xl">{ch.emoji}</span>
              <p className="font-black text-white mt-2 text-sm">{ch.label}</p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: ch.color }}>
                {ch.sub}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── LIVE RADIO ────────────────────────────────────────────────────────── */}
      <section className="px-5 py-8">
        <div className="rounded-3xl overflow-hidden" style={{ background: CARD, border: `1px solid ${RADIO}20` }}>
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: RADIO }}>
                🎙 LIVE NOW
              </p>
              <h3 className="text-lg font-black text-white">HOTMESS RADIO</h3>
              <p className="text-xs text-white/40 mt-0.5">Where the culture actually lives</p>
            </div>
            <button
              onClick={openSignUp}
              className="px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-wider"
              style={{ background: `${RADIO}20`, color: RADIO, border: `1px solid ${RADIO}40` }}
            >
              Tune in
            </button>
          </div>

          {/* Waveform animation */}
          <div className="px-5 py-3 flex items-end gap-[3px]">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full animate-pulse"
                style={{
                  background: RADIO,
                  height: `${8 + Math.sin(i * 0.8) * 6 + Math.random() * 8}px`,
                  opacity: 0.4 + (i % 3) * 0.2,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>

          {/* Shows */}
          <div className="border-t mx-5 mb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          {SHOWS.map((show, i) => (
            <div
              key={show.name}
              className="mx-5 py-3 flex items-center justify-between"
              style={{ borderBottom: i < SHOWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
            >
              <div>
                <p className="text-white font-bold text-sm">{show.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{show.dj}</p>
              </div>
              <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: show.color }}>
                {show.time}
              </p>
            </div>
          ))}

          {/* HNH Feature */}
          <div className="mx-5 mb-5 mt-2 rounded-2xl p-4" style={{ background: `${HNH}15`, border: `1px solid ${HNH}30` }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: HNH }}>
              🤝 HAND N HAND
            </p>
            <p className="text-white font-bold text-sm leading-snug">
              Community care meets queer nightlife. Every Sunday, no judgment.
            </p>
            <button
              onClick={openSignUp}
              className="mt-3 text-[11px] font-black uppercase tracking-wider"
              style={{ color: HNH }}
            >
              Find out more →
            </button>
          </div>
        </div>
      </section>

      {/* ── FROM THE FLOOR ────────────────────────────────────────────────────── */}
      <section className="py-8">
        <div className="px-5 mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
            REAL. RAW. RIGHT NOW.
          </p>
          <h2 className="text-2xl font-black text-white">From the floor.</h2>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          {FLOOR_CARDS.map((card, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[220px] rounded-2xl p-4 cursor-pointer active:scale-[0.97] transition-transform"
              style={{ background: CARD, border: `1px solid ${card.color}15` }}
              onClick={openSignUp}
            >
              <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: card.color }}>
                {card.tag}
              </p>
              <p className="text-white/80 text-sm leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM ENTER STRIP ────────────────────────────────────────────────── */}
      <section className="px-5 pt-4 pb-16">
        <div
          className="rounded-3xl p-6 text-center"
          style={{ background: `linear-gradient(135deg, ${CARD} 0%, rgba(200,150,44,0.08) 100%)`, border: `1px solid ${GOLD}25` }}
        >
          <p className="text-2xl font-black italic text-white">
            HOT<span style={{ color: GOLD }}>MESS</span>
          </p>
          <p className="text-sm text-white/40 mt-1 mb-5">Enter the culture.</p>
          <button
            onClick={openSignUp}
            className="w-full h-13 py-4 rounded-2xl font-black text-black text-sm uppercase tracking-wider"
            style={{ background: GOLD }}
          >
            Make a mess →
          </button>
          <button onClick={openSignIn} className="mt-3 text-[11px] font-semibold text-white/30">
            Already a member? Sign in
          </button>
        </div>
      </section>

      {/* ── AUTH BOTTOM SHEET ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onMouseDown={closeForm}
            />

            {/* Sheet */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
              style={{ background: '#0D0D0D', borderTop: `1px solid ${GOLD}25` }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Close */}
              <div className="flex items-center justify-between px-5 pt-2 pb-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isSignUp ? 'su' : 'si'}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <h2 className="text-xl font-black text-white">
                      {isSignUp ? 'Join The Mess' : 'Welcome Back'}
                    </h2>
                    <p className="text-xs text-white/30 mt-0.5">
                      {isSignUp ? 'Create your account below' : 'Sign in to continue'}
                    </p>
                  </motion.div>
                </AnimatePresence>
                <button
                  onClick={closeForm}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="px-5 pb-4 pt-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                  />
                </div>

                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">
                        Confirm Password
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className="w-full bg-[#1C1C1E] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:border-[#C8962C] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 h-12 px-4"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isSignUp && (
                  <div className="flex justify-end -mt-1">
                    <button type="button" onClick={handleForgotPassword}
                      className="text-[11px] text-white/30 hover:text-[#C8962C] transition-colors font-medium">
                      Forgot password?
                    </button>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl font-black text-black text-base uppercase tracking-wide mt-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  style={{ background: GOLD, boxShadow: `0 0 30px rgba(200,150,44,0.25)` }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>{isSignUp ? 'Enter the mess' : 'Sign In'}<ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </form>

              {/* Toggle */}
              <div className="text-center pb-8 px-5">
                <p className="text-sm text-white/30">
                  {isSignUp ? (
                    <>Already a member?{' '}
                      <button onClick={() => switchMode(false)} className="font-black" style={{ color: GOLD }}>
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>New here?{' '}
                      <button onClick={() => switchMode(true)} className="font-black" style={{ color: GOLD }}>
                        Make a mess
                      </button>
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
