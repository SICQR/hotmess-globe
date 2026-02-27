/**
 * L2SearchSheet — Global search
 * Searches profiles, events, and market listings.
 */

import { useState, useEffect, useRef } from 'react';
import { Search, X, User, Calendar, ShoppingBag, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const TABS = ['All', 'People', 'Events', 'Market'];

export default function L2SearchSheet({ q: initialQ = '' }) {
  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ profiles: [], events: [], products: [] });
  const inputRef = useRef(null);
  const { openSheet } = useSheet();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ profiles: [], events: [], products: [] });
      return;
    }
    const timer = setTimeout(() => runSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function runSearch(q) {
    setLoading(true);
    try {
      const [profilesRes, eventsRes, productsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url, location, bio')
          .ilike('display_name', `%${q}%`)
          .eq('is_visible', true)
          .limit(10),
        supabase
          .from('beacons')
          .select('id, title, event_title, starts_at, venue_name, image_url')
          .eq('kind', 'event')
          .or(`title.ilike.%${q}%,event_title.ilike.%${q}%,venue_name.ilike.%${q}%`)
          .gte('starts_at', new Date().toISOString())
          .limit(10),
        supabase
          .from('preloved_listings')
          .select('id, title, price, images, category')
          .ilike('title', `%${q}%`)
          .neq('status', 'sold')
          .limit(10),
      ]);
      setResults({
        profiles: profilesRes.data || [],
        events: eventsRes.data || [],
        products: productsRes.data || [],
      });
    } finally {
      setLoading(false);
    }
  }

  const visibleProfiles = tab === 'All' || tab === 'People' ? results.profiles : [];
  const visibleEvents = tab === 'All' || tab === 'Events' ? results.events : [];
  const visibleProducts = tab === 'All' || tab === 'Market' ? results.products : [];
  const total = visibleProfiles.length + visibleEvents.length + visibleProducts.length;

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-4 pt-2 pb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people, events, items..."
            className="w-full bg-[#1C1C1E] rounded-xl pl-9 pr-9 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-[#C8962C]/40"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-white/8 flex-shrink-0 overflow-x-auto px-4 gap-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'py-2.5 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 -mb-px',
              tab === t ? 'text-[#C8962C] border-[#C8962C]' : 'text-white/40 border-transparent'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        )}

        {!loading && query.length >= 2 && total === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Search className="w-12 h-12 text-white/10 mb-3" />
            <p className="text-white/50 font-bold text-sm">No results for "{query}"</p>
            <p className="text-white/30 text-xs mt-1">Try a different search</p>
          </div>
        )}

        {!loading && query.length < 2 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Search className="w-12 h-12 text-white/10 mb-3" />
            <p className="text-white/40 text-sm">Search for people, events, or items</p>
          </div>
        )}

        {visibleProfiles.length > 0 && (
          <div className="pt-3 pb-1">
            {tab === 'All' && (
              <p className="text-xs uppercase tracking-widest text-white/30 font-black px-4 mb-2">People</p>
            )}
            {visibleProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => openSheet('profile', { id: p.id })}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white/20" />
                      </div>}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-bold text-sm truncate">{p.display_name}</p>
                  {(p.location || p.bio) && (
                    <p className="text-white/40 text-xs truncate">{p.location || p.bio}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {visibleEvents.length > 0 && (
          <div className="pt-3 pb-1">
            {tab === 'All' && (
              <p className="text-xs uppercase tracking-widest text-white/30 font-black px-4 mb-2">Events</p>
            )}
            {visibleEvents.map(e => (
              <button
                key={e.id}
                onClick={() => openSheet('event', { id: e.id })}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex-shrink-0 overflow-hidden">
                  {e.image_url
                    ? <img src={e.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[#C8962C]/60" />
                      </div>}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-bold text-sm truncate">{e.title || e.event_title}</p>
                  <p className="text-[#C8962C] text-xs mt-0.5">
                    {e.starts_at ? format(new Date(e.starts_at), 'EEE d MMM') : ''}
                    {e.venue_name ? ` · ${e.venue_name}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {visibleProducts.length > 0 && (
          <div className="pt-3 pb-4">
            {tab === 'All' && (
              <p className="text-xs uppercase tracking-widest text-white/30 font-black px-4 mb-2">Market</p>
            )}
            {visibleProducts.map(p => (
              <button
                key={p.id}
                onClick={() => openSheet('product', { productId: p.id })}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/8 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-white/20" />
                      </div>}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-bold text-sm truncate">{p.title}</p>
                  <p className="text-[#C8962C] text-xs mt-0.5">£{(p.price || 0).toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
