/**
 * HOTMESS Comprehensive Pricing & Monetization
 * 
 * All costs, fees, and packages for:
 * - Membership tiers (users)
 * - MESSMARKET sellers & buyers
 * - Ticket resale marketplace
 * - Venue & business advertising packages
 * - Globe visibility & beacon promotions
 */

// =============================================================================
// CURRENCY & REGIONAL PRICING
// =============================================================================

export const CURRENCIES = {
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
};

export const DEFAULT_CURRENCY = 'GBP';

// Regional price multipliers (relative to GBP)
export const REGIONAL_MULTIPLIERS = {
  GBP: 1.0,
  USD: 1.27,
  EUR: 1.17,
  AUD: 1.95,
  CAD: 1.72,
};

// =============================================================================
// MEMBERSHIP TIERS (USER SUBSCRIPTIONS)
// =============================================================================

export const MEMBERSHIP_TIERS = {
  FREE: {
    id: 'free',
    name: 'FREE',
    tagline: 'Get started for nothing',
    price: { monthly: 0, yearly: 0 },
    color: '#FFFFFF',
    features: [
      { name: 'Browse profiles', included: true },
      { name: 'Basic matching', included: true },
      { name: 'Send messages', included: true, limit: '50/day' },
      { name: 'Go Live (Right Now)', included: true, limit: '1x/day' },
      { name: 'View events', included: true },
      { name: 'Basic filters', included: true },
      { name: 'Standard visibility', included: true },
      { name: 'Ads shown', included: true, negative: true },
      { name: 'See who viewed you', included: false },
      { name: 'Stealth mode', included: false },
      { name: 'Advanced filters', included: false },
      { name: 'Priority support', included: false },
    ],
    limits: {
      messagesPerDay: 50,
      goLivePerDay: 1,
      photosInProfile: 6,
      boostsIncluded: 0,
      superLikesPerDay: 1,
    },
  },

  PLUS: {
    id: 'plus',
    name: 'PLUS',
    tagline: 'Unlock the full experience',
    price: { 
      monthly: 9.99, 
      yearly: 79.99, // 33% savings
      savings: '33%',
    },
    color: '#C8962C',
    popular: true,
    features: [
      { name: 'Everything in FREE', included: true },
      { name: 'Unlimited messages', included: true },
      { name: 'Unlimited Go Live', included: true },
      { name: '2x profile visibility', included: true },
      { name: 'See who viewed you', included: true },
      { name: 'See blurred viewers', included: true },
      { name: 'Advanced filters', included: true },
      { name: 'Filter presets', included: true },
      { name: 'Stealth/Anonymous mode', included: true },
      { name: 'Read receipts', included: true },
      { name: 'Ad-free experience', included: true },
      { name: '3 Boosts/month included', included: true },
      { name: 'Priority in Right Now', included: true },
      { name: '🎙️ 10% off radio ads (sellers/creators)', included: true },
      { name: 'Night King eligibility', included: false },
      { name: 'Early access to drops', included: false },
    ],
    limits: {
      messagesPerDay: Infinity,
      goLivePerDay: Infinity,
      photosInProfile: 12,
      boostsIncluded: 3,
      superLikesPerDay: 5,
    },
    radioPerks: {
      discount: 0.10,
      description: '10% off all radio advertising packages',
    },
  },

  CHROME: {
    id: 'chrome',
    name: 'CHROME',
    tagline: 'The ultimate HOTMESS experience',
    price: { 
      monthly: 19.99, 
      yearly: 149.99, // 37% savings
      savings: '37%',
    },
    color: '#FFD700',
    premium: true,
    features: [
      { name: 'Everything in PLUS', included: true },
      { name: '5x profile visibility', included: true },
      { name: 'See exact profile viewers', included: true },
      { name: 'Night King eligibility', included: true },
      { name: 'Early access to drops', included: true },
      { name: 'Exclusive CHROME badge', included: true },
      { name: 'Custom profile themes', included: true },
      { name: 'Priority support (24hr)', included: true },
      { name: 'Free premium content unlocks', included: true, limit: '3/month' },
      { name: '10 Boosts/month included', included: true },
      { name: 'Unlimited Super Likes', included: true },
      { name: 'VIP event access', included: true },
      { name: 'Verified badge priority', included: true },
      { name: '🎙️ 20 free radio pre-rolls/month', included: true },
      { name: '🎙️ 25% off all radio packages', included: true },
    ],
    limits: {
      messagesPerDay: Infinity,
      goLivePerDay: Infinity,
      photosInProfile: 24,
      boostsIncluded: 10,
      superLikesPerDay: Infinity,
      premiumUnlocksIncluded: 3,
    },
    radioPerks: {
      preRollCredits: 20,
      discount: 0.25,
      description: '20 free pre-roll ads/month + 25% off all radio packages',
    },
  },
};

