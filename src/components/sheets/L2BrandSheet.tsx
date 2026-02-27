/**
 * L2BrandSheet -- 10 brand landing pages for the HOTMESS OS marketplace
 *
 * Props: { brand: BrandKey }
 *
 * Brands (10 total):
 *   raw              -- bold white on black, industrial, 2-col grid
 *   hung             -- gold statement, oversized, 2-col grid
 *   high             -- white minimal, thin tracking, editorial cards
 *   hungmess         -- italic black-on-black editorial gallery
 *   superhung        -- limited-drop grid with countdown + scarcity + sold-out
 *   superraw         -- limited-drop grid, same treatment, white accent
 *   hotmessRadio     -- full-bleed hero + show schedule + LISTEN LIVE CTA
 *   rawConvictRecords -- editorial artist/release cards + SoundCloud CTA
 *   smashDaddys      -- editorial production credits + beat showcase
 *   hnhMess          -- product hero + grid + "official lubricant" tagline
 *
 * Wireframe (SUPERHUNG limited-drop example):
 * +------------------------------------------+
 * | [<]                                      |
 * |       S U P E R H U N G                  |
 * |   ULTRA-LIMITED STATEMENT DROPS.         |
 * | +--------------------------------------+ |
 * | | DROP ENDS IN  12:34:56               | |  Gold pulsing countdown bar
 * | +--------------------------------------+ |
 * | ONCE GONE, GONE FOREVER                 |  Scarcity text
 * | +----------+  +----------+              |
 * | |[PRODUCT] |  |[PRODUCT] |              |  2-col grid
 * | | SOLD OUT |  | 3 LEFT   |              |  Overlays + scarcity pills
 * | +----------+  +----------+              |
 * +------------------------------------------+
 * | [      SHOP SUPERHUNG        ]           |  Sticky CTA
 * +------------------------------------------+
 *
 * States: idle (static content -- images from /public)
 */

import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

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
const CARD_BG = '#1C1C1E';
const MUTED = '#8E8E93';
const RADIO_STREAM_URL =
  'https://listen.radioking.com/radio/736103/stream/802454';

// ---- Product image paths ---------------------------------------------------
const HOODIE_FRONT = '/images/HOTMESS HOODIE FRONT.jpg';
const HOODIE_BACK = '/images/HOTMESS HOODIE BACK.jpg';
const HERO_HNH = '/images/HOTMESS HERO HNH.PNG';
const HNHMESS_HERO = '/images/HNHMESS HERO.PNG';

// ---- Editorial image paths -------------------------------------------------
const EDITORIAL_IMAGES = [
  '/images/editorial-drop-01.svg',
  '/images/editorial-drop-02.svg',
  '/images/editorial-drop-03.svg',
  '/images/editorial-drop-04.svg',
];

// ---- Product card data (static showcase) -----------------------------------
interface BrandProduct {
  id: string;
  title: string;
  price: string;
  image: string;
  soldOut?: boolean;
  remaining?: number;
}

const BRAND_PRODUCTS: BrandProduct[] = [
  { id: 'hoodie-front', title: 'HOTMESS Hoodie', price: '45.00', image: HOODIE_FRONT },
  { id: 'hoodie-back', title: 'HOTMESS Hoodie', price: '45.00', image: HOODIE_BACK },
  { id: 'hnh-hero', title: 'HNH Statement Tee', price: '35.00', image: HERO_HNH },
  { id: 'hnhmess-hero', title: 'HUNGMESS Drop', price: '55.00', image: HNHMESS_HERO },
];

// Limited-drop products with scarcity data
const LIMITED_DROP_PRODUCTS: BrandProduct[] = [
  { id: 'ltd-001', title: 'Statement Jacket', price: '120.00', image: HOODIE_FRONT, soldOut: true },
  { id: 'ltd-002', title: 'Drop Hoodie', price: '85.00', image: HOODIE_BACK, remaining: 3 },
  { id: 'ltd-003', title: 'Exclusive Tee', price: '55.00', image: HERO_HNH, remaining: 1 },
  { id: 'ltd-004', title: 'Limited Shorts', price: '65.00', image: HNHMESS_HERO, remaining: 7 },
];

