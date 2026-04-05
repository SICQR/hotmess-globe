/**
 * SellerProfileView — Seller tab inside L2ProfileSheet.
 *
 * Shows the seller's active market_listings from Supabase
 * with a HOTMESS OS dark design. Replaces the old base44 query.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { ShoppingBag, Package, Star, ChevronRight, Tag } from 'lucide-react';

const AMBER  = '#C8962C';
const CARD   = '#1C1C1E';
const MUTED  = '#8E8E93';

export default function SellerProfileView({ user }) {
  const { openSheet } = useSheet();

  // ── Active listings from market_listings table ────────────────────────────
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['seller-listings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('market_listings')
        .select('id, title, price, condition, category, photos, status, created_at')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Sold count for social proof ────────────────────────────────────────────
  const { data: soldCount = 0 } = useQuery({
    queryKey: ['seller-sold-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('market_listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .eq('status', 'sold');
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // ── Condition badge colour ─────────────────────────────────────────────────
  const conditionColor = (c) => {
    switch ((c || '').toLowerCase()) {
      case 'new':        return '#30D158';
      case 'excellent':  return AMBER;
      case 'good':       return '#C8962C';
      default:           return MUTED;
    }
  };

  const firstPhoto = (listing) => {
    const p = listing.photos;
    if (Array.isArray(p) && p.length > 0) {
      const item = p[0];
      return typeof item === 'string' ? item : item?.url || null;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="px-4 py-8 flex justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#C8962C] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Stats row */}
      <div className="flex gap-3 px-4 pt-2">
        {[
          { icon: Package, label: 'Listed',    value: listings.length },
          { icon: ShoppingBag, label: 'Sold',  value: soldCount },
          { icon: Star, label: 'Rating',       value: user?.seller_rating ? user.seller_rating.toFixed(1) : '–' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex-1 rounded-2xl p-3 text-center" style={{ background: CARD }}>
            <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: AMBER }} />
            <p className="font-black text-base text-white leading-none">{value}</p>
            <p className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: MUTED }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Seller bio */}
      {user?.seller_bio && (
        <div className="mx-4 rounded-2xl p-4" style={{ background: CARD }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: AMBER }}>
            ABOUT THIS SHOP
          </p>
          <p className="text-white/80 text-sm leading-relaxed">{user.seller_bio}</p>
        </div>
      )}

      {/* Listings grid */}
      {listings.length === 0 ? (
        <div className="mx-4 rounded-2xl p-8 text-center" style={{ background: CARD }}>
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-20 text-white" />
          <p className="text-white/60 font-bold text-sm">No active listings</p>
          <p className="text-white/30 text-xs mt-1">Items will appear here when listed</p>
        </div>
      ) : (
        <>
          <div className="px-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: AMBER }}>
              LISTINGS ({listings.length})
            </p>
            <button
              onClick={() => openSheet('marketplace', {})}
              className="flex items-center gap-0.5 text-[11px] font-semibold"
              style={{ color: MUTED }}
            >
              Browse all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="px-4 grid grid-cols-2 gap-3">
            {listings.map((listing) => {
              const photo = firstPhoto(listing);
              return (
                <button
                  key={listing.id}
                  onClick={() => openSheet('product', { id: listing.id })}
                  className="rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform"
                  style={{ background: CARD }}
                >
                  {/* Photo */}
                  <div className="aspect-square bg-white/5 relative">
                    {photo ? (
                      <img src={photo} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tag className="w-8 h-8 opacity-20 text-white" />
                      </div>
                    )}
                    {/* Condition badge */}
                    {listing.condition && (
                      <span
                        className="absolute top-2 left-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md"
                        style={{ background: `${conditionColor(listing.condition)}22`, color: conditionColor(listing.condition), border: `1px solid ${conditionColor(listing.condition)}40` }}
                      >
                        {listing.condition}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-white text-[12px] font-bold line-clamp-1">{listing.title}</p>
                    {listing.category && (
                      <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{listing.category}</p>
                    )}
                    <p className="font-black text-[14px] mt-1" style={{ color: AMBER }}>
                      £{(listing.price || 0).toFixed(2)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
