/**
 * L2NowHappeningSheet -- "Now Happening" drawer
 *
 * Opened by tapping any ticker item. Shows a summary of live activity:
 * - Live Radio (link to /radio)
 * - Nearby Count (from right_now_status)
 * - Tonight's Events (from events/beacons)
 * - Featured Drop (from products)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Radio, Users, Calendar, ShoppingBag, ChevronRight } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';
const CARD = '#1C1C1E';
const RADIO_TEAL = '#00C2E0';

function SectionCard({ icon: Icon, iconColor, title, subtitle, onTap }) {
  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border border-white/5 active:scale-[0.98] transition-all"
      style={{ background: CARD }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-white text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-white/50 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
    </button>
  );
}

export default function L2NowHappeningSheet() {
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheet();

  const now = new Date().toISOString();

  // Nearby active count
  const { data: nearbyCount } = useQuery({
    queryKey: ['now-happening-nearby'],
    queryFn: async () => {
      const { count } = await supabase
        .from('right_now_status')
        .select('*', { count: 'exact', head: true })
        .gte('expires_at', now);
      return count || 0;
    },
    staleTime: 30_000,
  });

  // Tonight's events
  const { data: events } = useQuery({
    queryKey: ['now-happening-events'],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(6, 0, 0, 0);
      const { data } = await supabase
        .from('events')
        .select('id, title, starts_at')
        .gte('starts_at', todayStart.toISOString())
        .lte('starts_at', tomorrowStart.toISOString())
        .order('starts_at', { ascending: true })
        .limit(5);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Featured product
  const { data: featured } = useQuery({
    queryKey: ['now-happening-featured'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('featured', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 120_000,
  });

  const goTo = (path) => {
    closeSheet();
    setTimeout(() => navigate(path), 100);
  };

  const openSheetNav = (type, props = {}) => {
    closeSheet();
    setTimeout(() => openSheet(type, props), 100);
  };

  return (
    <div className="px-4 pb-6 pt-2 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">
        Right Now
      </p>

      <SectionCard
        icon={Radio}
        iconColor={RADIO_TEAL}
        title="Live Radio"
        subtitle="HOTMESS Radio is streaming now"
        onTap={() => goTo('/radio')}
      />

      <SectionCard
        icon={Users}
        iconColor={GOLD}
        title={nearbyCount != null ? `${nearbyCount} People Nearby` : 'People Nearby'}
        subtitle="See who's out right now"
        onTap={() => goTo('/ghosted')}
      />

      <SectionCard
        icon={Calendar}
        iconColor="#A899D8"
        title={events?.length ? `${events.length} Events Tonight` : 'Tonight\'s Events'}
        subtitle={events?.[0]?.title || 'Check what\'s happening'}
        onTap={() => openSheetNav('events')}
      />

      {featured && (
        <SectionCard
          icon={ShoppingBag}
          iconColor="#CF3A10"
          title="Featured Drop"
          subtitle={featured.name}
          onTap={() => openSheetNav('product', { productId: featured.id })}
        />
      )}
    </div>
  );
}