// =============================================================================
// MESSMARKET - SELLER FEES & PACKAGES
// =============================================================================

export const MESSMARKET_SELLER = {
  // Platform commission on sales
  commission: {
    standard: {
      rate: 0.10, // 10%
      description: 'Standard seller commission',
      applies: 'All sales',
    },
    verified: {
      rate: 0.08, // 8%
      description: 'Verified seller discount',
      applies: 'After verification approval',
      requirements: ['ID verification', '10+ completed sales', '4.5+ rating'],
    },
    volume: {
      rate: 0.07, // 7%
      description: 'High-volume seller rate',
      applies: 'Monthly sales > £5,000',
    },
  },

  // Listing fees
  listings: {
    free: {
      name: 'Free Listings',
      price: 0,
      limit: 10,
      description: 'Up to 10 active listings at no cost',
    },
    unlimited: {
      name: 'Unlimited Listings',
      price: { monthly: 4.99 },
      limit: Infinity,
      description: 'List as many products as you want',
    },
  },

  // Seller packages
  packages: {
    starter: {
      id: 'seller-starter',
      name: 'Starter Seller',
      price: 0,
      features: [
        '10 free listings',
        '10% commission',
        'Basic seller dashboard',
        'Standard payout (7 days)',
        'Email support',
      ],
      radioPerks: null,
    },
    pro: {
      id: 'seller-pro',
      name: 'Pro Seller',
      price: { monthly: 14.99, yearly: 119.99 },
      popular: true,
      features: [
        'Unlimited listings',
        '8% commission (after verification)',
        'Advanced analytics',
        'Featured seller badge',
        'Fast payout (3 days)',
        'Priority support',
        '3 listing boosts/month',
        'Bulk listing tools',
        '🎙️ 50 radio pre-roll ads/month',
        '🎙️ 10% off radio ad packages',
      ],
      radioPerks: {
        preRollCredits: 50,
        discount: 0.10,
        liveReads: 0,
      },
    },
    business: {
      id: 'seller-business',
      name: 'Business Seller',
      price: { monthly: 49.99, yearly: 399.99 },
      features: [
        'Everything in Pro',
        '7% commission',
        'Instant payouts',
        'Dedicated account manager',
        'API access',
        'Multi-user accounts',
        'Custom storefront branding',
        '10 listing boosts/month',
        'Globe storefront pin',
        'Priority customer disputes',
        '🎙️ 200 radio pre-roll ads/month',
        '🎙️ 2 live DJ reads/month',
        '🎙️ 20% off radio ad packages',
        '🎙️ Priority ad scheduling',
      ],
      radioPerks: {
        preRollCredits: 200,
        discount: 0.20,
        liveReads: 2,
        priorityScheduling: true,
      },
    },
  },

  // Promotional add-ons for sellers
  promotions: {
    listingBoost: {
      name: 'Listing Boost',
      description: 'Push your listing to the top for 24 hours',
      price: 2.99,
      duration: '24 hours',
      xpCost: 500,
    },
    featuredListing: {
      name: 'Featured Listing',
      description: 'Appear in the Featured section for 7 days',
      price: 9.99,
      duration: '7 days',
      xpCost: 1500,
    },
    homepageBanner: {
      name: 'Homepage Banner',
      description: 'Banner ad on MESSMARKET homepage',
      price: 29.99,
      duration: '7 days',
    },
    globePin: {
      name: 'Globe Storefront Pin',
      description: 'Your store appears as a pin on the Globe',
      price: 19.99,
      duration: '30 days',
    },
  },
};

