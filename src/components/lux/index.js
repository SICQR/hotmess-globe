/**
 * HOTMESS Lux Design System Components
 * 
 * A brutalist-meets-luxury component library with:
 * - Chrome Red (#FF1493) as primary accent
 * - Gold (#FFD700) for premium elements
 * - Cyan (#00D9FF) for interactive elements
 * - Purple (#B026FF) for creator/music elements
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

// Re-export default for convenience
export { default as Carousel } from './LuxCarousel';
export { default as Video } from './LuxVideo';
export { default as Banner } from './LuxBanner';
