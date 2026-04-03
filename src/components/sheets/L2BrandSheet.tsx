/**
 * L2BrandSheet -- 10 brand landing pages for the HOTMESS OS marketplace
 *
 * Props: { brand: BrandKey }
 *
 * Clothing/product brands (raw, hung, high, hungmess, superhung, superraw, hnhMess)
 * fetch REAL products from Shopify via getProductsByBrand().
 *
 * Non-commerce brands (hotmessRadio, rawConvictRecords, smashDaddys) keep static
 * editorial content — shows, releases, beats.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Flame,
  Sparkles,
  Crown,
  Radio,
  Music,
  Disc3,
  Droplets,
  Play,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { getProductsByBrand, type Product } from '@/lib/data/market';

// ---- Brand types -----------------------------------------------------------
type BrandKey =
  | 'raw'
  | 'hung'
  | 'high'
  | 'hungmess'
  | 'superhung'
  | 'superraw'
  | 'hotmessRadio'
  | 'rawConvictRecords'
  | 'smashDaddys'
  | 'hnhMess';

interface L2BrandSheetProps {
  brand?: BrandKey;
}

// ---- Constants -------------------------------------------------------------
const AMBER = '#C8962C';
const MUTED = '#8E8E93';
const HNH_PLUM = '#8B5CF6';
const RADIO_STREAM_URL =
  'https://listen.radioking.com/radio/736103/stream/802454';

// Brands that have Shopify products to fetch
const SHOPIFY_BRANDS: BrandKey[] = [
  'raw', 'hung', 'high', 'hungmess', 'superhung', 'superraw', 'hnhMess',
];

// ---- Radio show data -------------------------------------------------------
interface RadioShow {
  title: string;
  host: string;
  time: string;
  days: string;
  genre: string;
}

const RADIO_SHOWS: RadioShow[] = [
  { title: 'Wake The Mess', host: 'DJ Chaos', time: '08:00', days: 'Mon\u2013Fri', genre: 'House / Disco' },
  { title: 'Hand N Hand', host: 'RAWCONVICT', time: '12:00', days: 'Daily', genre: 'Deep House' },
  { title: 'Dial A Daddy', host: 'Big Daddy', time: '22:00', days: 'Fri\u2013Sat', genre: 'Techno / Dark' },
  { title: 'Raw Sessions', host: 'The Collective', time: '18:00', days: 'Wed', genre: 'Experimental' },
];

// ---- Raw Convict Records data ----------------------------------------------
interface ReleaseCard {
  id: string;
  artist: string;
  title: string;
  year: string;
}

const RCR_RELEASES: ReleaseCard[] = [
  { id: 'rcr-001', artist: 'RAWCONVICT', title: 'Nocturnal Sessions Vol. 1', year: '2026' },
  { id: 'rcr-002', artist: 'DJ Chaos', title: 'Sunrise Protocol', year: '2025' },
  { id: 'rcr-003', artist: 'The Collective', title: 'Underground Transmissions', year: '2025' },
  { id: 'rcr-004', artist: 'Big Daddy', title: 'Dark Matter EP', year: '2026' },
];

// ---- Smash Daddys data -----------------------------------------------------
interface ProducerProfile {
  name: string;
  credits: number;
}

interface BeatShowcase {
  id: string;
  title: string;
  producer: string;
  bpm: number;
  key: string;
}

const SD_PRODUCERS: ProducerProfile[] = [
  { name: 'RAWCONVICT', credits: 24 },
  { name: 'DJ Chaos', credits: 18 },
  { name: 'Big Daddy', credits: 12 },
];

const SD_BEATS: BeatShowcase[] = [
  { id: 'sd-001', title: 'Messy Bounce', producer: 'RAWCONVICT', bpm: 128, key: 'Am' },
  { id: 'sd-002', title: 'Gold Rush', producer: 'DJ Chaos', bpm: 124, key: 'Dm' },
  { id: 'sd-003', title: 'After Dark', producer: 'Big Daddy', bpm: 135, key: 'Fm' },
  { id: 'sd-004', title: 'Raw Signal', producer: 'RAWCONVICT', bpm: 130, key: 'Cm' },
];

// ---- Brand config ----------------------------------------------------------
interface BrandDisplayConfig {
  wordmark: string;
  tagline: string;
  ctaLabel: string;
  ctaAction?: 'shop' | 'external';
  ctaUrl?: string;
  headerBg: string;
  wordmarkColor: string;
  wordmarkStyle: string;
  taglineColor: string;
  layout: 'grid' | 'editorial' | 'editorial-gallery' | 'limited-drop' | 'radio' | 'label' | 'production' | 'hnh';
  isLimitedDrop?: boolean;
  sectionTitle?: string;
}

const BRAND_DISPLAY: Record<BrandKey, BrandDisplayConfig> = {
  raw: {
    wordmark: 'RAW',
    tagline: 'BOLD BASICS. NO BULLSHIT.',
    ctaLabel: 'SHOP RAW',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black',
    taglineColor: MUTED,
    layout: 'grid',
    sectionTitle: 'The Collection',
  },
  hung: {
    wordmark: 'HUNG',
    tagline: 'STATEMENT PIECES. WEAR THE MESS.',
    ctaLabel: 'SHOP HUNG',
    headerBg: '#000000',
    wordmarkColor: AMBER,
    wordmarkStyle: 'font-black',
    taglineColor: '#FFFFFF',
    layout: 'grid',
    sectionTitle: 'Statement Pieces',
  },
  high: {
    wordmark: 'HIGH',
    tagline: 'ELEVATED ESSENTIALS.',
    ctaLabel: 'SHOP HIGH',
    headerBg: '#0A0A0A',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-light',
    taglineColor: MUTED,
    layout: 'editorial',
    sectionTitle: 'The Edit',
  },
  hungmess: {
    wordmark: 'HUNGMESS',
    tagline: 'EDITORIAL SERIES',
    ctaLabel: 'EXPLORE COLLECTION',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black italic',
    taglineColor: MUTED,
    layout: 'editorial-gallery',
    sectionTitle: 'Shop the Edit',
  },
  superhung: {
    wordmark: 'SUPERHUNG',
    tagline: 'ULTRA-LIMITED STATEMENT DROPS.',
    ctaLabel: 'SHOP SUPERHUNG',
    headerBg: '#000000',
    wordmarkColor: AMBER,
    wordmarkStyle: 'font-black',
    taglineColor: '#FFFFFF',
    layout: 'limited-drop',
    isLimitedDrop: true,
    sectionTitle: 'The Drop',
  },
  superraw: {
    wordmark: 'SUPERRAW',
    tagline: 'ULTRA-LIMITED RAW ESSENTIALS.',
    ctaLabel: 'SHOP SUPERRAW',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black',
    taglineColor: MUTED,
    layout: 'limited-drop',
    isLimitedDrop: true,
    sectionTitle: 'The Drop',
  },
  hotmessRadio: {
    wordmark: 'HOTMESS RADIO',
    tagline: 'LIVE. LOUD. MESSY.',
    ctaLabel: 'LISTEN LIVE',
    ctaAction: 'external',
    ctaUrl: RADIO_STREAM_URL,
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black',
    taglineColor: AMBER,
    layout: 'radio',
  },
  rawConvictRecords: {
    wordmark: 'RAW CONVICT RECORDS',
    tagline: 'THE LABEL. THE SOUND.',
    ctaLabel: 'EXPLORE ON SOUNDCLOUD',
    ctaAction: 'external',
    ctaUrl: 'https://soundcloud.com/rawconvictrecords',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black',
    taglineColor: MUTED,
    layout: 'label',
  },
  smashDaddys: {
    wordmark: 'SMASH DADDYS',
    tagline: 'IN-HOUSE PRODUCTION.',
    ctaLabel: 'LISTEN ON SOUNDCLOUD',
    ctaAction: 'external',
    ctaUrl: 'https://soundcloud.com/smashdaddys',
    headerBg: '#000000',
    wordmarkColor: AMBER,
    wordmarkStyle: 'font-black',
    taglineColor: '#FFFFFF',
    layout: 'production',
  },
  hnhMess: {
    wordmark: 'HNH MESS',
    tagline: 'HAND N HAND IS THE ONLY PLACE TO LAND',
    ctaLabel: 'SHOP HNH MESS',
    headerBg: '#0A0410',
    wordmarkColor: HNH_PLUM,
    wordmarkStyle: 'font-black',
    taglineColor: HNH_PLUM,
    layout: 'hnh',
    sectionTitle: 'The Range',
  },
};

// ---- Animation variants ----------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const wordmarkVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

// =============================================================================
// SKELETON LOADERS
// =============================================================================

function ProductCardSkeleton() {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08] animate-pulse">
      <div className="w-full aspect-square bg-white/[0.06]" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-4/5 rounded-md bg-white/[0.06]" />
        <div className="h-5 w-1/3 rounded-md bg-white/[0.06]" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyProducts({ brandName }: { brandName: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'rgba(200, 150, 44, 0.1)' }}
      >
        <ShoppingBag className="w-7 h-7 text-[#C8962C]/50" />
      </div>
      <p className="text-white font-bold text-base">No products yet</p>
      <p className="text-[#8E8E93] text-sm mt-1">
        {brandName} products are coming soon.
      </p>
    </motion.div>
  );
}

// =============================================================================
// SHOPIFY PRODUCT CARD (2-col grid) — uses real Product data
// =============================================================================

function ShopifyProductCard({
  product,
  index,
  onTap,
  isLimitedDrop,
}: {
  product: Product;
  index: number;
  onTap: () => void;
  isLimitedDrop?: boolean;
}) {
  const isSoldOut = !product.available;
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';
  const imageUrl = product.images[0] || '';
  const hasCompareAt = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <motion.button
      custom={index}
      variants={itemVariants}
      onClick={isSoldOut ? undefined : onTap}
      disabled={isSoldOut}
      className={`w-full text-left bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08] transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C] ${
        isSoldOut ? 'opacity-80 cursor-not-allowed' : 'active:scale-[0.98]'
      }`}
      aria-label={isSoldOut ? `${product.title} - Sold out` : `View ${product.title}`}
    >
      <div className="relative w-full aspect-square bg-white/[0.03] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className={`w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Sold-out stamp */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div
              className="px-4 py-1.5 border-2 border-[#FF3B30] rounded-sm"
              style={{ transform: 'rotate(-12deg)' }}
            >
              <span className="text-[#FF3B30] font-black text-lg uppercase tracking-wider">
                SOLD OUT
              </span>
            </div>
          </div>
        )}

        {/* Source badge */}
        {product.source === 'preloved' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
            <span className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">
              Preloved
            </span>
          </div>
        )}

        {/* Sale badge */}
        {hasCompareAt && !isSoldOut && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#FF3B30]">
            <span className="text-[9px] font-black text-white uppercase tracking-wider">
              SALE
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
          {product.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`font-extrabold text-base leading-none ${
              isSoldOut ? 'text-[#8E8E93] line-through' : 'text-[#C8962C]'
            }`}
          >
            {symbol}{product.price.toFixed(2)}
          </span>
          {hasCompareAt && !isSoldOut && (
            <span className="text-[#8E8E93] text-xs line-through">
              {symbol}{product.compareAtPrice!.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// =============================================================================
// EDITORIAL PRODUCT CARD (1-col, HIGH brand)
// =============================================================================

function EditorialShopifyCard({
  product,
  index,
  onTap,
}: {
  product: Product;
  index: number;
  onTap: () => void;
}) {
  const symbol = product.currency === 'GBP' ? '\u00a3' : '$';
  const imageUrl = product.images[0] || '';

  return (
    <motion.button
      custom={index}
      variants={itemVariants}
      onClick={onTap}
      className="w-full text-left bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.06] active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
      aria-label={`View ${product.title}`}
    >
      <div className="relative w-full aspect-[3/4] bg-white/[0.03] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-lg font-semibold text-white leading-tight">
            {product.title}
          </h3>
          <span className="text-[#C8962C] font-bold text-xl mt-1 block">
            {symbol}{product.price.toFixed(2)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// =============================================================================
// SUPERHUNG BANNER (shown on raw brand page)
// =============================================================================

function SuperhungBanner() {
  return (
    <motion.div
      variants={itemVariants}
      className="mx-4 mt-6 mb-2 rounded-2xl overflow-hidden border border-[#C8962C]/30"
      style={{ backgroundColor: 'rgba(200, 150, 44, 0.08)' }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-[#C8962C]" />
          <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: AMBER }}>
            SUPERHUNG
          </span>
        </div>
        <h3 className="text-white font-bold text-lg mb-1">Limited Drop</h3>
        <p className="text-[#8E8E93] text-sm mb-4">
          Exclusive statement pieces. Once they are gone, they are gone.
        </p>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C8962C]/15 border border-[#C8962C]/20 w-fit">
          <div className="w-2 h-2 rounded-full bg-[#C8962C] animate-pulse" />
          <span className="text-[#C8962C] text-xs font-bold uppercase tracking-wider">
            Dropping soon
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// SUPERRAW BANNER (shown on raw brand page)
// =============================================================================

function SuperrawBanner() {
  return (
    <motion.div
      variants={itemVariants}
      className="mx-4 mt-6 mb-2 rounded-2xl overflow-hidden border border-white/10"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-white/70" />
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white">
            SUPERRAW
          </span>
        </div>
        <h3 className="text-white font-bold text-lg mb-1">Essential Drops</h3>
        <p className="text-[#8E8E93] text-sm">
          Raw basics, limited runs. The foundation of every wardrobe.
        </p>
      </div>
    </motion.div>
  );
}

// =============================================================================
// COUNTDOWN BAR (SUPERHUNG / SUPERRAW limited-drop pages)
// =============================================================================

function CountdownBar() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const getEndOfDay = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const updateCountdown = () => {
      const now = new Date();
      const end = getEndOfDay();
      const diff = Math.max(0, end.getTime() - now.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <motion.div variants={itemVariants} className="mx-4 mt-4 mb-2">
      <div
        className="flex items-center justify-center gap-3 h-12 rounded-xl animate-pulse"
        style={{ backgroundColor: AMBER }}
      >
        <Flame className="w-4 h-4 text-white" />
        <span className="text-white font-black text-sm uppercase tracking-wider">
          DROP ENDS IN
        </span>
        <span className="text-white font-black text-lg tabular-nums tracking-wider">
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// RADIO SHOW CARD
// =============================================================================

function RadioShowCard({ show, index }: { show: RadioShow; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.06] flex"
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: AMBER }} />
      <div className="flex-1 p-4">
        <h3 className="text-white font-bold text-base leading-tight">{show.title}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[#8E8E93] text-sm">{show.host}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#C8962C] text-sm font-semibold">{show.time}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#8E8E93] text-sm">{show.days}</span>
        </div>
        <div className="mt-2">
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
            style={{ color: AMBER, borderColor: 'rgba(200, 150, 44, 0.3)', backgroundColor: 'rgba(200, 150, 44, 0.1)' }}
          >
            {show.genre}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// RAW CONVICT RECORDS — RELEASE CARD
// =============================================================================

function ReleaseCardComponent({ release, index }: { release: ReleaseCard; index: number }) {
  return (
    <motion.div custom={index} variants={itemVariants} className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.06]">
      <div className="w-full aspect-square bg-gradient-to-br from-[#C8962C]/20 via-[#1C1C1E] to-black/80 flex items-center justify-center">
        <Disc3 className="w-16 h-16 text-[#C8962C]/30" />
      </div>
      <div className="p-4">
        <p className="text-[#C8962C] text-xs font-bold uppercase tracking-wider">{release.artist}</p>
        <h3 className="text-white font-bold text-base leading-tight mt-1">{release.title}</h3>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[#8E8E93] text-xs">{release.year}</span>
          <button
            className="flex items-center gap-1.5 text-[#C8962C] text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform min-h-[44px] min-w-[44px] justify-center"
            aria-label={`Stream ${release.title} by ${release.artist}`}
          >
            STREAM <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// SMASH DADDYS — PRODUCER + BEAT CARDS
// =============================================================================

function ProducerCard({ producer, index }: { producer: ProducerProfile; index: number }) {
  return (
    <motion.div custom={index} variants={itemVariants} className="flex items-center gap-4 bg-[#1C1C1E] rounded-2xl p-4 border border-white/[0.06]">
      <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(200, 150, 44, 0.15)' }}>
        <Music className="w-5 h-5 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-base leading-tight truncate">{producer.name}</h3>
        <p className="text-[#8E8E93] text-sm mt-0.5">{producer.credits} tracks produced</p>
      </div>
    </motion.div>
  );
}

function BeatCard({ beat, index }: { beat: BeatShowcase; index: number }) {
  return (
    <motion.div custom={index} variants={itemVariants} className="flex items-center gap-3 bg-[#1C1C1E] rounded-2xl p-4 border border-white/[0.06]">
      <button
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
        style={{ backgroundColor: AMBER }}
        aria-label={`Play ${beat.title}`}
      >
        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
      </button>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-sm leading-tight truncate">{beat.title}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[#8E8E93] text-xs">{beat.producer}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#8E8E93] text-xs">{beat.bpm} BPM</span>
          <span className="text-white/20">|</span>
          <span className="text-[#C8962C] text-xs font-semibold">{beat.key}</span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// BRAND ICON + WORDMARK HELPERS
// =============================================================================

function getBrandIcon(brand: BrandKey) {
  switch (brand) {
    case 'hung':
    case 'superhung':
      return Flame;
    case 'high':
      return Crown;
    case 'hungmess':
    case 'superraw':
      return Sparkles;
    case 'hotmessRadio':
      return Radio;
    case 'rawConvictRecords':
      return Disc3;
    case 'smashDaddys':
      return Music;
    case 'hnhMess':
      return Droplets;
    default:
      return null;
  }
}

function getWordmarkSize(brand: BrandKey): string {
  switch (brand) {
    case 'rawConvictRecords':
      return 'text-[9vw]';
    case 'hotmessRadio':
    case 'smashDaddys':
      return 'text-[11vw]';
    case 'hungmess':
    case 'superhung':
    case 'superraw':
      return 'text-[12vw]';
    case 'hnhMess':
      return 'text-[16vw]';
    default:
      return 'text-[20vw]';
  }
}

function getWordmarkTracking(brand: BrandKey): string {
  return brand === 'high' ? 'tracking-[0.5em]' : 'tracking-[0.15em]';
}

// =============================================================================
// PRODUCT GRID — renders real Shopify products
// =============================================================================

function ProductGrid({
  products,
  loading,
  brandName,
  layout,
  isLimitedDrop,
  onProductTap,
}: {
  products: Product[];
  loading: boolean;
  brandName: string;
  layout: BrandDisplayConfig['layout'];
  isLimitedDrop?: boolean;
  onProductTap: (product: Product) => void;
}) {
  if (loading) return <SkeletonGrid />;
  if (products.length === 0) return <EmptyProducts brandName={brandName} />;

  // Editorial layout (HIGH) — 1-col
  if (layout === 'editorial') {
    return (
      <motion.div variants={containerVariants} className="px-4 space-y-4 pb-8">
        {products.map((product, i) => (
          <EditorialShopifyCard
            key={product.id}
            product={product}
            index={i}
            onTap={() => onProductTap(product)}
          />
        ))}
      </motion.div>
    );
  }

  // Default — 2-col grid
  return (
    <motion.div variants={containerVariants} className="grid grid-cols-2 gap-3 px-4 pb-8">
      {products.map((product, i) => (
        <ShopifyProductCard
          key={product.id}
          product={product}
          index={i}
          onTap={() => onProductTap(product)}
          isLimitedDrop={isLimitedDrop}
        />
      ))}
    </motion.div>
  );
}

// =============================================================================
// MAIN: L2BrandSheet
// =============================================================================

export default function L2BrandSheet({ brand = 'raw' }: L2BrandSheetProps) {
  const { closeSheet, openSheet } = useSheet();
  const config = BRAND_DISPLAY[brand] || BRAND_DISPLAY.raw;
  const productsRef = useRef<HTMLDivElement>(null);

  // ---- Shopify product state ----
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const isShopifyBrand = SHOPIFY_BRANDS.includes(brand);

  useEffect(() => {
    if (!isShopifyBrand) return;

    let cancelled = false;
    setLoading(true);

    getProductsByBrand(brand).then((data) => {
      if (!cancelled) {
        setProducts(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setProducts([]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [brand, isShopifyBrand]);

  const handleShopNow = useCallback(() => {
    if (config.ctaAction === 'external' && config.ctaUrl) {
      window.open(config.ctaUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Scroll to products section
      productsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [config.ctaAction, config.ctaUrl]);

  const handleProductTap = useCallback(
    (product: Product) => {
      openSheet('product', { product, source: product.source });
    },
    [openSheet],
  );

  const wordmarkSize = getWordmarkSize(brand);
  const wordmarkTracking = getWordmarkTracking(brand);
  const BrandIcon = getBrandIcon(brand);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: config.headerBg }}>
      {/* BACK BUTTON */}
      <button
        onClick={closeSheet}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          {/* ---- RADIO HERO ---- */}
          {brand === 'hotmessRadio' && (
            <motion.div variants={wordmarkVariants} className="relative w-full" style={{ height: '60vh' }}>
              <div className="absolute inset-0 bg-gradient-to-b from-[#C8962C]/30 via-[#0D0D0D] to-black" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 px-6 text-center">
                <Radio className="w-12 h-12 text-[#C8962C] mb-4" />
                <h1 className={`${wordmarkSize} font-black ${wordmarkTracking} leading-none select-none text-white`}>
                  {config.wordmark}
                </h1>
                <p className="text-xs font-bold uppercase tracking-[0.3em] mt-4" style={{ color: AMBER }}>
                  {config.tagline}
                </p>
              </div>
            </motion.div>
          )}

          {/* ---- STANDARD BRAND HEADER ---- */}
          {brand !== 'hotmessRadio' && (
            <motion.div variants={wordmarkVariants} className="pt-16 pb-6 px-6 flex flex-col items-center text-center">
              {BrandIcon && (
                <BrandIcon
                  className="w-8 h-8 mb-3"
                  style={{ color: config.wordmarkColor === AMBER ? AMBER : 'rgba(255,255,255,0.3)' }}
                />
              )}
              <h1
                className={`${wordmarkSize} ${config.wordmarkStyle} ${wordmarkTracking} leading-none select-none`}
                style={{ color: config.wordmarkColor }}
              >
                {config.wordmark}
              </h1>
              <p className="text-xs font-bold uppercase tracking-[0.3em] mt-4" style={{ color: config.taglineColor }}>
                {config.tagline}
              </p>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* BRAND-SPECIFIC SECTIONS                                          */}
          {/* ================================================================ */}

          {/* ---- RAW: SUPERRAW banner + real products ---- */}
          {brand === 'raw' && (
            <>
              <SuperrawBanner />
              <div ref={productsRef}>
                <motion.div variants={itemVariants} className="px-4 pt-4 pb-2">
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                    {config.sectionTitle}
                  </h2>
                </motion.div>
                <ProductGrid
                  products={products}
                  loading={loading}
                  brandName={config.wordmark}
                  layout={config.layout}
                  onProductTap={handleProductTap}
                />
              </div>
            </>
          )}

          {/* ---- HUNG: SUPERHUNG banner + real products ---- */}
          {brand === 'hung' && (
            <>
              <SuperhungBanner />
              <div ref={productsRef}>
                <motion.div variants={itemVariants} className="px-4 pt-4 pb-2">
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                    {config.sectionTitle}
                  </h2>
                </motion.div>
                <ProductGrid
                  products={products}
                  loading={loading}
                  brandName={config.wordmark}
                  layout={config.layout}
                  onProductTap={handleProductTap}
                />
              </div>
            </>
          )}

          {/* ---- HIGH: editorial 1-col cards ---- */}
          {brand === 'high' && (
            <div ref={productsRef}>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-2">
                <h2 className="text-white/40 font-light text-xs uppercase tracking-[0.4em]">
                  {config.sectionTitle}
                </h2>
              </motion.div>
              <ProductGrid
                products={products}
                loading={loading}
                brandName={config.wordmark}
                layout={config.layout}
                onProductTap={handleProductTap}
              />
            </div>
          )}

          {/* ---- HUNGMESS: editorial + real products ---- */}
          {brand === 'hungmess' && (
            <div ref={productsRef}>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-2">
                <h2 className="text-white/40 font-light text-xs uppercase tracking-[0.4em]">
                  Lookbook
                </h2>
              </motion.div>
              <motion.div variants={itemVariants} className="px-4 pt-6 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  {config.sectionTitle}
                </h2>
              </motion.div>
              <ProductGrid
                products={products}
                loading={loading}
                brandName={config.wordmark}
                layout="grid"
                onProductTap={handleProductTap}
              />
            </div>
          )}

          {/* ---- SUPERHUNG: countdown + limited-drop real products ---- */}
          {brand === 'superhung' && (
            <>
              <CountdownBar />
              <motion.div variants={itemVariants} className="px-4 mt-2 mb-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 text-center font-bold">
                  ONCE GONE, GONE FOREVER
                </p>
              </motion.div>
              <div ref={productsRef}>
                <motion.div variants={itemVariants} className="px-4 pb-2">
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                    {config.sectionTitle}
                  </h2>
                </motion.div>
                <ProductGrid
                  products={products}
                  loading={loading}
                  brandName={config.wordmark}
                  layout="grid"
                  isLimitedDrop
                  onProductTap={handleProductTap}
                />
              </div>
            </>
          )}

          {/* ---- SUPERRAW: countdown + limited-drop real products ---- */}
          {brand === 'superraw' && (
            <>
              <CountdownBar />
              <motion.div variants={itemVariants} className="px-4 mt-2 mb-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 text-center font-bold">
                  ONCE GONE, GONE FOREVER
                </p>
              </motion.div>
              <div ref={productsRef}>
                <motion.div variants={itemVariants} className="px-4 pb-2">
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                    {config.sectionTitle}
                  </h2>
                </motion.div>
                <ProductGrid
                  products={products}
                  loading={loading}
                  brandName={config.wordmark}
                  layout="grid"
                  isLimitedDrop
                  onProductTap={handleProductTap}
                />
              </div>
            </>
          )}

          {/* ---- HOTMESS RADIO: show schedule ---- */}
          {brand === 'hotmessRadio' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-6 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">The Shows</h2>
              </motion.div>
              <motion.div variants={containerVariants} className="px-4 space-y-3 pb-8">
                {RADIO_SHOWS.map((show, i) => (
                  <RadioShowCard key={show.title} show={show} index={i} />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- RAW CONVICT RECORDS: editorial releases ---- */}
          {brand === 'rawConvictRecords' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Latest Releases</h2>
              </motion.div>
              <motion.div variants={containerVariants} className="px-4 space-y-4 pb-8">
                {RCR_RELEASES.map((release, i) => (
                  <ReleaseCardComponent key={release.id} release={release} index={i} />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- SMASH DADDYS: producers + beat showcase ---- */}
          {brand === 'smashDaddys' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Producers</h2>
              </motion.div>
              <motion.div variants={containerVariants} className="px-4 space-y-3 pb-4">
                {SD_PRODUCERS.map((producer, i) => (
                  <ProducerCard key={producer.name} producer={producer} index={i} />
                ))}
              </motion.div>
              <motion.div variants={itemVariants} className="px-4 pt-4 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Beat Showcase</h2>
              </motion.div>
              <motion.div variants={containerVariants} className="px-4 space-y-3 pb-8">
                {SD_BEATS.map((beat, i) => (
                  <BeatCard key={beat.id} beat={beat} index={i} />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- HNH MESS: manifesto + Hand N Hand anchor + real products ---- */}
          {brand === 'hnhMess' && (
            <>
              {/* Manifesto block */}
              <motion.div
                variants={itemVariants}
                className="mx-4 mt-2 rounded-2xl p-5 border"
                style={{
                  background: `linear-gradient(135deg, rgba(139,92,246,0.15) 0%, #0A0410 60%, rgba(139,92,246,0.08) 100%)`,
                  borderColor: `rgba(139,92,246,0.25)`,
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: HNH_PLUM }}>
                  The Story
                </p>
                <p className="text-white font-bold text-[15px] leading-snug mb-2">
                  HNH was the code.{'\n'}HOTMESS is the care.
                </p>
                <p className="text-[#8E8E93] text-[12px] leading-relaxed">
                  In hookup culture, HnH meant High &amp; Horny — a signal passed quickly, quietly, in the language the scene built for itself. HOTMESS doesn't ignore that reality. We answer it.
                </p>
                <p className="text-[#8E8E93] text-[12px] leading-relaxed mt-2">
                  Here, HNH means Hand N Hand. After the night. After the chaos. After the music fades — someone should still be there to land with.
                </p>
                <p className="text-[12px] font-bold italic mt-3" style={{ color: HNH_PLUM }}>
                  "Hand N Hand is the only place to land."
                </p>
              </motion.div>

              {/* Hand N Hand radio anchor */}
              <motion.div variants={itemVariants} className="mx-4 mt-3">
                <button
                  onClick={() => openSheet('schedule', {})}
                  className="w-full flex items-center gap-3 rounded-2xl p-4 border text-left active:scale-[0.98] transition-transform"
                  style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)' }}>
                    <Radio className="w-5 h-5" style={{ color: HNH_PLUM }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">Hand N Hand</p>
                    <p className="text-[#8E8E93] text-[11px]">Every Sunday on HOTMESS RADIO · The care show</p>
                  </div>
                  <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: HNH_PLUM }} />
                </button>
              </motion.div>

              {/* Care principles strip */}
              <motion.div variants={itemVariants} className="mx-4 mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Pleasure', sub: 'Without shame' },
                  { label: 'Honesty', sub: 'Without hiding' },
                  { label: 'Care', sub: 'After the night' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3 text-center border"
                    style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.15)' }}
                  >
                    <p className="text-white font-bold text-[11px]">{item.label}</p>
                    <p className="text-[#8E8E93] text-[9px] mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </motion.div>

              {/* Real product range */}
              <div ref={productsRef}>
                <motion.div variants={itemVariants} className="px-4 pt-6 pb-2 flex items-center justify-between">
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                    {config.sectionTitle}
                  </h2>
                  <p className="text-[#8E8E93] text-[10px]">Pleasure with care</p>
                </motion.div>
                <ProductGrid
                  products={products}
                  loading={loading}
                  brandName={config.wordmark}
                  layout="grid"
                  onProductTap={handleProductTap}
                />
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* STICKY ACTION BAR */}
      <div
        className="flex-shrink-0 px-6 py-3 border-t border-white/10"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))', backgroundColor: config.headerBg }}
      >
        <button
          onClick={handleShopNow}
          className="w-full h-12 rounded-xl font-bold text-sm uppercase tracking-wider text-white active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C] focus:ring-offset-2 focus:ring-offset-black"
          style={{ backgroundColor: AMBER }}
          aria-label={config.ctaLabel}
        >
          {config.ctaLabel}
        </button>
      </div>
    </div>
  );
}
