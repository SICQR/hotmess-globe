/**
 * L2BrandSheet -- RAW / HUNG / HIGH / HUNGMESS brand landing pages
 *
 * Props: { brand: 'raw' | 'hung' | 'high' | 'hungmess' }
 *
 * Each brand has a unique visual identity:
 *   RAW      -- bold white on black, industrial, text-[20vw]
 *   HUNG     -- gold statement, oversized, SUPERHUNG limited drop banner
 *   HIGH     -- white minimal, thin tracking, editorial card layout
 *   HUNGMESS -- italic black-on-black editorial series
 *
 * Wireframe (RAW example):
 * +------------------------------------------+
 * | [<]                                      |  Back button (absolute, z-10)
 * |                                          |
 * |            R A W                         |  Massive wordmark
 * |   BOLD BASICS. NO BULLSHIT.              |  Tagline
 * |                                          |
 * |  +----------+  +----------+              |  2-col product grid
 * |  | HOODIE   |  | HOODIE   |              |
 * |  | FRONT    |  | BACK     |              |
 * |  +----------+  +----------+              |
 * |                                          |
 * +------------------------------------------+
 * | [        SHOP RAW         ]              |  Sticky amber CTA
 * +------------------------------------------+
 *
 * States: idle (static content, no loading needed -- images from /public)
 */

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Flame, Sparkles, Crown } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

// ---- Brand types -----------------------------------------------------------
type BrandKey = 'raw' | 'hung' | 'high' | 'hungmess';

interface L2BrandSheetProps {
  brand?: BrandKey;
}

// ---- Constants -------------------------------------------------------------
const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';

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
}

const BRAND_PRODUCTS: BrandProduct[] = [
  { id: 'hoodie-front', title: 'HOTMESS Hoodie', price: '45.00', image: HOODIE_FRONT },
  { id: 'hoodie-back', title: 'HOTMESS Hoodie', price: '45.00', image: HOODIE_BACK },
  { id: 'hnh-hero', title: 'HNH Statement Tee', price: '35.00', image: HERO_HNH },
  { id: 'hnhmess-hero', title: 'HUNGMESS Drop', price: '55.00', image: HNHMESS_HERO },
];

// ---- Brand config ----------------------------------------------------------
interface BrandConfig {
  wordmark: string;
  tagline: string;
  ctaLabel: string;
  headerBg: string;
  wordmarkColor: string;
  wordmarkStyle: string;
  taglineColor: string;
  layout: 'grid' | 'editorial' | 'editorial-gallery';
}

const BRAND_CONFIG: Record<BrandKey, BrandConfig> = {
  raw: {
    wordmark: 'RAW',
    tagline: 'BOLD BASICS. NO BULLSHIT.',
    ctaLabel: 'SHOP RAW',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black',
    taglineColor: '#8E8E93',
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
    taglineColor: '#8E8E93',
    layout: 'editorial',
  },
  hungmess: {
    wordmark: 'HUNGMESS',
    tagline: 'EDITORIAL SERIES',
    ctaLabel: 'EXPLORE COLLECTION',
    headerBg: '#000000',
    wordmarkColor: '#FFFFFF',
    wordmarkStyle: 'font-black italic',
    taglineColor: '#8E8E93',
    layout: 'editorial-gallery',
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
// MAIN: L2BrandSheet
// =============================================================================

export default function L2BrandSheet({ brand = 'raw' }: L2BrandSheetProps) {
  const { closeSheet, openSheet } = useSheet();
  const config = BRAND_CONFIG[brand] || BRAND_CONFIG.raw;

  const handleShopNow = useCallback(() => {
    openSheet('shop', { brand });
  }, [openSheet, brand]);

  const handleProductTap = useCallback(
    (product: BrandProduct) => {
      openSheet('product', { productId: product.id, source: 'shopify' });
    },
    [openSheet],
  );

  // Pick wordmark font size: hungmess is longer, so slightly smaller
  const wordmarkSize = brand === 'hungmess' ? 'text-[14vw]' : 'text-[20vw]';
  const wordmarkTracking =
    brand === 'high' ? 'tracking-[0.5em]' : 'tracking-[0.15em]';

  // Brand-specific icon for the header area
  const BrandIcon =
    brand === 'hung' ? Flame : brand === 'high' ? Crown : brand === 'hungmess' ? Sparkles : null;

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
          {/* ---- BRAND HEADER -------------------------------------------- */}
          <motion.div
            variants={wordmarkVariants}
            className="pt-16 pb-6 px-6 flex flex-col items-center text-center"
          >
            {/* Optional brand icon */}
            {BrandIcon && (
              <BrandIcon
                className="w-8 h-8 mb-3"
                style={{ color: config.wordmarkColor === AMBER ? AMBER : 'rgba(255,255,255,0.3)' }}
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

          {/* ---- BRAND-SPECIFIC SECTIONS --------------------------------- */}

          {/* RAW: SUPERRAW banner + 2-col grid */}
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

          {/* HUNG: SUPERHUNG banner + 2-col grid */}
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

          {/* HIGH: editorial 1-col cards */}
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

          {/* HUNGMESS: editorial gallery */}
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