// =============================================================================
// MESSMARKET - BUYER COSTS
// =============================================================================

export const MESSMARKET_BUYER = {
  // No listing fees for buyers - just purchase price + optional protections
  
  fees: {
    platformFee: {
      rate: 0, // No platform fee for buyers
      description: 'No extra fees - price is what you pay',
    },
    paymentProcessing: {
      rate: 0, // Absorbed by seller
      description: 'Payment processing included',
    },
  },

  // Optional buyer protections
  protections: {
    standard: {
      name: 'Standard Protection',
      price: 0,
      included: true,
      coverage: [
        'Escrow-protected payment',
        'Item not received refund',
        'Significantly not as described refund',
        '14-day dispute window',
      ],
    },
    premium: {
      name: 'Premium Protection',
      priceRate: 0.05, // 5% of item price
      minPrice: 1.99,
      maxPrice: 9.99,
      coverage: [
        'Everything in Standard',
        'Extended 30-day dispute window',
        'Return shipping covered',
        'Priority dispute resolution',
        'Authentication for high-value items',
      ],
    },
  },

  // XP rewards for buyers
  xpRewards: {
    purchase: 1, // 1 XP per £1 spent
    review: 25, // 25 XP for leaving a review
    firstPurchase: 100, // Bonus for first MESSMARKET purchase
    repeatBuyer: 50, // Bonus every 5th purchase
  },
};

// =============================================================================
// TICKET RESALE MARKETPLACE
// =============================================================================

export const TICKET_RESALE = {
  // Seller fees
  seller: {
    commission: {
      rate: 0.10, // 10% of sale price
      description: 'Platform fee on ticket sales',
    },
    listingFee: {
      price: 0, // Free to list
      description: 'No upfront listing cost',
    },
    payoutTime: '24-48 hours after event',
  },

  // Buyer fees
  buyer: {
    serviceFee: {
      rate: 0.025, // 2.5%
      minFee: 0.99,
      maxFee: 14.99,
      description: 'Buyer protection & verification fee',
    },
    protection: {
      name: 'Ticket Guarantee',
      included: true,
      coverage: [
        'Verified authentic tickets',
        'Full refund if ticket invalid',
        'Full refund if event cancelled',
        'Replacement ticket if available',
      ],
    },
  },

  // Price caps to prevent scalping
  priceCaps: {
    enabled: true,
    maxMarkup: 1.5, // Maximum 50% above face value
    description: 'Tickets cannot be listed above 150% of face value',
    exceptions: ['Sold out events', 'Charity listings'],
  },

  // Seller tiers
  sellerTiers: {
    casual: {
      name: 'Casual Reseller',
      limit: 10, // Max 10 tickets/month
      commission: 0.10,
    },
    verified: {
      name: 'Verified Reseller',
      limit: 50,
      commission: 0.08,
      requirements: ['ID verification', '5+ successful sales'],
    },
    professional: {
      name: 'Professional Reseller',
      limit: Infinity,
      commission: 0.06,
      price: { monthly: 29.99 },
      features: [
        'Unlimited listings',
        '6% commission',
        'Bulk upload tools',
        'Analytics dashboard',
        'Priority payouts',
      ],
    },
  },
};

// =============================================================================
// VENUE & BUSINESS ADVERTISING PACKAGES
// =============================================================================

