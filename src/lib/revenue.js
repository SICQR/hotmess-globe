/**
 * HOTMESS Revenue, Retention, CTAs & USPs Configuration
 * 
 * Comprehensive monetization and engagement system for the platform.
 */

// =============================================================================
// MEMBERSHIP TIERS
// =============================================================================

export const MEMBERSHIP_TIERS = {
  FREE: {
    id: 'free',
    name: 'FREE',
    price: 0,
    priceDisplay: 'FREE',
    stripePriceId: null,
    color: '#FFFFFF',
    icon: 'Star',
    badge: null,
    features: [
      'Browse profiles & events',
      'Basic matching (60% accuracy)',
      '1x Go Live per day',
      'Standard beacon scanning',
      'Basic XP earning (1x rate)',
      'Ad-supported experience',
      'Community forum access',
    ],
    limits: {
      goLivePerDay: 1,
      messagesPerDay: 50,
      profileViews: 20,
      xpMultiplier: 1,
      beaconScansPerDay: 5,
    },
  },
  
  PLUS: {
    id: 'plus',
    name: 'PLUS',
    price: 999, // pence
    priceDisplay: '£9.99/mo',
    stripePriceId: 'price_plus_monthly',
    color: '#FF1493',
    icon: 'Zap',
    badge: 'PLUS',
    popular: true,
    features: [
      'Everything in FREE',
      '2x XP Multiplier on all actions',
      'Stealth Mode (browse anonymously)',
      'See who viewed your profile (blurred)',
      'Unlimited Go Live sessions',
      'Priority in Right Now feed',
      'Advanced filters & search',
      'No ads',
      'Exclusive PLUS badge',
    ],
    limits: {
      goLivePerDay: Infinity,
      messagesPerDay: Infinity,
      profileViews: Infinity,
      xpMultiplier: 2,
      beaconScansPerDay: Infinity,
    },
  },
  
  CHROME: {
    id: 'pro',
    name: 'CHROME',
    price: 1999, // pence
    priceDisplay: '£19.99/mo',
    stripePriceId: 'price_chrome_monthly',
    color: '#00D9FF',
    icon: 'Crown',
    badge: 'CHROME',
    features: [
      'Everything in PLUS',
      '3x XP Multiplier',
      'Unmasked viewer list (see exactly who viewed)',
      'Early access to limited drops (24hr head start)',
      'Night King Challenge eligibility',
      'Custom profile gradient & themes',
      'Priority customer support',
      'Free premium content access',
      'Legendary CHROME badge',
      'Exclusive CHROME-only events',
    ],
    limits: {
      goLivePerDay: Infinity,
      messagesPerDay: Infinity,
      profileViews: Infinity,
      xpMultiplier: 3,
      beaconScansPerDay: Infinity,
    },
  },
};

// =============================================================================
// XP PACKAGES (In-App Purchases)
// =============================================================================

export const XP_PACKAGES = [
  {
    id: 'xp_starter',
    name: 'Starter',
    xp: 500,
    price: 499, // pence
    priceDisplay: '£4.99',
    bonus: 0,
    popular: false,
  },
  {
    id: 'xp_popular',
    name: 'Popular',
    xp: 1100, // 1000 + 10% bonus
    price: 999,
    priceDisplay: '£9.99',
    bonus: 10,
    popular: true,
  },
  {
    id: 'xp_value',
    name: 'Value',
    xp: 2500, // 2000 + 25% bonus
    price: 1999,
    priceDisplay: '£19.99',
    bonus: 25,
    popular: false,
  },
  {
    id: 'xp_pro',
    name: 'Pro',
    xp: 5700, // 4000 + 43% bonus
    price: 3499,
    priceDisplay: '£34.99',
    bonus: 43,
    popular: false,
  },
  {
    id: 'xp_ultimate',
    name: 'Ultimate',
    xp: 12500, // 7500 + 67% bonus
    price: 5999,
    priceDisplay: '£59.99',
    bonus: 67,
    popular: false,
    bestValue: true,
  },
];

// =============================================================================
// REVENUE STREAMS
// =============================================================================

