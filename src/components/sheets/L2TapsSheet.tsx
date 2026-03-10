/**
 * L2TapsSheet — Who boo'd you
 *
 * Shows received boos from the last 30 days.
 * Tapping a row opens the sender's profile sheet.
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Ghost } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { useTaps } from '@/hooks/useTaps';

const AMBER = '#C8962C';

interface TapRow {
  id: string;
  tapper_email: string;
  tap_type: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
    photos: string[] | null;
  } | null;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function L2TapsSheet() {
  const { openSheet } = useSheet();
  const [myEmail, setMyEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMyEmail(data.user?.email ?? null);
    });
  }, []);

  const { isTapped, sendTap } = useTaps(myEmail);

  const { data: taps, isLoading, error } = useQuery<TapRow[]>({
    queryKey: ['received-taps'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return [];

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('taps')
        .select(`
          id, tapper_email, tap_type, created_at,
          profiles!taps_tapper_email_fkey(display_name, username, photos)
        `)
        .eq('tapped_email', user.email)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Fallback: no join (taps table may not have FK)
        const { data: fallback, error: fbErr } = await supabase
          .from('taps')
          .select('id, tapper_email, tap_type, created_at')
          .eq('tapped_email', user.email)
          .gt('created_at', since)
          .order('created_at', { ascending: false })
          .limit(100);

        if (fbErr) throw fbErr;
        return (fallback || []) as TapRow[];
      }

      return (data || []) as TapRow[];
    },
    staleTime: 30_000,
  });

  const handleOpenProfile = (tapperEmail: string) => {
    openSheet('profile', { email: tapperEmail });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
        <Ghost className="w-5 h-5" style={{ color: AMBER }} />
        <span className="text-sm font-black uppercase tracking-widest text-white">Boos</span>
        {taps && taps.length > 0 && (
          <span className="ml-auto text-xs text-white/30">{taps.length} received</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: AMBER }} />
          </div>
        )}

        {!isLoading && (error || !taps || taps.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
            <Ghost className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-sm">
              {error ? 'Could not load boos right now.' : 'No boos yet. Hang around Ghosted!'}
            </p>
          </div>
        )}

        {!isLoading && taps && taps.length > 0 && (
          <div className="divide-y divide-white/5">
            {taps.map((tap) => {
              const profile = tap.profiles;
              const displayName = profile?.username || profile?.display_name || tap.tapper_email.split('@')[0];
              const avatar = profile?.photos?.[0] ?? null;

              const alreadyBoodBack = myEmail ? isTapped(tap.tapper_email, 'boo') : false;

              return (
                <motion.div
                  key={tap.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
                >
                  {/* Row tap → open profile */}
                  <button
                    onClick={() => handleOpenProfile(tap.tapper_email)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="w-11 h-11 rounded-full bg-[#1C1C1E] border-2 overflow-hidden"
                        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                      >
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Ghost className="w-5 h-5 text-white/20" />
                          </div>
                        )}
                      </div>
                      {/* Ghost badge */}
                      <span className="absolute -bottom-0.5 -right-0.5 text-[14px] leading-none select-none">
                        👻
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{displayName}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        Boo'd you · {timeAgo(tap.created_at)}
                      </p>
                    </div>
                  </button>

                  {/* Boo Back quick action */}
                  {myEmail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendTap(tap.tapper_email, displayName, 'boo');
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 ${
                        alreadyBoodBack
                          ? 'bg-[#C8962C] text-black border border-[#C8962C]'
                          : 'bg-transparent border border-white/20 text-white/50 hover:border-[#C8962C] hover:text-[#C8962C]'
                      }`}
                    >
                      {alreadyBoodBack ? '👻 Boo\'d' : '👻 Boo'}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