export const VENUE_PACKAGES = {
  // Basic venue presence
  basic: {
    id: 'venue-basic',
    name: 'Basic Venue',
    price: 0,
    features: [
      'Venue listing in directory',
      'Basic profile page',
      'Event posting (3/month)',
      'User check-ins enabled',
      'Basic analytics',
    ],
    globe: {
      visible: false,
      beacon: false,
    },
  },

  // Standard venue package
  standard: {
    id: 'venue-standard',
    name: 'Venue Standard',
    price: { monthly: 49.99, yearly: 479.99 },
    popular: true,
    features: [
      'Everything in Basic',
      'Unlimited event posting',
      'Globe visibility (static pin)',
      'Detailed analytics',
      'Promotional tools',
      'QR beacon (1 included)',
      'Push notifications to nearby users',
      'Featured in local listings',
    ],
    globe: {
      visible: true,
      beacon: true,
      beaconsIncluded: 1,
      pinStyle: 'standard',
    },
  },

  // Premium venue package
  premium: {
    id: 'venue-premium',
    name: 'Venue Premium',
    price: { monthly: 149.99, yearly: 1199.99 },
    features: [
      'Everything in Standard',
      'Animated Globe beacon',
      '5 QR beacons included',
      'Homepage banner (1 week/month)',
      'Priority event placement',
      'Custom venue page branding',
      'API integration',
      'Dedicated success manager',
      'Exclusive venue badge',
      'In-app push campaigns',
      'Real-time capacity display',
    ],
    globe: {
      visible: true,
      beacon: true,
      beaconsIncluded: 5,
      pinStyle: 'animated',
      pulseEffect: true,
    },
  },

  // Enterprise for chains/groups
  enterprise: {
    id: 'venue-enterprise',
    name: 'Venue Enterprise',
    price: 'Custom',
    contactSales: true,
    features: [
      'Everything in Premium',
      'Multi-location management',
      'Custom integrations',
      'White-label options',
      'Unlimited beacons',
      'Custom Globe animations',
      'Priority support SLA',
      'Quarterly business reviews',
      'Co-marketing opportunities',
    ],
    globe: {
      visible: true,
      beacon: true,
      beaconsIncluded: Infinity,
      pinStyle: 'custom',
      pulseEffect: true,
      customAnimation: true,
    },
  },
};

// =============================================================================
// GLOBE ADVERTISING & BEACON PROMOTIONS
// =============================================================================

export const GLOBE_ADVERTISING = {
  // Beacon types and pricing
  beacons: {
    standard: {
      name: 'Standard Beacon',
      description: 'Static pin on the Globe',
      price: { daily: 4.99, weekly: 24.99, monthly: 79.99 },
      features: [
        'Visible on Globe',
        'Click-through to your page',
        'Basic analytics',
      ],
      visual: {
        size: 'small',
        animation: 'none',
        glow: false,
      },
    },
    enhanced: {
      name: 'Enhanced Beacon',
      description: 'Animated beacon with glow effect',
      price: { daily: 9.99, weekly: 49.99, monthly: 149.99 },
      popular: true,
      features: [
        'Animated pulse effect',
        'Glow ring',
        'Priority placement',
        'Detailed analytics',
        'Custom icon option',
      ],
      visual: {
        size: 'medium',
        animation: 'pulse',
        glow: true,
      },
    },
    premium: {
      name: 'Premium Beacon',
      description: 'Maximum visibility with special effects',
      price: { daily: 19.99, weekly: 99.99, monthly: 299.99 },
      features: [
        'Large animated beacon',
        'Rainbow/custom glow',
        'Top-tier placement',
        'Activity stream mentions',
        'Push notification option',
        'Full analytics suite',
        'A/B testing',
      ],
      visual: {
        size: 'large',
        animation: 'premium',
        glow: true,
        particles: true,
      },
    },
  },

  // Banner advertising
  banners: {
    homepageTakeover: {
      name: 'Homepage Takeover',
      description: 'Full-width banner on homepage',
      price: { daily: 99.99, weekly: 499.99 },
      placement: 'homepage-hero',
      dimensions: '1200x300',
      impressions: '~50,000/day',
    },
    globeOverlay: {
      name: 'Globe Overlay',
      description: 'Banner overlay on Globe page',
      price: { daily: 79.99, weekly: 399.99 },
      placement: 'globe-bottom',
      dimensions: '728x90',
      impressions: '~30,000/day',
    },
    eventsBanner: {
      name: 'Events Banner',
      description: 'Featured banner on Events page',
      price: { daily: 49.99, weekly: 249.99 },
      placement: 'events-top',
      dimensions: '728x90',
      impressions: '~20,000/day',
    },
    marketplaceBanner: {
      name: 'Marketplace Banner',
      description: 'Banner on MESSMARKET',
      price: { daily: 39.99, weekly: 199.99 },
      placement: 'market-top',
      dimensions: '728x90',
      impressions: '~15,000/day',
    },
    inFeedNative: {
      name: 'In-Feed Native Ad',
      description: 'Native ad in discovery feed',
      price: { perImpression: 0.02, minSpend: 50 },
      placement: 'discovery-feed',
      format: 'native-card',
    },
  },

  // Sponsored content
  sponsored: {
    featuredEvent: {
      name: 'Featured Event',
      description: 'Top placement in Events listings',
      price: { daily: 29.99, weekly: 149.99 },
      features: [
        '"Sponsored" badge',
        'Top of event listings',
        'Push notification blast',
        'Globe beacon included',
      ],
    },
    featuredProfile: {
      name: 'Featured Business Profile',
      description: 'Promoted in discovery',
      price: { daily: 19.99, weekly: 99.99 },
      features: [
        'Boosted visibility',
        'Featured section placement',
        'Analytics dashboard',
      ],
    },
    pushCampaign: {
      name: 'Push Notification Campaign',
      description: 'Send push notifications to target users',
      price: { perNotification: 0.05, minCampaign: 100 },
      targeting: ['Location', 'Interests', 'Age range', 'Activity level'],
    },
  },
};

