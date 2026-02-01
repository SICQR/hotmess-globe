/**
 * HOTMESS ENTERPRISE - Brand Configuration
 * 
 * Brutalist luxury editorial platform combining:
 * - Live radio streaming (24/7 underground music)
 * - E-commerce storefront (Bold luxury clothing + 3rd party sellers)
 * - In-house brands and limited edition drops
 * - AI concierge and QR beacon system
 * - Gamified affiliate program
 * - Mental health support / aftercare
 */

export const BRAND = {
  name: 'HOTMESS',
  tagline: 'Brutalist Luxury for the Modern Man',
  subtitle: 'Platform • Radio • Records • Commerce',
  
  // Company
  company: {
    name: 'HOTMESS LONDON LTD',
    copyright: '© 2026 HOTMESS LONDON LTD. All rights reserved.',
  },

  // Core brand pillars
  pillars: [
    'Live Radio',
    'Bold Commerce', 
    'Real Aftercare',
    'Community First',
  ],

  // Core clothing brands
  coreBrands: {
    RAW: {
      name: 'RAW',
      tagline: 'Unfiltered. Unapologetic.',
      color: '#FF1493',
      description: 'Bold basics for the bold man.',
    },
    HUNG: {
      name: 'HUNG',
      tagline: 'Statement pieces. Maximum impact.',
      color: '#B026FF',
      description: 'Luxury streetwear that demands attention.',
    },
    HIGH: {
      name: 'HIGH',
      tagline: 'Elevated essentials.',
      color: '#00D9FF',
      description: 'Premium elevated basics.',
    },
  },

  // Limited edition drops
  limitedEditions: {
    SUPERHUNG: {
      name: 'SUPERHUNG',
      tagline: 'Limited. Legendary.',
      color: '#FFD700',
      description: 'Ultra-limited drops. When they\'re gone, they\'re gone.',
    },
    SUPERRAW: {
      name: 'SUPERRAW',
      tagline: 'Rare. Radical.',
      color: '#FF6B35',
      description: 'Collector pieces for the devoted.',
    },
  },

  // HNH MESS - Lube brand
  hnhmess: {
    name: 'HNH MESS',
    fullName: 'Hand N Hand MESS',
    tagline: 'The only lube with real aftercare.',
    mission: 'Smashing stigma. Building community.',
    message: 'We dress care as kink, dripping in sweat dancing next to you.',
    trademark: 'HNH MESS™ is a trademark of HOTMESS LONDON LTD.',
    musicCredit: 'Produced by SMASH DADDYS for RAW CONVICT RECORDS.',
  },

  // HNH Radio Show
  hnh: {
    name: 'Hand N Hand',
    shortName: 'HNH',
    tagline: 'The only place to land.',
    schedule: 'Every Sunday',
    description: 'We never glamourise alternative lifestyles, but we are bold and provocative, and we are here for a reason.',
  },

  // MESSMARKET - 3rd Party Marketplace
  messmarket: {
    name: 'MESSMARKET',
    tagline: 'Third-party marketplace. Verified sellers.',
    description: 'Preloved luxury, digital content, and curated retail partners. Buy and sell on the HOTMESS platform.',
    fee: '10% platform fee',
    feePercent: 10,
    features: [
      'Verified seller badges',
      'Escrow-protected transactions',
      'Direct messaging with sellers',
      'Rating & review system',
      'Secure payments',
    ],
    sellerBenefits: [
      'No listing fees',
      'Access to HOTMESS audience',
      'Seller dashboard & analytics',
      'Fast payouts',
    ],
  },

  // Record label
  recordLabel: {
    name: 'RAW CONVICT RECORDS',
    tagline: 'Underground. Uncompromising.',
    artists: {
      house: {
        name: 'SMASH DADDYS',
        description: 'The sound of HOTMESS. All original productions.',
        role: 'In-house production duo',
      },
    },
  },

  // Music production
  music: {
    producer: 'SMASH DADDYS',
    label: 'RAW CONVICT RECORDS',
    credit: 'Produced by SMASH DADDYS for RAW CONVICT RECORDS',
    copyright: '℗ & © RAW CONVICT RECORDS',
  },

  // Voice & tone
  voice: {
    style: 'Brutalist luxury editorial',
    tone: [
      'Bold, not crude',
      'Provocative, not offensive',
      'Care-first, always',
      'Editorial, not clinical',
      'Community, not corporate',
    ],
    avoid: [
      'Glamourizing harmful behavior',
      'Corporate speak',
      'Excessive emojis',
      'Clickbait language',
    ],
  },

  // Key copy lines
  copy: {
    hero: 'Brutalist Luxury for the Modern Man',
    care: 'We dress care as kink',
    aftercare: 'HNH — Hand N Hand is the only place to land',
    radio: '24/7 underground music from worldwide DJs',
    commerce: 'Bold luxury clothing and MESSMARKET community sellers',
    community: 'Dripping in sweat dancing next to you',
    messmarket: 'Community sellers. Zero gatekeepers.',
  },

  // Colors
  colors: {
    hot: '#FF1493',
    cyan: '#00D9FF',
    purple: '#B026FF',
    gold: '#FFD700',
    lime: '#39FF14',
    orange: '#FF6B35',
  },

  // Social
  social: {
    instagram: '@hotmess.london',
    twitter: '@hotmesslondon',
    soundcloud: 'hotmessradio',
  },
};

// Quick access exports
export const CORE_BRANDS = BRAND.coreBrands;
export const LIMITED_EDITIONS = BRAND.limitedEditions;
export const HNH_MESS = BRAND.hnhmess;
export const HNH_SHOW = BRAND.hnh;
export const MESSMARKET = BRAND.messmarket;
export const BRAND_COPY = BRAND.copy;
export const BRAND_COLORS = BRAND.colors;

export default BRAND;
