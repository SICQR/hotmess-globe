/**
 * HOTMESS Lux Design System Components
 * 
 * A brutalist-meets-luxury component library with:
 * - Chrome Red (#C8962C) as primary accent
 * - Gold (#FFD700) for premium elements
 * - Cyan (#00D9FF) for interactive elements
 * - Purple (#C8962C) for creator/music elements
 * - Neon Green (#39FF14) for success states
 * 
 * Features:
 * - LED pulse animations
 * - Gradient hover effects
 * - Bold page transitions
 * - Mobile-first responsive design
 */

// Carousel Components
export {
  LuxCarousel,
  LuxProfileCarousel,
  LuxEventCarousel,
  LuxProductCarousel,
} from './LuxCarousel';

// Video Components
export {
  LuxVideo,
  LuxVideoBackground,
  LuxStoryVideo,
} from './LuxVideo';

// Banner Components
export {
  LuxPageBanner,
  LuxHeroBanner,
  LuxPromoBanner,
  LuxAdBanner,
  LuxFeatureBanner,
} from './LuxBanner';

// Page Transition Components
export {
  PageTransition,
  PageTransitionOverlay,
  usePageTransition,
} from './PageTransition';

// Advertising Components
export {
  LuxAdSlot,
  LuxLeaderboardAd,
  LuxMediumRectangleAd,
  LuxMobileBannerAd,
} from './AdSlot';

// Engagement Components
export {
  LuxLiveCounter,
  LuxActivityFeed,
  LuxStatsCounter,
} from './LiveCounter';

// Timer Components
export {
  LuxCountdownTimer,
  LuxEventCountdown,
  LuxOfferCountdown,
} from './CountdownTimer';

// Re-export defaults for convenience (different names to avoid conflicts)
export { default as Carousel } from './LuxCarousel';
export { default as Video } from './LuxVideo';
export { default as Banner } from './LuxBanner';
export { default as Transition } from './PageTransition';
export { default as AdSlot } from './AdSlot';
export { default as LiveCounter } from './LiveCounter';
export { default as CountdownTimer } from './CountdownTimer';
