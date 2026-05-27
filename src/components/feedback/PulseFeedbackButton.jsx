/**
 * Floating "HOW'S IT FEEL?" — Pulse Feedback V1 (Phil locked 2026-05-27).
 *
 * Isolation contract (Phil's lock):
 * - Lazy-loaded sheet → main bundle untouched
 * - Feature-flagged mount → VITE_FEEDBACK_DISABLED=1 hides entirely
 * - Null-safe context reads → no auth crash if supabase context missing
 * - Never block route render → all errors silent no-op
 * - No synchronous map dependency → button is independent of /pulse lifecycle
 * - Failure = silent no-op → component returns null on any throw
 *
 * Visible to authenticated users. Hidden on intimacy-sensitive routes.
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { MessageCircleHeart } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const PulseFeedbackSheet = lazy(() => import('./PulseFeedbackSheet').then(m => ({
  default: m.PulseFeedbackSheet || m.default,
})).catch(() => ({ default: () => null })));

const GOLD = '#C8962C';

// Doctrine 04: feedback NEVER interrupts intimacy.
const HIDDEN_PATHS = [
  '/auth', '/sign-in', '/sign-up',
  '/redeem',
  '/onboarding',
  '/safety/active',
  '/care/active',
];

const isChatRoute = (p) => /^\/(chat|messages)\/[^/]+/.test(p || '');

// Feature flag — read at module load. Set VITE_FEEDBACK_DISABLED=1 to kill.
const DISABLED_BY_FLAG = (() => {
  try {
    return import.meta.env.VITE_FEEDBACK_DISABLED === '1' || import.meta.env.VITE_FEEDBACK_DISABLED === 'true';
  } catch { return false; }
})();

function PulseFeedbackButtonImpl() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    try {
      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) setAuthed(!!data?.session?.access_token);
      }).catch(() => { if (!cancelled) setAuthed(false); });
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
        setAuthed(!!session?.access_token);
      });
      return () => { cancelled = true; try { sub?.subscription?.unsubscribe?.(); } catch {} };
    } catch {
      setAuthed(false);
      return () => { cancelled = true; };
    }
  }, []);

  if (DISABLED_BY_FLAG) return null;
  if (authed !== true) return null;
  if (HIDDEN_PATHS.some(p => location.pathname.startsWith(p))) return null;
  if (isChatRoute(location.pathname)) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        title="How's it feel?"
        aria-label="Send feedback to HOTMESS"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 1.2, stiffness: 300, damping: 25 }}
        whileTap={{ scale: 0.92 }}
        className="fixed right-4 z-[60] flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-full bg-black/80 border border-[#C8962C]/40 backdrop-blur-md text-white shadow-lg overflow-hidden"
        style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
        data-pull-refresh-ignore
      >
        <span className="relative flex-shrink-0 w-2 h-2">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: GOLD, opacity: 0.6 }} />
          <span className="relative block w-2 h-2 rounded-full" style={{ background: GOLD }} />
        </span>
        <MessageCircleHeart className="w-3.5 h-3.5" style={{ color: GOLD }} />
        <span className="text-[10px] font-black tracking-widest uppercase whitespace-nowrap text-white">
          How&apos;s it feel?
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <Suspense fallback={null}>
            <PulseFeedbackSheet onClose={() => setOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}

// Error boundary — Phil's isolation rule: feedback never crashes route.
class FeedbackErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { try { console.warn('[PulseFeedback] silently failed:', err?.message); } catch {} }
  render() { return this.state.failed ? null : this.props.children; }
}

export function PulseFeedbackButton() {
  return (
    <FeedbackErrorBoundary>
      <PulseFeedbackButtonImpl />
    </FeedbackErrorBoundary>
  );
}

export default PulseFeedbackButton;