// HNH Mess products
const HNH_PRODUCTS: BrandProduct[] = [
  { id: 'hnh-001', title: 'HNH Original', price: '12.00', image: HERO_HNH },
  { id: 'hnh-002', title: 'HNH Warming', price: '14.00', image: HERO_HNH },
  { id: 'hnh-003', title: 'HNH Silicone', price: '16.00', image: HERO_HNH },
  { id: 'hnh-004', title: 'HNH Travel Pack', price: '8.00', image: HERO_HNH },
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
interface BrandConfig {
  wordmark: string;
  tagline: string;
  ctaLabel: string;
  ctaAction?: 'shop' | 'external';
  ctaUrl?: string;
  headerBg: string;
  wordmarkColor: string;
  wordmarkStyle: string;
  taglineColor: string;
  layout: 'grid' | 'editorial' | 'editorial-gallery' | 'limited-drop' | 'radio' | 'label' | 'production';
  isLimitedDrop?: boolean;
}

const BRAND_CONFIG: Record<BrandKey, BrandConfig> = {
  raw: {
    wordmark: 'RAW',
    tagline: 'BOLD BASICS. NO BULLSHIT.',
    ctaLabel: 'SHOP RAW',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black',
    taglineColor: MUTED,
    layout: 'grid',
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
    tagline: 'THE OFFICIAL LUBRICANT OF HOTMESS',
    ctaLabel: 'SHOP HNH MESS',
    headerBg: '#000000',
    wordmarkColor: AMBER,
    wordmarkStyle: 'font-black',
    taglineColor: AMBER,
    layout: 'grid',
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
// PRODUCT CARD (2-col grid variant)
// =============================================================================

function BrandProductCard({
  product,
  index,
  onTap,
}: {
  product: BrandProduct;
  index: number;
  onTap: () => void;
}) {
  return (
    <motion.button
      custom={index}
      variants={itemVariants}
      onClick={onTap}
      className="w-full text-left bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.08] active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
      aria-label={`View ${product.title}`}
    >
      <div className="relative w-full aspect-square bg-white/[0.03] overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
          {product.title}
        </h3>
        <span className="text-[#C8962C] font-extrabold text-base leading-none mt-1 block">
          {'\u00a3'}{product.price}
        </span>
      </div>
    </motion.button>
  );
}

// =============================================================================
// LIMITED DROP PRODUCT CARD (with sold-out overlay + scarcity pill)
// =============================================================================

function LimitedDropProductCard({
  product,
  index,
  onTap,
}: {
  product: BrandProduct;
  index: number;
  onTap: () => void;
}) {
  const isSoldOut = product.soldOut === true;
  const hasScarcity = !isSoldOut && product.remaining != null && product.remaining <= 5;
  const scarcityLabel =
    product.remaining === 1 ? 'LAST ONE' : `${product.remaining} LEFT`;

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
        <img
          src={product.image}
          alt={product.title}
          className={`w-full h-full object-cover ${isSoldOut ? 'grayscale' : ''}`}
          loading="lazy"
        />

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

        {/* Scarcity pill */}
        {hasScarcity && (
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-[#C8962C]">
            <span className="text-[10px] font-black text-white uppercase tracking-wider">
              {scarcityLabel}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">
          {product.title}
        </h3>
        <span
          className={`font-extrabold text-base leading-none mt-1 block ${
            isSoldOut ? 'text-[#8E8E93] line-through' : 'text-[#C8962C]'
          }`}
        >
          {'\u00a3'}{product.price}
        </span>
      </div>
    </motion.button>
  );
}

// =============================================================================
// EDITORIAL CARD (1-col, HIGH brand -- larger, more whitespace)
// =============================================================================

function EditorialProductCard({
  product,
  index,
  onTap,
}: {
  product: BrandProduct;
  index: number;
  onTap: () => void;
}) {
  return (
    <motion.button
      custom={index}
      variants={itemVariants}
      onClick={onTap}
      className="w-full text-left bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.06] active:scale-[0.99] transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
      aria-label={`View ${product.title}`}
    >
      <div className="relative w-full aspect-[3/4] bg-white/[0.03] overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-lg font-semibold text-white leading-tight">
            {product.title}
          </h3>
          <span className="text-[#C8962C] font-bold text-xl mt-1 block">
            {'\u00a3'}{product.price}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// =============================================================================
// SUPERHUNG LIMITED DROP BANNER (HUNG brand only)
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
          <span
            className="text-sm font-black uppercase tracking-[0.2em]"
            style={{ color: AMBER }}
          >
            SUPERHUNG
          </span>
        </div>
        <h3 className="text-white font-bold text-lg mb-1">Limited Drop</h3>
        <p className="text-[#8E8E93] text-sm mb-4">
          Exclusive statement pieces. Once they are gone, they are gone.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C8962C]/15 border border-[#C8962C]/20">
            <div className="w-2 h-2 rounded-full bg-[#C8962C] animate-pulse" />
            <span className="text-[#C8962C] text-xs font-bold uppercase tracking-wider">
              Dropping soon
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// SUPERRAW BANNER (RAW brand only)
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
// EDITORIAL GALLERY (HUNGMESS brand only)
// =============================================================================

function EditorialGallery() {
  return (
    <div className="px-4 space-y-4 mt-6">
      {EDITORIAL_IMAGES.map((src, i) => (
        <motion.div
          key={src}
          custom={i}
          variants={itemVariants}
          className="w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-[#1C1C1E]"
        >
          <img
            src={src}
            alt={`Editorial drop ${i + 1}`}
            className="w-full object-cover"
            loading="lazy"
          />
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// COUNTDOWN BAR (SUPERHUNG / SUPERRAW limited-drop pages)
// =============================================================================

function CountdownBar() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set drop end to midnight tonight for demo purposes
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
    <motion.div
      variants={itemVariants}
      className="mx-4 mt-4 mb-2"
    >
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
      {/* Gold left accent bar */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: AMBER }} />
      <div className="flex-1 p-4">
        <h3 className="text-white font-bold text-base leading-tight">
          {show.title}
        </h3>
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
            style={{
              color: AMBER,
              borderColor: 'rgba(200, 150, 44, 0.3)',
              backgroundColor: 'rgba(200, 150, 44, 0.1)',
            }}
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

function ReleaseCardComponent({
  release,
  index,
}: {
  release: ReleaseCard;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/[0.06]"
    >
      {/* Album art placeholder */}
      <div className="w-full aspect-square bg-gradient-to-br from-[#C8962C]/20 via-[#1C1C1E] to-black/80 flex items-center justify-center">
        <Disc3 className="w-16 h-16 text-[#C8962C]/30" />
      </div>
      <div className="p-4">
        <p className="text-[#C8962C] text-xs font-bold uppercase tracking-wider">
          {release.artist}
        </p>
        <h3 className="text-white font-bold text-base leading-tight mt-1">
          {release.title}
        </h3>
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
// SMASH DADDYS — PRODUCER CARD
// =============================================================================

function ProducerCard({
  producer,
  index,
}: {
  producer: ProducerProfile;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      className="flex items-center gap-4 bg-[#1C1C1E] rounded-2xl p-4 border border-white/[0.06]"
    >
      {/* Avatar placeholder */}
      <div
        className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(200, 150, 44, 0.15)' }}
      >
        <Music className="w-5 h-5 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-base leading-tight truncate">
          {producer.name}
        </h3>
        <p className="text-[#8E8E93] text-sm mt-0.5">
          {producer.credits} tracks produced
        </p>
      </div>
    </motion.div>
  );
}

// =============================================================================
// SMASH DADDYS — BEAT CARD
// =============================================================================

function BeatCard({ beat, index }: { beat: BeatShowcase; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      className="flex items-center gap-3 bg-[#1C1C1E] rounded-2xl p-4 border border-white/[0.06]"
    >
      {/* Play icon */}
      <button
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center active:scale-90 transition-transform"
        style={{ backgroundColor: AMBER }}
        aria-label={`Play ${beat.title}`}
      >
        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
      </button>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold text-sm leading-tight truncate">
          {beat.title}
        </h3>
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
// BRAND ICON SELECTOR
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

// =============================================================================
// WORDMARK SIZE HELPER
// =============================================================================

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
// MAIN: L2BrandSheet
// =============================================================================

export default function L2BrandSheet({ brand = 'raw' }: L2BrandSheetProps) {
  const { closeSheet, openSheet } = useSheet();
  const config = BRAND_CONFIG[brand] || BRAND_CONFIG.raw;

  const handleShopNow = useCallback(() => {
    if (config.ctaAction === 'external' && config.ctaUrl) {
      window.open(config.ctaUrl, '_blank', 'noopener,noreferrer');
    } else {
      openSheet('shop', { brand });
    }
  }, [openSheet, brand, config.ctaAction, config.ctaUrl]);

  const handleProductTap = useCallback(
    (product: BrandProduct) => {
      openSheet('product', { productId: product.id, source: 'shopify' });
    },
    [openSheet],
  );

  const wordmarkSize = getWordmarkSize(brand);
  const wordmarkTracking = getWordmarkTracking(brand);
  const BrandIcon = getBrandIcon(brand);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: config.headerBg }}>
      {/* ================================================================== */}
      {/* BACK BUTTON (absolute, overlays header)                             */}
      {/* ================================================================== */}
      <button
        onClick={closeSheet}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      {/* ================================================================== */}
      {/* SCROLLABLE CONTENT                                                  */}
      {/* ================================================================== */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* ---- RADIO HERO (hotmessRadio gets a full-bleed hero) ---------- */}
          {brand === 'hotmessRadio' && (
            <motion.div
              variants={wordmarkVariants}
              className="relative w-full"
              style={{ height: '60vh' }}
            >
              {/* Gradient placeholder for hero image */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#C8962C]/30 via-[#0D0D0D] to-black" />
              {/* Overlay content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 px-6 text-center">
                <Radio className="w-12 h-12 text-[#C8962C] mb-4" />
                <h1
                  className={`${wordmarkSize} font-black ${wordmarkTracking} leading-none select-none text-white`}
                >
                  {config.wordmark}
                </h1>
                <p
                  className="text-xs font-bold uppercase tracking-[0.3em] mt-4"
                  style={{ color: AMBER }}
                >
                  {config.tagline}
                </p>
              </div>
            </motion.div>
          )}

          {/* ---- STANDARD BRAND HEADER (all non-radio brands) -------------- */}
          {brand !== 'hotmessRadio' && (
            <motion.div
              variants={wordmarkVariants}
              className="pt-16 pb-6 px-6 flex flex-col items-center text-center"
            >
              {/* Optional brand icon */}
              {BrandIcon && (
                <BrandIcon
                  className="w-8 h-8 mb-3"
                  style={{
                    color:
                      config.wordmarkColor === AMBER ? AMBER : 'rgba(255,255,255,0.3)',
                  }}
                />
              )}

              {/* Wordmark */}
              <h1
                className={`${wordmarkSize} ${config.wordmarkStyle} ${wordmarkTracking} leading-none select-none`}
                style={{ color: config.wordmarkColor }}
              >
                {config.wordmark}
              </h1>

              {/* Tagline */}
              <p
                className="text-xs font-bold uppercase tracking-[0.3em] mt-4"
                style={{ color: config.taglineColor }}
              >
                {config.tagline}
              </p>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* BRAND-SPECIFIC SECTIONS                                          */}
          {/* ================================================================ */}

          {/* ---- RAW: SUPERRAW banner + 2-col grid ------------------------- */}
          {brand === 'raw' && (
            <>
              <SuperrawBanner />
              <motion.div variants={itemVariants} className="px-4 pt-4 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  The Collection
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-3 px-4 pb-8"
              >
                {BRAND_PRODUCTS.map((product, i) => (
                  <BrandProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- HUNG: SUPERHUNG banner + 2-col grid ----------------------- */}
          {brand === 'hung' && (
            <>
              <SuperhungBanner />
              <motion.div variants={itemVariants} className="px-4 pt-4 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  Statement Pieces
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-3 px-4 pb-8"
              >
                {BRAND_PRODUCTS.map((product, i) => (
                  <BrandProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- HIGH: editorial 1-col cards ------------------------------- */}
          {brand === 'high' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-2">
                <h2 className="text-white/40 font-light text-xs uppercase tracking-[0.4em]">
                  The Edit
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="px-4 space-y-4 pb-8"
              >
                {BRAND_PRODUCTS.slice(0, 2).map((product, i) => (
                  <EditorialProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- HUNGMESS: editorial gallery ------------------------------- */}
          {brand === 'hungmess' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-2">
                <h2 className="text-white/40 font-light text-xs uppercase tracking-[0.4em]">
                  Lookbook
                </h2>
              </motion.div>
              <EditorialGallery />
              {/* Also show product cards below the editorial */}
              <motion.div variants={itemVariants} className="px-4 pt-6 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  Shop the Edit
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-3 px-4 pb-8"
              >
                {BRAND_PRODUCTS.map((product, i) => (
                  <BrandProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- SUPERHUNG: limited-drop grid ------------------------------ */}
          {brand === 'superhung' && (
            <>
              <CountdownBar />
              <motion.div variants={itemVariants} className="px-4 mt-2 mb-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 text-center font-bold">
                  ONCE GONE, GONE FOREVER
                </p>
              </motion.div>
              <motion.div variants={itemVariants} className="px-4 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  The Drop
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-3 px-4 pb-8"
              >
                {LIMITED_DROP_PRODUCTS.map((product, i) => (
                  <LimitedDropProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- SUPERRAW: limited-drop grid ------------------------------- */}
          {brand === 'superraw' && (
            <>
              <CountdownBar />
              <motion.div variants={itemVariants} className="px-4 mt-2 mb-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 text-center font-bold">
                  ONCE GONE, GONE FOREVER
                </p>
              </motion.div>
              <motion.div variants={itemVariants} className="px-4 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  The Drop
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-3 px-4 pb-8"
              >
                {LIMITED_DROP_PRODUCTS.map((product, i) => (
                  <LimitedDropProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- HOTMESS RADIO: show schedule ------------------------------ */}
          {brand === 'hotmessRadio' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-6 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  The Shows
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="px-4 space-y-3 pb-8"
              >
                {RADIO_SHOWS.map((show, i) => (
                  <RadioShowCard key={show.title} show={show} index={i} />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- RAW CONVICT RECORDS: editorial releases ------------------- */}
          {brand === 'rawConvictRecords' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  Latest Releases
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="px-4 space-y-4 pb-8"
              >
                {RCR_RELEASES.map((release, i) => (
                  <ReleaseCardComponent
                    key={release.id}
                    release={release}
                    index={i}
                  />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- SMASH DADDYS: producers + beat showcase ------------------- */}
          {brand === 'smashDaddys' && (
            <>
              <motion.div variants={itemVariants} className="px-4 pt-2 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  Producers
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="px-4 space-y-3 pb-4"
              >
                {SD_PRODUCERS.map((producer, i) => (
                  <ProducerCard
                    key={producer.name}
                    producer={producer}
                    index={i}
                  />
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="px-4 pt-4 pb-3">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  Beat Showcase
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="px-4 space-y-3 pb-8"
              >
                {SD_BEATS.map((beat, i) => (
                  <BeatCard key={beat.id} beat={beat} index={i} />
                ))}
              </motion.div>
            </>
          )}

          {/* ---- HNH MESS: product hero + grid ----------------------------- */}
          {brand === 'hnhMess' && (
            <>
              {/* Product hero */}
              <motion.div
                variants={itemVariants}
                className="mx-4 mt-2 rounded-2xl overflow-hidden border border-white/[0.06]"
              >
                <div
                  className="w-full aspect-[16/9] flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, rgba(200,150,44,0.2) 0%, ${CARD_BG} 50%, rgba(200,150,44,0.1) 100%)`,
                  }}
                >
                  <Droplets className="w-20 h-20 text-[#C8962C]/30" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="px-4 pt-6 pb-2">
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">
                  The Range
                </h2>
              </motion.div>
              <motion.div
                variants={containerVariants}
                className="grid grid-cols-2 gap-3 px-4 pb-8"
              >
                {HNH_PRODUCTS.map((product, i) => (
                  <BrandProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onTap={() => handleProductTap(product)}
                  />
                ))}
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* STICKY ACTION BAR                                                   */}
      {/* ================================================================== */}
      <div
        className="flex-shrink-0 px-6 py-3 border-t border-white/10"
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          backgroundColor: config.headerBg,
        }}
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