export const REVENUE_STREAMS = {
  // Subscription Revenue
  subscriptions: {
    name: 'Memberships',
    description: 'PLUS and CHROME monthly subscriptions',
    type: 'recurring',
    margins: 'high',
  },
  
  // XP Purchases
  xpPurchases: {
    name: 'XP Packages',
    description: 'One-time XP purchases for marketplace/premium content',
    type: 'one-time',
    margins: 'high',
  },
  
  // Marketplace Fees
  marketplaceFees: {
    name: 'MESSMARKET Fees',
    description: '10% platform fee on P2P marketplace sales',
    type: 'transaction',
    feePercent: 10,
    margins: 'medium',
  },
  
  // Premium Content
  premiumContent: {
    name: 'Creator Unlocks',
    description: '20% platform fee on premium content unlocks',
    type: 'transaction',
    feePercent: 20,
    margins: 'high',
  },
  
  // Creator Subscriptions
  creatorSubscriptions: {
    name: 'Creator Subscriptions',
    description: '20% platform fee on creator subscription revenue',
    type: 'recurring',
    feePercent: 20,
    margins: 'high',
  },
  
  // Ticket Resale
  ticketResale: {
    name: 'Ticket Resale',
    description: '10% seller fee + 2.5% buyer protection',
    type: 'transaction',
    sellerFeePercent: 10,
    buyerFeePercent: 2.5,
    margins: 'medium',
  },
  
  // Featured Listings
  featuredListings: {
    name: 'Featured Listings',
    description: 'XP cost to boost product visibility',
    type: 'one-time',
    xpCost: { min: 500, max: 2000 },
    margins: 'high',
  },
  
  // Business Advertising
  businessAdvertising: {
    name: 'Globe Advertising',
    description: 'Business beacons and sponsored pins on Globe',
    type: 'recurring',
    tiers: {
      basic: { price: 4999, priceDisplay: '£49.99/mo', impressions: 10000 },
      pro: { price: 14999, priceDisplay: '£149.99/mo', impressions: 50000 },
      enterprise: { price: 49999, priceDisplay: '£499.99/mo', impressions: 'unlimited' },
    },
    margins: 'high',
  },
  
  // E-commerce (Shopify)
  officialShop: {
    name: 'Official Shop',
    description: 'RAW, HUNG, HIGH clothing sales via Shopify',
    type: 'transaction',
    margins: 'variable',
  },
  
  // HNH MESS Products
  hnhMess: {
    name: 'HNH MESS',
    description: 'Lube brand product sales',
    type: 'transaction',
    margins: 'high',
  },
};

// =============================================================================
// RETENTION MECHANICS
// =============================================================================

export const RETENTION_MECHANICS = {
  // Daily Check-in
  dailyCheckIn: {
    name: 'Daily Check-in',
    description: 'Reward users for opening app daily',
    xpRewards: {
      day1: 10,
      day2: 15,
      day3: 20,
      day4: 25,
      day5: 30,
      day6: 35,
      day7: 100, // Weekly bonus
      day14: 250, // 2-week bonus
      day30: 500, // Monthly bonus
      day90: 1000, // Quarterly bonus
      day365: 5000, // Annual bonus
    },
    streakMultiplier: true,
  },
  
  // XP & Leveling
  xpSystem: {
    name: 'XP & Leveling',
    description: 'Gamified progression system',
    xpPerLevel: 1000,
    maxLevel: 100,
    levelUnlocks: {
      3: ['Secondary Persona', 'Custom Status'],
      5: ['Profile Viewers', 'Read Receipts'],
      7: ['Discovery Priority', 'Advanced Filters'],
      10: ['Custom Badge Color', 'Profile Themes'],
      15: ['Private Events', 'Event Co-Hosting'],
      20: ['Legend Badge', 'Unlimited Personas'],
      50: ['VIP Status', 'Exclusive Events'],
      100: ['Lifetime Legend', 'Custom Everything'],
    },
  },
  
  // Challenges
  challenges: {
    name: 'Challenges',
    description: 'Weekly and monthly challenges',
    types: {
      weekly: {
        examples: ['Scan 5 beacons', 'Message 10 people', 'Attend 1 event'],
        xpReward: { min: 100, max: 500 },
      },
      monthly: {
        examples: ['Top 10% engagement', 'Refer 3 friends', 'Complete profile'],
        xpReward: { min: 500, max: 2000 },
      },
      special: {
        examples: ['Night King Challenge', 'Pride Month', 'Anniversary'],
        xpReward: { min: 1000, max: 10000 },
      },
    },
  },
  
  // Referral Program
  referrals: {
    name: 'Referral Program',
    description: 'Reward users for inviting friends',
    rewards: {
      referrer: { xp: 500, badge: 'Connector' },
      referee: { xp: 100, freeWeekPlus: true },
    },
    tiers: {
      bronze: { referrals: 5, reward: 'Bronze Recruiter Badge' },
      silver: { referrals: 15, reward: 'Silver Recruiter Badge + 1 Month PLUS' },
      gold: { referrals: 50, reward: 'Gold Recruiter Badge + 1 Month CHROME' },
      platinum: { referrals: 100, reward: 'Platinum Badge + Lifetime PLUS' },
    },
  },
  
  // Night King Challenge
  nightKing: {
    name: 'Night King Challenge',
    description: 'Compete for city crown based on activity',
    requirements: ['CHROME membership', 'Level 10+', 'Active Right Now'],
    rewards: {
      crown: 'Night King Crown (24hr)',
      xp: 1000,
      visibility: 'Top of city leaderboard',
    },
    resetFrequency: 'daily',
  },
  
  // Aftercare Nudge
  aftercareNudge: {
    name: 'Aftercare Nudge',
    description: 'Post-meetup check-in for safety and engagement',
    trigger: 'After Right Now expires or event ends',
    options: ['All Good', 'Need a Minute', 'Get Help'],
    xpReward: 25,
  },
  
  // Reactivation
  reactivation: {
    name: 'Win-back Campaigns',
    description: 'Re-engage inactive users',
    triggers: {
      day3: { message: 'Miss you! X new matches waiting', offer: null },
      day7: { message: 'Someone viewed your profile - see who', offer: '50 XP' },
      day14: { message: 'Event this weekend: [Event Name]', offer: '100 XP' },
      day30: { message: 'Your streak was reset, but come back!', offer: '1 Week PLUS Free' },
      day60: { message: 'We\'ve missed you', offer: '1 Month PLUS 50% off' },
    },
  },
};

