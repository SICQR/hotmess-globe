/**
 * MorePage — Hub for Safety, Care, Profile, Vault, Settings, Help
 * Replaces Profile tab as the 5th nav item.
 *
 * Safety nudge: shown when user has 0 trusted_contacts and hasn't dismissed.
 * Safety row: shows '!' badge if setup is incomplete.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Heart, User, Users, Lock, Settings, HelpCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';
const MUTED = '#8E8E93';
const DANGER = '#FF3B30';

const NUDGE_KEY = 'hm_safety_nudge_dismissed';

interface MoreItem {
  id: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  sub: string;
  path?: string;
  sheet?: string;
  accent: string;
}

const MORE_ITEMS: MoreItem[] = [
  { id: 'safety', icon: Shield, label: 'Safety', sub: 'SOS, check-ins, trusted contacts', path: '/safety', accent: '#ef4444' },
  { id: 'care', icon: Heart, label: 'Care', sub: 'Aftercare + wellbeing', path: '/care', accent: GOLD },
  { id: 'profile', icon: User, label: 'My Profile', sub: 'Edit your profile', path: '/profile', accent: '#ffffff' },
  { id: 'personas', icon: Users, label: 'Personas', sub: 'Switch or create identities', path: '/profile?action=manage-personas', accent: GOLD },
  { id: 'vault', icon: Lock, label: 'Vault', sub: 'Tickets, orders, archive', path: '/more/vault', accent: GOLD },
  { id: 'settings', icon: Settings, label: 'Settings', sub: 'Account + privacy', sheet: 'settings', accent: MUTED },
  { id: 'help', icon: HelpCircle, label: 'Help', sub: 'FAQs + support', sheet: 'help', accent: MUTED },
];

export default function MorePage() {
  const navigate = useNavigate();
  const { openSheet } = useSheet();
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSafetyNudge, setShowSafetyNudge] = useState(false);
  const [hasSafetySetup, setHasSafetySetup] = useState(true); // default true until confirmed otherwise
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });

  // Resolve current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  // Check trusted_contacts count once we have the user
  useEffect(() => {
    if (!userId) return;
    const dismissed = localStorage.getItem(NUDGE_KEY);

    supabase
      .from('trusted_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => {
        const hasContacts = (count ?? 0) > 0;
        setHasSafetySetup(hasContacts);
        if (!hasContacts && !dismissed) {
          setShowSafetyNudge(true);
        }
      });
  }, [userId]);

  const dismissSafetyNudge = () => {
    localStorage.setItem(NUDGE_KEY, '1');
    setShowSafetyNudge(false);
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#050507' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b border-white/5 px-4"
        style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center justify-center h-14">
          <h1 className="font-black text-sm tracking-[0.25em] uppercase" style={{ color: GOLD }}>
            More
          </h1>
        </div>
      </div>

      {/* Items */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-momentum pb-24" {...pullHandlers}>
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <div className="px-4 py-4 space-y-2">

          {/* Safety setup nudge card */}
          <AnimatePresence>
            {showSafetyNudge && (
              <motion.div
                key="safety-nudge"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: `rgba(255, 59, 48, 0.08)`,
                  border: `0.5px solid rgba(255, 59, 48, 0.25)`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  overflow: 'hidden',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: '#fff' }}>
                    Complete your safety profile
                  </p>
                  <p style={{ fontSize: 12, opacity: 0.55, margin: '4px 0 0', color: '#fff' }}>
                    Add a trusted contact and fake call preset
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => navigate('/safety')}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '7px 14px',
                      borderRadius: 8,
                      background: DANGER,
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Set up
                  </button>
                  <button
                    onClick={dismissSafetyNudge}
                    style={{
                      fontSize: 16,
                      padding: '7px 8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.35)',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav items */}
          {MORE_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isSafety = item.id === 'safety';
            const showBadge = isSafety && !hasSafetySetup;

            return (
              <motion.button
                key={item.id}
                onClick={() => item.sheet ? openSheet(item.sheet, {}) : navigate(item.path!)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl bg-[#1C1C1E] border border-white/[0.06] active:scale-[0.98] active:bg-white/[0.04] transition-all text-left ${
                  isSafety ? 'border-l-2 border-l-red-500/60' : ''
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.accent}12`, border: `1px solid ${item.accent}25` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.label}</span>
                    {showBadge && (
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse"
                        style={{ background: 'rgba(255,59,48,0.2)', color: '#FF6961' }}
                      >
                        !
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-white/35">{item.sub}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
