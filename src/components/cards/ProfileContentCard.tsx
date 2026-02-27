/**
 * ProfileContentCard — Reusable content card for profile sheets and home feed.
 *
 * Three variants matching the design mockups:
 *   1. Hookup — intent, boundaries, meeting area, dual ETAs, Route/Uber/Share
 *   2. For Sale — preloved listing with image, View/Buy
 *   3. Creator — radio host, Listen/Follow
 *
 * Each card: dark bg (#1C1C1E), colored badge, optional image right, action buttons.
 */

import { MapPin, Navigation, Share2, Eye, ShoppingCart, Play, Heart } from 'lucide-react';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'gold';
}

interface BaseCardProps {
  className?: string;
}

export interface HookupCardProps extends BaseCardProps {
  variant: 'hookup';
  intent?: string;           // "Hookup", "Hang", "Explore"
  boundaries?: string;       // "Fun & Safe"
  meetingArea?: string;      // "Schoneberg Area"
  yourEta?: number;          // minutes
  theirEta?: number;         // minutes
  theirName?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
}

export interface ForSaleCardProps extends BaseCardProps {
  variant: 'for-sale';
  title: string;
  subtitle?: string;         // "Same Day Delivery"
  price?: string;
  imageUrl?: string;
  onView: () => void;
  onBuy: () => void;
}

export interface CreatorCardProps extends BaseCardProps {
  variant: 'creator';
  title: string;             // "HotMess Radio DJ"
  subtitle?: string;         // "Live Friday 10PM"
  imageUrl?: string;
  onListen: () => void;
  onFollow: () => void;
}

export type ProfileContentCardProps = HookupCardProps | ForSaleCardProps | CreatorCardProps;

// ── Badge colors ──────────────────────────────────────────────────────────────

const BADGE_CONFIG = {
  hookup: { label: 'Hookup', color: '#DC2626' },
  'for-sale': { label: 'For Sale', color: '#C8962C' },
  creator: { label: 'Creator', color: '#DC2626' },
} as const;

// ── Shared action button ──────────────────────────────────────────────────────