// =============================================================================
// RADIO ADVERTISING PACKAGES
// =============================================================================

export const RADIO_ADVERTISING = {
  // Sponsorship packages
  sponsorship: {
    showSponsor: {
      name: 'Show Sponsorship',
      description: 'Exclusive sponsor of a weekly radio show',
      price: { weekly: 199.99, monthly: 699.99, quarterly: 1799.99 },
      features: [
        '"Brought to you by..." mentions (3x per show)',
        'Logo on show artwork',
        'Social media mentions',
        'Show page branding',
        'Pre-roll audio ad (30 sec)',
        'Post-roll audio ad (30 sec)',
        'Analytics dashboard',
      ],
      reach: '~5,000-15,000 listeners per show',
    },
    dayPartSponsor: {
      name: 'Day Part Sponsorship',
      description: 'Sponsor all shows during a time slot',
      price: { weekly: 499.99, monthly: 1499.99 },
      slots: ['Morning (6am-12pm)', 'Afternoon (12pm-6pm)', 'Prime Time (6pm-12am)', 'Late Night (12am-6am)'],
      features: [
        'All shows in time slot',
        'Rotating audio ads',
        'Priority placement',
        'Exclusive category (no competitor ads)',
        'Weekly performance reports',
      ],
      reach: '~20,000-50,000 listeners per week',
    },
    stationSponsor: {
      name: 'Station Sponsorship',
      description: 'Premier station-wide sponsorship',
      price: { monthly: 2999.99, quarterly: 7999.99 },
      features: [
        'Premier partner status',
        'All day parts included',
        'Homepage radio banner',
        'Event co-branding opportunities',
        'Custom jingle production',
        'Dedicated account manager',
        'Quarterly strategy sessions',
        'First right of refusal on new shows',
      ],
      reach: '~100,000+ listeners per month',
    },
  },

  // Ad spots
  adSpots: {
    preRoll: {
      name: 'Pre-Roll Ad',
      description: 'Audio ad before show starts',
      duration: '30 seconds',
      price: { perPlay: 0.05, package100: 39.99, package500: 174.99, package1000: 299.99 },
      minBuy: 100,
    },
    midRoll: {
      name: 'Mid-Roll Ad',
      description: 'Audio ad during show break',
      duration: '60 seconds',
      price: { perPlay: 0.08, package100: 64.99, package500: 299.99, package1000: 549.99 },
      minBuy: 100,
      premium: true,
    },
    postRoll: {
      name: 'Post-Roll Ad',
      description: 'Audio ad after show ends',
      duration: '30 seconds',
      price: { perPlay: 0.03, package100: 24.99, package500: 109.99, package1000: 199.99 },
      minBuy: 100,
    },
    liveRead: {
      name: 'Live Read',
      description: 'DJ reads your ad copy live on air',
      duration: '30-60 seconds',
      price: { perRead: 49.99, package5: 199.99, package10: 349.99 },
      features: [
        'Authentic DJ endorsement',
        'Custom script approval',
        'Natural integration',
        'Higher engagement rates',
      ],
      premium: true,
    },
  },

  // Special placements
  specialPlacements: {
    takeover: {
      name: 'Radio Takeover',
      description: 'Full station takeover for your brand',
      price: { hourly: 299.99, halfDay: 999.99, fullDay: 1799.99 },
      features: [
        'All ad slots during period',
        'Custom DJ shoutouts',
        'Branded "now playing" overlay',
        'Social media blast',
        'Globe beacon activation',
        'Push notification to listeners',
      ],
      availability: 'Limited - book 2 weeks ahead',
    },
    eventBroadcast: {
      name: 'Event Broadcast Sponsor',
      description: 'Sponsor a live event broadcast',
      price: { perEvent: 499.99 },
      features: [
        'Exclusive event sponsor',
        'On-air mentions throughout',
        'Logo on stream overlay',
        'Social coverage',
        'Recording rights for your use',
      ],
    },
    podcastSponsor: {
      name: 'Podcast Episode Sponsor',
      description: 'Sponsor a podcast/recorded show',
      price: { perEpisode: 149.99, series6: 749.99, series12: 1299.99 },
      features: [
        'Permanent ad in episode',
        'Show notes link',
        'Evergreen exposure',
        'Download analytics',
      ],
    },
  },

  // Production services
  production: {
    jingleProduction: {
      name: 'Custom Jingle',
      description: 'Professional jingle produced by SMASH DADDYS',
      price: { basic: 299.99, premium: 599.99, full: 999.99 },
      tiers: {
        basic: '15-second jingle, 2 revisions',
        premium: '30-second jingle, 3 revisions, multiple versions',
        full: '60-second full production, unlimited revisions, full rights',
      },
      turnaround: '5-10 business days',
    },
    voiceOver: {
      name: 'Professional Voice Over',
      description: 'Professional VO for your ad',
      price: { thirtySecond: 79.99, sixtySecond: 129.99 },
      includes: ['Script consultation', '2 revisions', 'Multiple formats'],
    },
    adCopywriting: {
      name: 'Ad Copywriting',
      description: 'Professional radio ad script',
      price: 49.99,
      includes: ['Research', 'Script draft', '2 revisions', 'Timing optimization'],
    },
  },

  // Targeting options
  targeting: {
    geographic: {
      name: 'Geographic Targeting',
      description: 'Target listeners in specific regions',
      surcharge: 0.15, // 15% premium
      options: ['UK', 'Europe', 'North America', 'Global'],
    },
    showGenre: {
      name: 'Genre Targeting',
      description: 'Target specific music genres',
      surcharge: 0.10, // 10% premium
      options: ['House', 'Techno', 'Pop', 'Underground', 'Chill', 'Peak Time'],
    },
    timeSlot: {
      name: 'Time Slot Targeting',
      description: 'Target specific listening times',
      surcharge: 0, // Included in day part pricing
      options: ['Morning', 'Afternoon', 'Prime Time', 'Late Night', 'Weekend'],
    },
  },

  // Cross-platform benefits (sellers, creators, members)
  crossPlatformPerks: {
    sellers: {
      starter: null,
      pro: {
        preRollCredits: 50,
        discount: 0.10,
        features: ['50 pre-roll ads/month', '10% off all packages'],
      },
      business: {
        preRollCredits: 200,
        liveReads: 2,
        discount: 0.20,
        priorityScheduling: true,
        features: ['200 pre-roll ads/month', '2 live DJ reads/month', '20% off all packages', 'Priority scheduling'],
      },
    },
    creators: {
      standard: null,
      verified: {
        preRollCredits: 25,
        discount: 0.10,
        features: ['25 pre-roll ads/month', '10% off packages'],
      },
      partner: {
        preRollCredits: 100,
        midRollCredits: 20,
        liveReads: 1,
        discount: 0.25,
        showFeature: true,
        features: ['100 pre-rolls/month', '20 mid-rolls/month', '1 live read/month', '25% off', 'Show feature eligibility'],
      },
    },
    members: {
      free: null,
      plus: {
        discount: 0.10,
        features: ['10% off radio ads when selling/creating'],
      },
      chrome: {
        preRollCredits: 20,
        discount: 0.25,
        features: ['20 free pre-rolls/month', '25% off all radio packages'],
      },
    },
  },

  // Packages / bundles
  packages: {
    starter: {
      id: 'radio-starter',
      name: 'Radio Starter',
      price: 199.99,
      description: 'Perfect for first-time radio advertisers',
      includes: [
        '100 pre-roll plays',
        '50 post-roll plays',
        'Basic analytics',
        'Ad copy consultation',
      ],
      savings: '20%',
    },
    growth: {
      id: 'radio-growth',
      name: 'Radio Growth',
      price: 599.99,
      popular: true,
      description: 'Best value for growing brands',
      includes: [
        '500 pre-roll plays',
        '200 mid-roll plays',
        '5 live reads',
        'Custom 15-sec jingle',
        'Full analytics dashboard',
        'Monthly strategy call',
      ],
      savings: '30%',
    },
    premium: {
      id: 'radio-premium',
      name: 'Radio Premium',
      price: 1499.99,
      description: 'Maximum impact campaign',
      includes: [
        '1 week show sponsorship',
        '1000 pre-roll plays',
        '500 mid-roll plays',
        '10 live reads',
        'Custom 30-sec jingle',
        'Globe beacon (1 week)',
        'Push notification campaign',
        'Dedicated account manager',
      ],
      savings: '40%',
    },
  },
};

