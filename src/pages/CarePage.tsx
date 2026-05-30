/**
 * CarePage — Hand N Hand wellbeing page
 *
 * Phil 2026-05-30 design lock: full-bleed atmospheric hero as the page
 * opener — image-led, not icon-led. Split-colour headline (cream / pink),
 * subhead, integrated 4-action chip row sitting inside the hero. Existing
 * aftercare tips + resources unchanged below.
 *
 * Rule (Phil verbatim): "Imagery should make HOTMESS feel INHABITED, not
 * decorated."
 *
 * Hero asset is pending upload to brand-assets/care/. The inline onError
 * fallback covers the pre-upload state with a dark surface so copy + chips
 * remain readable.
 */
import { useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users, ShieldPlus, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalPullToRefresh } from '@/hooks/useLocalPullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';

const GOLD = '#C8962C';
const PINK = '#FF4F9A';

const HERO_IMAGE =
  'https://rfoftonnlwudilafhfkl.supabase.co/storage/v1/object/public/brand-assets/care/after-midnight-keep-a-way-back.png';

const TIPS = [
  { icon: '💧', title: 'Hydrate', body: 'Drink water. Your body needs it after a big night.' },
  { icon: '🛏️', title: 'Rest', body: 'Sleep is recovery. Give yourself permission to do nothing.' },
  { icon: '💬', title: 'Talk about it', body: 'Debrief with someone you trust. No detail is too small.' },
  { icon: '🚿', title: 'Shower reset', body: 'Physical reset helps mental reset. Take your time.' },
];

const RESOURCES = [
  { name: 'Samaritans', number: '116 123', desc: 'Free, 24/7, confidential' },
  { name: 'Switchboard LGBT+', number: '0300 330 0630', desc: 'LGBT+ helpline' },
  { name: 'National Domestic Abuse', number: '0808 2000 247', desc: '24hr freephone' },
];

const ACTIONS = [
  { icon: CheckCircle2, title: 'CHECK IN',    body: "Let someone know you're out.",              to: '/safety' },
  { icon: Users,        title: 'YOUR PEOPLE', body: 'Share your status with trusted contacts.',  to: '/safety' },
  { icon: ShieldPlus,   title: 'GET HELP',    body: 'Find support, fast.',                       to: '/safety' },
  { icon: Heart,        title: 'AFTERCARE',   body: 'Resources for body, mind and more.',        to: '#aftercare-tips' },
];

export default function CarePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tipsAnchorRef = useRef<HTMLDivElement>(null);
  const [heroFailed, setHeroFailed] = useState(false);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { pullDistance, isRefreshing } = useLocalPullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  const handleAction = (to: string) => {
    if (to.startsWith('#')) {
      tipsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(to);
    }
  };

  return (
    <div className="h-full w-full flex flex-col text-white" style={{ background: '#050507' }}>
      {/* Minimal nav header — back affordance only; CARE label sits in the hero. */}
      <div
        className="sticky top-0 z-30 px-4"
        style={{ background: 'rgba(5,5,7,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center h-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/70 active:text-white transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-momentum pb-24">
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

        {/* HERO — full-bleed atmospheric inhabited block */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '3 / 4', maxHeight: '88vh', background: '#0a0a0a' }}
          aria-label="After midnight, keep a way back."
        >
          {!heroFailed && (
            <img
              src={HERO_IMAGE}
              alt=""
              onError={() => setHeroFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          )}

          {/* Atmospheric overlay — left-shaded so headline reads against any
              photographic content; bottom-shaded so the chip row sits on a
              graded dark band. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: heroFailed
                ? 'linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.95) 100%)'
                : 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 75%), linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          {/* CARE overline */}
          <div className="absolute left-5 sm:left-7 top-5 sm:top-7 text-[11px] tracking-[0.32em] font-bold text-white/90 select-none">
            CARE
          </div>

          {/* Split-colour headline */}
          <h1
            className="absolute left-5 sm:left-7 right-5 font-black uppercase leading-[0.92]"
            style={{
              top: '22%',
              fontSize: 'clamp(40px, 11vw, 76px)',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 18px rgba(0,0,0,0.55)',
            }}
          >
            <span style={{ color: '#FAEFE2' }}>AFTER<br />MIDNIGHT,<br /></span>
            <span style={{ color: PINK }}>KEEP A WAY<br />BACK.</span>
          </h1>

          {/* Subhead */}
          <p
            className="absolute left-5 sm:left-7 right-5 text-white/85 text-sm sm:text-base font-medium leading-snug max-w-xs"
            style={{ top: 'calc(22% + clamp(190px, 48vw, 340px))' }}
          >
            For the nights that get good. Or go sideways.
          </p>

          {/* Action chip row */}
          <div
            className="absolute left-3 right-3 bottom-3 rounded-2xl px-3 py-3 sm:px-4 sm:py-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
            style={{
              background: 'rgba(8,8,10,0.62)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.title}
                  onClick={() => handleAction(a.to)}
                  className="flex items-start gap-2 text-left active:opacity-75 transition-opacity"
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,79,154,0.12)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: PINK }} />
                  </span>
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-[11px] sm:text-[12px] font-black tracking-[0.06em]" style={{ color: PINK }}>
                      {a.title}
                    </span>
                    <span className="text-[11px] sm:text-[12px] text-white/75 leading-snug">
                      {a.body}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Aftercare tips */}
        <div ref={tipsAnchorRef} className="px-4 pt-8 space-y-8">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3 font-semibold">Aftercare tips</h3>
            <div className="grid grid-cols-2 gap-3">
              {TIPS.map((tip, i) => (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/5"
                >
                  <span className="text-2xl mb-2 block">{tip.icon}</span>
                  <p className="text-sm font-bold text-white mb-1">{tip.title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{tip.body}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3 font-semibold">If you need help</h3>
            <div className="space-y-2">
              {RESOURCES.map((r) => (
                <a
                  key={r.name}
                  href={`tel:${r.number.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#1C1C1E] border border-white/5 active:bg-white/5 transition-colors"
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(200,150,44,0.12)' }}
                  >
                    <Heart className="w-4 h-4" style={{ color: GOLD }} />
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white">{r.name}</span>
                    <span className="text-xs text-white/40">{r.desc}</span>
                  </span>
                  <span className="ml-auto text-sm font-semibold" style={{ color: GOLD }}>
                    {r.number}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-white/30 pt-4">
            You're allowed to take up space here.
          </p>
        </div>
      </div>
    </div>
  );
}
