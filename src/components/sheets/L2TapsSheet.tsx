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
  from_user_id: string | null;
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
  const { openSheet, closeSheet } = useSheet();
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMyUserId(session?.user?.id ?? null);
      setMyEmail(session?.user?.email ?? null);
    });
  }, []);

  const { isTapped, sendTap } = useTaps(myUserId, myEmail);

  const { data: taps, isLoading, error } = useQuery<TapRow[]>({
    queryKey: ['received-taps', myUserId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return [];

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Query by UUID column, with fallback to email
      const { data, error } = await supabase
        .from('taps')
        .select('id, from_user_id, tapper_email, tap_type, created_at')
        .eq('to_user_id', userId)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Fallback: query by email (pre-migration rows)
        const userEmail = session?.user?.email;
        if (!userEmail) throw error;
        const { data: fallback, error: fbErr } = await supabase
          .from('taps')
          .select('id, from_user_id, tapper_email, tap_type, created_at')
          .eq('tapped_email', userEmail)
          .gt('created_at', since)
          .order('created_at', { ascending: false })
          .limit(100);

        if (fbErr) throw fbErr;
        return (fallback || []) as TapRow[];
      }

      // Hydrate profiles for each tapper
      const tapperIds = (data || []).map(t => t.from_user_id).filter(Boolean) as string[];
      let profileMap: Record<string, { display_name: string | null; username: string | null; photos: string[] | null }> = {};
      if (tapperIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, photos')
          .in('id', tapperIds);
        for (const p of profiles || []) {
          profileMap[p.id] = { display_name: p.display_name, username: p.username, photos: p.photos };
        }
      }

      return (data || []).map(t => ({
        ...t,
        profiles: t.from_user_id ? profileMap[t.from_user_id] ?? null : null,
      })) as TapRow[];
    },
    staleTime: 30_000,
    enabled: !!myUserId,
  });

  const handleOpenProfile = (userId: string) => {
    openSheet('profile', { uid: userId });
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
              {error ? 'Could not load boos right now.' : 'No Boos yet'}
            </p>
            {!error && (
              <p className="text-white/25 text-xs">Send one in Ghosted</p>
            )}
            {!error && (
              <button
                onClick={() => closeSheet()}
                className="h-10 px-5 rounded-full text-sm font-bold"
                style={{ background: '#C8962C', color: '#000' }}
              >
                Open Ghosted
              </button>
            )}
          </div>
        )}

        {!isLoading && taps && taps.length > 0 && (
          <div className="divide-y divide-white/5">
            {taps.map((tap) => {
              const profile = tap.profiles;
              const displayName = profile?.username || profile?.display_name || 'Someone';
              const avatar = profile?.photos?.[0] ?? null;

              const alreadyBoodBack = tap.from_user_id ? isTapped(tap.from_user_id, 'boo') : false;

              return (
                <motion.div
                  key={tap.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
                >
                  {/* Row tap → open profile */}
                  <button
                    onClick={() => tap.from_user_id && handleOpenProfile(tap.from_user_id)}
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
                  {tap.from_user_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendTap(tap.from_user_id!, displayName, 'boo');
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
