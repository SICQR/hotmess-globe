/**
 * L2TapsSheet — Who tapped / woofed you
 *
 * Shows received taps + woofs from the last 30 days.
 * Tapping a row opens the sender's profile sheet.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Ghost, Zap } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

const AMBER = '#C8962C';

interface TapRow {
  id: string;
  tapper_email: string;
  tap_type: 'tap' | 'woof';
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
  const [tab, setTab] = useState<'all' | 'tap' | 'woof'>('all');

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

  const filtered = (taps || []).filter(t => tab === 'all' || t.tap_type === tab);

  const handleOpenProfile = (tapperEmail: string) => {
    openSheet('profile', { email: tapperEmail });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-white/8">
        {(['all', 'tap', 'woof'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-[#C8962C] text-black'
                : 'bg-[#1C1C1E] text-white/40 border border-white/10'
            }`}
          >
            {t === 'all' ? 'All' : t === 'tap' ? '👻 Boos' : '🐾 Woofs'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: AMBER }} />
          </div>
        )}

        {!isLoading && (error || filtered.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
            <Ghost className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-sm">
              {error
                ? 'Could not load taps right now.'
                : tab === 'all'
                ? 'No taps yet. Hang around Ghosted!'
                : tab === 'tap'
                ? 'No boos yet.'
                : 'No woofs yet.'}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-white/5">
            {filtered.map((tap) => {
              const profile = tap.profiles;
              const displayName = profile?.display_name || profile?.username || tap.tapper_email.split('@')[0];
              const avatar = profile?.photos?.[0] ?? null;

              return (
                <motion.button
                  key={tap.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleOpenProfile(tap.tapper_email)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors active:bg-white/8 text-left"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-full bg-[#1C1C1E] border-2 overflow-hidden"
                      style={{ borderColor: tap.tap_type === 'woof' ? AMBER : 'rgba(255,255,255,0.15)' }}
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
                    {/* Tap type badge */}
                    <span className="absolute -bottom-0.5 -right-0.5 text-[14px] leading-none select-none">
                      {tap.tap_type === 'woof' ? '🐾' : '👻'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{displayName}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {tap.tap_type === 'woof' ? 'Woofed at you' : 'Boo\'d you'}{' '}
                      · {timeAgo(tap.created_at)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <Zap className="w-4 h-4 shrink-0" style={{ color: AMBER }} />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