// =============================================================================
// CALLS TO ACTION (CTAs)
// =============================================================================

export const CTAS = {
  // Primary CTAs
  primary: {
    goLive: {
      text: 'GO LIVE',
      variant: 'hot-gradient',
      icon: 'Zap',
      action: 'right_now_modal',
      context: 'authenticated',
      glow: true,
    },
    getStarted: {
      text: 'GET STARTED FREE',
      variant: 'hot-gradient',
      icon: 'ArrowRight',
      action: 'auth_flow',
      context: 'unauthenticated',
      glow: true,
    },
    browseMatches: {
      text: 'BROWSE MATCHES',
      variant: 'outline',
      icon: 'Users',
      action: 'navigate:/social',
      context: 'authenticated',
    },
    seeMatches: {
      text: 'SEE YOUR MATCHES',
      variant: 'black',
      icon: 'Heart',
      action: 'navigate:/social',
      context: 'authenticated',
    },
  },
  
  // Upgrade CTAs
  upgrade: {
    upgradePlus: {
      text: 'UPGRADE TO PLUS',
      variant: 'hot',
      icon: 'Zap',
      action: 'navigate:/membership?tier=plus',
      badge: '2x XP',
    },
    upgradeChrome: {
      text: 'GO CHROME',
      variant: 'cyan',
      icon: 'Crown',
      action: 'navigate:/membership?tier=pro',
      badge: 'BEST',
    },
    unlockFeature: {
      text: 'UNLOCK FOR {xp} XP',
      variant: 'gold',
      icon: 'Lock',
      action: 'xp_purchase',
    },
  },
  
  // Commerce CTAs
  commerce: {
    addToCart: {
      text: 'ADD TO CART',
      variant: 'hot',
      icon: 'ShoppingBag',
      action: 'add_to_cart',
    },
    buyNow: {
      text: 'BUY NOW',
      variant: 'hot-gradient',
      icon: 'CreditCard',
      action: 'checkout',
    },
    startSelling: {
      text: 'START SELLING',
      variant: 'purple',
      icon: 'Store',
      action: 'navigate:/seller-dashboard',
    },
    shopNow: {
      text: 'SHOP NOW',
      variant: 'outline',
      icon: 'ShoppingBag',
      action: 'navigate:/market',
    },
  },
  
  // Social CTAs
  social: {
    message: {
      text: 'MESSAGE',
      variant: 'hot',
      icon: 'MessageCircle',
      action: 'open_chat',
    },
    follow: {
      text: 'FOLLOW',
      variant: 'outline',
      icon: 'Plus',
      action: 'follow_user',
    },
    rsvp: {
      text: 'RSVP',
      variant: 'cyan',
      icon: 'Calendar',
      action: 'event_rsvp',
    },
    checkIn: {
      text: 'CHECK IN',
      variant: 'lime',
      icon: 'MapPin',
      action: 'beacon_checkin',
    },
  },
  
  // Safety CTAs
  safety: {
    safetyCheckIn: {
      text: 'SET SAFETY CHECK-IN',
      variant: 'cyan',
      icon: 'Shield',
      action: 'safety_checkin',
    },
    getHelp: {
      text: 'GET HELP',
      variant: 'destructive',
      icon: 'Phone',
      action: 'navigate:/care',
    },
    fakeCall: {
      text: 'FAKE CALL',
      variant: 'outline',
      icon: 'Phone',
      action: 'fake_call',
    },
  },
  
  // Engagement CTAs
  engagement: {
    claimXP: {
      text: 'CLAIM {xp} XP',
      variant: 'gold',
      icon: 'Gift',
      action: 'claim_xp',
    },
    viewChallenge: {
      text: 'VIEW CHALLENGE',
      variant: 'purple',
      icon: 'Trophy',
      action: 'navigate:/challenges',
    },
    inviteFriends: {
      text: 'INVITE FRIENDS',
      variant: 'hot',
      icon: 'Users',
      action: 'navigate:/invite',
    },
    listenLive: {
      text: 'LISTEN LIVE',
      variant: 'black',
      icon: 'Radio',
      action: 'play_radio',
    },
  },
};

