/**
 * LUX BRUTALIST Component Library
 * HOTMESS Chrome Luxury Design Language
 * 
 * Core Principles:
 * - No rounded corners (brutal edges)
 * - HOTMESS palette: Ink (#0D0D0D), Paper (#FAFAFA), Hot Pink (#FF1493), Cyan (#00D9FF), Gold (#FFD700)
 * - Typography: Bebas Neue (display), Inter (body), Space Mono (data)
 * - Chrome glow accents
 * - Bold page transitions (wipe, shutter, split)
 * - Filing cabinet navigation
 * - Corner tear interactions
 * - Swipe gestures
 */

// Page Transitions
export { 
  PageTransition, 
  LEDOverlay, 
  TransitionOverlay 
} from './PageTransition';

// Swipe & Gesture Handling
export { 
  SwipeableView, 
  CornerTear, 
  SwipeableCardStack, 
  HorizontalSwiper 
} from './SwipeHandler';

// Filing Cabinet Navigation
export { 
  FilingTabs, 
  BottomFilingTabs, 
  FilingDrawer 
} from './FilingTabs';

// Modals & Overlays
export { 
  LuxModal, 
  LuxConfirm, 
  LuxActionSheet, 
  LuxToast 
} from './LuxModal';

// Scroll Interactions
export { 
  ScrollProgress, 
  ScrollReveal, 
  ScrollStagger, 
  Parallax, 
  StickySection, 
  PullToRefresh, 
  ScrollSnapContainer, 
  ScrollSnapSection, 
  InfiniteScrollTrigger 
} from './LuxScroll';

// Call-to-Actions
export { 
  HeroCTA, 
  QuickActionBar, 
  FloatingAction, 
  InlineCTA, 
  BannerCTA 
} from './LuxCTA';

// Carousel Components
export { 
  LuxCarousel, 
  LuxCarouselSlide, 
  LuxHorizontalCarousel 
} from './LuxCarousel';

// Video Components
export { 
  LuxVideo, 
  LuxVideoBackground 
} from './LuxVideo';

// Banner Components
export { 
  LuxAnnouncementBanner, 
  LuxHeroBanner, 
  LuxPromoBanner, 
  LuxAdBanner,
  CountdownTimer 
} from './LuxBanner';

// Live & Real-time Components
export { 
  LiveCounter, 
  LiveOnlineCounter, 
  LiveViewerCounter, 
  ActivityPulse 
} from './LiveCounter';

// Advertising Components
export { 
  AdSlot, 
  AdBanner, 
  SponsoredContent 
} from './AdSlot';

// Re-export transition wrapper
export { default as PageTransitionWrapper } from './PageTransition';
