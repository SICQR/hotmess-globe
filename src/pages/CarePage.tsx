/**
 * CarePage — Hand N Hand wellbeing page
 *
 * Phil 2026-05-30 design lock: hero is a fully-designed PNG comp (CARE label,
 * split-colour headline, subhead, and 4-chip action row all baked in). Code
 * adds only:
 *   1. The minimal back-button header
 *   2. An invisible interactive grid positioned over the in-image chip row
 *      so the four actions route correctly
 *   3. A graceful fallback inside AtmosphericImageCard for the pre-asset state
 *
 * Below the hero: existing Aftercare tips + Resources unchanged.
 *
 * Rule (Phil verbatim): "Imagery should make HOTMESS feel INHABITED, not
 * decorated."
 */
import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalPullToRefresh } from '@/hooks/useLocalPullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { AtmosphericImageCard } from '@/components/brand/AtmosphericImageCard';

const GOLD = '#C8962C';

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
  { label: 'Check in',    to: '/safety' },
  { label: 'Your people', to: '/safety' },
  { label: 'Get help',    to: '/safety' },
  { label: 'Aftercare',   to: '#aftercare-tips' },
];

export default function CarePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tipsAnchorRef = useRef<HTMLDivElement>(null);

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
      {/* Minimal nav header — back affordance only; the rest is in the hero. */}
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

        {/* HERO — Phil's full designed comp. The PNG carries the CARE label,
            split-colour headline, subhead, and visible chip row. The invisible
            grid below positions over the in-image chip row and routes the four
            actions. Aspect 3/2 matches the comp's source proportions. */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="px-3 pt-3"
        >
          <AtmosphericImageCard
            imageUrl={HERO_IMAGE}
            copy="After midnight, keep a way back."
            aspect="3/2"
            ariaLabel="Care — After midnight, keep a way back. Check in, your people, get help, aftercare."
          >
            {/* Invisible interactive grid — positioned over the chip row
                area at the bottom ~28% of Phil's comp. Each cell is a
                button with an aria-label for screen readers; visually
                transparent so the rendered comp stays clean. */}
            <div
              className="absolute left-0 right-0 grid grid-cols-4"
              style={{ top: '72%', bottom: 0 }}
            >
              {ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a.to)}
                  aria-label={a.label}
                  className="w-full h-full active:bg-white/10 transition-colors"
                  style={{ background: 'transparent' }}
                />
              ))}
            </div>
          </AtmosphericImageCard>
        </motion.section>

        {/* Aftercare tips */}
        <div ref={tipsAnchorRef} id="aftercare-tips" className="px-4 pt-8 space-y-8">
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