// =============================================================================
// UNIQUE SELLING POINTS (USPs)
// =============================================================================

export const USPS = {
  // Core Platform USPs
  platform: [
    {
      id: 'global_os',
      headline: 'One Platform. Everything.',
      subline: 'No more app switching. Social, events, shopping, music, safety - all in one.',
      icon: 'Globe',
      color: '#FF1493',
    },
    {
      id: 'ai_matching',
      headline: '87% Match Accuracy',
      subline: '8-dimension AI matching based on real data, not random swiping.',
      icon: 'Brain',
      color: '#00D9FF',
      stat: '87%',
    },
    {
      id: 'right_now',
      headline: 'Zero Ghosting',
      subline: 'Right Now shows who\'s actually available. Real-time. No guessing.',
      icon: 'Zap',
      color: '#39FF14',
    },
    {
      id: 'the_globe',
      headline: 'See The World Live',
      subline: 'Interactive 3D globe showing people, events, and energy worldwide.',
      icon: 'Globe',
      color: '#B026FF',
    },
    {
      id: 'ai_wingman',
      headline: 'AI Wingman',
      subline: 'Conversation starters, match insights, profile optimization - built in.',
      icon: 'Sparkles',
      color: '#FFD700',
    },
    {
      id: 'safety_first',
      headline: 'Safety Built-In',
      subline: 'Check-ins, panic button, fake calls, aftercare. Because care matters.',
      icon: 'Shield',
      color: '#00D9FF',
    },
  ],
  
  // "What We Replace" messaging
  replacements: [
    { app: 'Grindr', replacement: 'HOTMESS Social + Right Now' },
    { app: 'Tinder', replacement: 'HOTMESS AI Matching' },
    { app: 'Eventbrite', replacement: 'HOTMESS Events + Beacons' },
    { app: 'Depop', replacement: 'MESSMARKET' },
    { app: 'StubHub', replacement: 'HOTMESS Ticket Reseller' },
    { app: 'SoundCloud', replacement: 'RAW CONVICT RECORDS' },
    { app: 'OnlyFans', replacement: 'HOTMESS Premium Content' },
    { app: 'Google Maps', replacement: 'HOTMESS Directions' },
    { app: 'Uber', replacement: 'HOTMESS Uber Integration' },
    { app: 'bSafe', replacement: 'HOTMESS Safety System' },
    { app: 'ChatGPT', replacement: 'HOTMESS AI Wingman' },
  ],
  
  // Membership USPs
  membership: {
    plus: [
      '2x XP on everything',
      'Browse anonymously',
      'Unlimited Go Live',
      'No ads ever',
    ],
    chrome: [
      '3x XP multiplier',
      'See who viewed you',
      'Early drop access',
      'Night King eligibility',
    ],
  },
  
  // Commerce USPs
  commerce: [
    {
      id: 'official_brands',
      headline: 'In-House Luxury',
      subline: 'RAW, HUNG, HIGH - Bold clothing designed for you.',
    },
    {
      id: 'messmarket',
      headline: 'Community Marketplace',
      subline: 'Buy from and sell to the community. 10% platform fee only.',
    },
    {
      id: 'xp_rewards',
      headline: 'Earn While You Shop',
      subline: 'Every purchase earns XP. Level up your status.',
    },
  ],
  
  // Safety USPs
  safety: [
    {
      id: 'safety_checkin',
      headline: 'Safety Check-ins',
      subline: 'Set a timer. If you don\'t check in, trusted contacts are alerted.',
    },
    {
      id: 'panic_button',
      headline: 'Panic Button',
      subline: 'One tap. Alert contacts. Share location. Redirect away.',
    },
    {
      id: 'fake_call',
      headline: 'Fake Call',
      subline: 'Need an out? Trigger a fake incoming call. Escape awkward situations.',
    },
    {
      id: 'aftercare',
      headline: 'Aftercare Nudge',
      subline: 'Post-meetup check-in. "You good?" Because we care.',
    },
  ],
};