// =============================================================================
// XP PURCHASE PACKAGES
// =============================================================================

export const XP_PACKAGES = [
  {
    id: 'xp-starter',
    name: 'Starter',
    xp: 500,
    price: 4.99,
    bonus: 0,
    popular: false,
  },
  {
    id: 'xp-popular',
    name: 'Popular',
    xp: 1100, // 1000 + 10% bonus
    price: 9.99,
    bonus: 0.10,
    popular: true,
  },
  {
    id: 'xp-value',
    name: 'Value',
    xp: 2750, // 2500 + 10% bonus
    price: 19.99,
    bonus: 0.10,
    popular: false,
  },
  {
    id: 'xp-pro',
    name: 'Pro',
    xp: 6000, // 5000 + 20% bonus
    price: 34.99,
    bonus: 0.20,
    popular: false,
  },
  {
    id: 'xp-ultimate',
    name: 'Ultimate',
    xp: 15000, // 12500 + 20% bonus
    price: 79.99,
    bonus: 0.20,
    popular: false,
  },
];

// =============================================================================
// PREMIUM CONTENT CREATOR FEES
// =============================================================================

export const CREATOR_FEES = {
  // Platform take on creator earnings
  commission: {
    standard: {
      rate: 0.20, // 20%
      description: 'Standard creator commission',
      radioPerks: null,
    },
    verified: {
      rate: 0.15, // 15%
      requirements: ['ID verification', '100+ subscribers', '£500+ earnings'],
      radioPerks: {
        preRollCredits: 25,
        discount: 0.10,
        description: '25 radio pre-rolls/month + 10% off packages',
      },
    },
    partner: {
      rate: 0.10, // 10%
      requirements: ['Partner program acceptance', '1000+ subscribers'],
      radioPerks: {
        preRollCredits: 100,
        midRollCredits: 20,
        liveReads: 1,
        discount: 0.25,
        showFeature: true,
        description: '100 pre-rolls + 20 mid-rolls + 1 live read/month + 25% off + show feature eligibility',
      },
    },
  },

  // Subscription tiers creators can set
  subscriptionTiers: {
    min: 2.99,
    max: 49.99,
    suggested: [4.99, 9.99, 14.99, 24.99],
  },

  // One-time content unlock pricing
  contentUnlocks: {
    min: 0.99,
    max: 99.99,
    platformFee: 0.20, // 20% on unlocks
  },

  // Tips/donations
  tips: {
    min: 0.99,
    platformFee: 0.10, // 10% on tips (lower to encourage tipping)
  },

  // Payout thresholds
  payouts: {
    minPayout: 20, // Minimum £20 to withdraw
    payoutSchedule: 'Weekly (Fridays)',
    methods: ['Bank transfer', 'PayPal'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price with currency symbol
 */
export function formatPrice(amount, currency = DEFAULT_CURRENCY) {
  const curr = CURRENCIES[currency] || CURRENCIES.GBP;
  if (amount === 0) return 'Free';
  if (amount === 'Custom') return 'Contact Sales';
  return `${curr.symbol}${amount.toFixed(2)}`;
}

/**
 * Calculate regional price
 */
export function getRegionalPrice(basePrice, currency) {
  const multiplier = REGIONAL_MULTIPLIERS[currency] || 1;
  return basePrice * multiplier;
}

/**
 * Calculate seller earnings after commission
 */
export function calculateSellerEarnings(salePrice, commissionRate = 0.10) {
  const commission = salePrice * commissionRate;
  return {
    salePrice,
    commission,
    earnings: salePrice - commission,
    commissionRate: `${(commissionRate * 100).toFixed(0)}%`,
  };
}

/**
 * Calculate ticket resale fees
 */
export function calculateTicketFees(ticketPrice, faceValue = null) {
  const sellerCommission = ticketPrice * TICKET_RESALE.seller.commission.rate;
  const buyerFee = Math.min(
    Math.max(ticketPrice * TICKET_RESALE.buyer.serviceFee.rate, TICKET_RESALE.buyer.serviceFee.minFee),
    TICKET_RESALE.buyer.serviceFee.maxFee
  );
  
  return {
    ticketPrice,
    faceValue,
    sellerCommission,
    sellerEarnings: ticketPrice - sellerCommission,
    buyerFee,
    buyerTotal: ticketPrice + buyerFee,
    withinPriceCap: faceValue ? ticketPrice <= faceValue * TICKET_RESALE.priceCaps.maxMarkup : true,
  };
}

/**
 * Get membership tier by ID
 */
export function getMembershipTier(tierId) {
  return MEMBERSHIP_TIERS[tierId?.toUpperCase()] || MEMBERSHIP_TIERS.FREE;
}

/**
 * Compare membership features
 */
export function compareMemberships() {
  const allFeatures = new Set();
  Object.values(MEMBERSHIP_TIERS).forEach(tier => {
    tier.features.forEach(f => allFeatures.add(f.name));
  });

  return Array.from(allFeatures).map(feature => ({
    feature,
    FREE: MEMBERSHIP_TIERS.FREE.features.find(f => f.name === feature)?.included || false,
    PLUS: MEMBERSHIP_TIERS.PLUS.features.find(f => f.name === feature)?.included || false,
    CHROME: MEMBERSHIP_TIERS.CHROME.features.find(f => f.name === feature)?.included || false,
  }));
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  CURRENCIES,
  MEMBERSHIP_TIERS,
  MESSMARKET_SELLER,
  MESSMARKET_BUYER,
  TICKET_RESALE,
  VENUE_PACKAGES,
  GLOBE_ADVERTISING,
  XP_PACKAGES,
  CREATOR_FEES,
  formatPrice,
  getRegionalPrice,
  calculateSellerEarnings,
  calculateTicketFees,
  getMembershipTier,
  compareMemberships,
};