function ActionBtn({ label, icon, onClick, variant = 'default' }: ActionButton) {
  const isGold = variant === 'gold';
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold transition-all active:scale-95"
      style={{
        background: isGold ? '#C8962C' : 'rgba(255,255,255,0.06)',
        color: isGold ? '#000' : '#fff',
        border: isGold ? 'none' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Hookup card ───────────────────────────────────────────────────────────────

function HookupCard({
  intent = 'Hookup',
  boundaries,
  meetingArea,
  yourEta,
  theirEta,
  theirName,
  lat,
  lng,
  imageUrl,
  className = '',
}: Omit<HookupCardProps, 'variant'>) {
  const handleRoute = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const handleUber = () => {
    const url = buildUberDeepLink({
      dropoffLat: lat,
      dropoffLng: lng,
      dropoffNickname: meetingArea || 'Meeting point',
    });
    if (url) window.open(url, '_blank');
  };

  const handleShare = async () => {
    const text = meetingArea
      ? `Meet at ${meetingArea}`
      : 'Shared a meeting point';
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden relative ${className}`}
      style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Image on right */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute right-0 top-0 bottom-0 w-1/3 object-cover opacity-40"
          style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 40%)' }}
        />
      )}

      <div className="relative p-4 space-y-3">
        {/* Badge + menu */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ background: '#DC262620', color: '#DC2626', border: '1px solid #DC262640' }}
          >
            {intent}
          </span>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5">
            <span className="text-white/40 text-lg leading-none">...</span>
          </button>
        </div>

        {/* Details */}
        <div className="space-y-1">
          <p className="text-white font-bold text-sm">Available now</p>
          {boundaries && (
            <p className="text-white/50 text-xs">Boundaries: {boundaries}</p>
          )}
        </div>

        {/* Meeting area + ETAs */}
        {meetingArea && (
          <div className="space-y-1 pt-1 border-t border-white/[0.06]">
            <p className="text-white/80 text-sm">
              Meet in: <span className="text-white font-semibold">{meetingArea}</span>
            </p>
            <p className="text-white/40 text-xs">
              {yourEta != null && <>You: {yourEta} min</>}
              {yourEta != null && theirEta != null && <> &middot; </>}
              {theirEta != null && <>{theirName || 'Him'}: {theirEta} min</>}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <ActionBtn
            label="Route"
            icon={<Navigation className="w-3.5 h-3.5" />}
            onClick={handleRoute}
            variant="gold"
          />
          <ActionBtn
            label="Uber"
            icon={<MapPin className="w-3.5 h-3.5" />}
            onClick={handleUber}
          />
          <ActionBtn
            label="Share"
            icon={<Share2 className="w-3.5 h-3.5" />}
            onClick={handleShare}
          />
        </div>
      </div>
    </div>
  );
}

// ── For Sale card ─────────────────────────────────────────────────────────────

function ForSaleCard({
  title,
  subtitle,
  price,
  imageUrl,
  onView,
  onBuy,
  className = '',
}: Omit<ForSaleCardProps, 'variant'>) {
  return (
    <div
      className={`rounded-2xl overflow-hidden relative ${className}`}
      style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Image on right */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute right-0 top-0 bottom-0 w-2/5 object-cover"
          style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 30%)' }}
        />
      )}

      <div className="relative p-4 space-y-3">
        {/* Badge + menu */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ background: '#C8962C20', color: '#C8962C', border: '1px solid #C8962C40' }}
          >
            For Sale
          </span>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5">
            <span className="text-white/40 text-lg leading-none">...</span>
          </button>
        </div>

        {/* Details */}
        <div>
          <p className="text-white font-bold text-sm">{title}</p>
          {subtitle && <p className="text-white/50 text-xs">{subtitle}</p>}
          {price && <p className="text-[#C8962C] font-bold text-sm mt-1">{price}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <ActionBtn
            label="View"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={onView}
          />
          <ActionBtn
            label="Buy"
            icon={<ShoppingCart className="w-3.5 h-3.5" />}
            onClick={onBuy}
            variant="gold"
          />
        </div>
      </div>
    </div>
  );
}

// ── Creator card ──────────────────────────────────────────────────────────────

function CreatorCard({
  title,
  subtitle,
  imageUrl,
  onListen,
  onFollow,
  className = '',
}: Omit<CreatorCardProps, 'variant'>) {
  return (
    <div
      className={`rounded-2xl overflow-hidden relative ${className}`}
      style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Image on right */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute right-0 top-0 bottom-0 w-2/5 object-cover"
          style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 30%)' }}
        />
      )}

      <div className="relative p-4 space-y-3">
        {/* Badge + menu */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded"
            style={{ background: '#DC262620', color: '#DC2626', border: '1px solid #DC262640' }}
          >
            Creator
          </span>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5">
            <span className="text-white/40 text-lg leading-none">...</span>
          </button>
        </div>

        {/* Details */}
        <div>
          <p className="text-white font-bold text-sm">{title}</p>
          {subtitle && <p className="text-white/50 text-xs">{subtitle}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <ActionBtn
            label="Listen"
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={onListen}
          />
          <ActionBtn
            label="Follow"
            icon={<Heart className="w-3.5 h-3.5" />}
            onClick={onFollow}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProfileContentCard(props: ProfileContentCardProps) {
  const { variant, ...rest } = props;

  switch (variant) {
    case 'hookup':
      return <HookupCard {...(rest as Omit<HookupCardProps, 'variant'>)} />;
    case 'for-sale':
      return <ForSaleCard {...(rest as Omit<ForSaleCardProps, 'variant'>)} />;
    case 'creator':
      return <CreatorCard {...(rest as Omit<CreatorCardProps, 'variant'>)} />;
    default:
      return null;
  }
}

export { HookupCard, ForSaleCard, CreatorCard, BADGE_CONFIG };