// =============================================================================
// CONVERSION TRIGGERS
// =============================================================================

export const CONVERSION_TRIGGERS = {
  // Feature gates (prompt upgrade when user hits limit)
  featureGates: {
    goLiveLimit: {
      trigger: 'User tries to Go Live but hit daily limit',
      message: 'Upgrade to PLUS for unlimited Go Live sessions',
      cta: 'UPGRADE TO PLUS',
      tier: 'plus',
    },
    viewerBlur: {
      trigger: 'User views blurred profile viewers',
      message: 'See exactly who viewed you with CHROME',
      cta: 'GO CHROME',
      tier: 'pro',
    },
    stealthMode: {
      trigger: 'User wants to browse anonymously',
      message: 'Browse without being seen. Upgrade to PLUS.',
      cta: 'UPGRADE TO PLUS',
      tier: 'plus',
    },
    advancedFilters: {
      trigger: 'User clicks disabled advanced filter',
      message: 'Unlock advanced filters with PLUS',
      cta: 'UNLOCK FILTERS',
      tier: 'plus',
    },
    premiumContent: {
      trigger: 'User views locked premium content',
      message: 'Unlock with XP or get free access with CHROME',
      cta: 'GO CHROME',
      tier: 'pro',
    },
    nightKing: {
      trigger: 'User tries to enter Night King challenge',
      message: 'Night King is CHROME-only. Upgrade to compete.',
      cta: 'GO CHROME',
      tier: 'pro',
    },
  },
  
  // Contextual prompts
  contextualPrompts: {
    afterMatch: {
      trigger: 'After 5 successful matches',
      message: 'You\'re popular! Get 2x more visibility with PLUS.',
      cta: 'UPGRADE',
    },
    afterPurchase: {
      trigger: 'After first marketplace purchase',
      message: 'Earn 2x XP on all purchases with PLUS.',
      cta: 'DOUBLE YOUR XP',
    },
    afterEvent: {
      trigger: 'After attending first event',
      message: 'Get early access to events with CHROME.',
      cta: 'GO CHROME',
    },
    afterStreak: {
      trigger: 'After 7-day check-in streak',
      message: 'Committed! Maximize your XP with PLUS.',
      cta: 'UPGRADE',
    },
  },
};

// =============================================================================
// PRICING DISPLAY HELPERS
// =============================================================================

export const formatPrice = (pence) => {
  return `£${(pence / 100).toFixed(2)}`;
};

export const calculateSavings = (monthlyPrice, yearlyPrice) => {
  const yearlyMonthlyEquiv = yearlyPrice / 12;
  const savings = ((monthlyPrice - yearlyMonthlyEquiv) / monthlyPrice) * 100;
  return Math.round(savings);
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  MEMBERSHIP_TIERS,
  XP_PACKAGES,
  REVENUE_STREAMS,
  RETENTION_MECHANICS,
  CTAS,
  USPS,
  CONVERSION_TRIGGERS,
  formatPrice,
  calculateSavings,
};
