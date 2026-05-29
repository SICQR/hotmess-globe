import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LuxCarousel,
  LuxProfileCarousel,
  LuxEventCarousel,
  LuxProductCarousel,
  LuxVideo,
  LuxPageBanner,
  LuxHeroBanner,
  LuxPromoBanner,
  LuxAdSlot,
  LuxLiveCounter,
  LuxCountdownTimer,
} from '@/components/lux';
import { Zap, Heart, Users, TrendingUp } from 'lucide-react';

/**
 * LuxShowcase - Demo page showcasing all Lux design system components
 * This is for testing and demonstration purposes
 */
export default function LuxShowcase() {
  const [liveCount, setLiveCount] = useState(247);

  // Sample data for carousels
  const heroSlides = [
    {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1920',
      title: 'GO LIVE NOW',
      subtitle: 'RIGHT NOW FEATURE',
      description: '247 people are live right now',
      cta: 'GO LIVE',
      ctaHref: '/pulse',
    },
    {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920',
      title: 'TONIGHT',
      subtitle: 'FEATURED EVENT',
      description: 'The hottest party in London',
      cta: 'GET TICKETS',
      ctaHref: '/events',
    },
    {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920',
      title: 'NEW DROP',
      subtitle: 'MARKETPLACE',
      description: 'Exclusive HOTMESS merchandise',
      cta: 'SHOP NOW',
      ctaHref: '/market',
    },
  ];

  const profiles = [
    {
      id: 1,
      name: 'Alex',
      subtitle: '2.3km away',
      image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
      badge: '87% MATCH',
      isOnline: true,
    },
    {
      id: 2,
      name: 'Sam',
      subtitle: '0.5km away',
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      badge: '92% MATCH',
      isOnline: true,
    },
    {
      id: 3,
      name: 'Jordan',
      subtitle: '1.2km away',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      badge: '78% MATCH',
      isOnline: false,
    },
    {
      id: 4,
      name: 'Morgan',
      subtitle: '3.1km away',
      image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
      badge: '95% MATCH',
      isOnline: true,
    },
  ];

  const events = [
    {
      id: 1,
      title: 'Underground Rave',
      venue: 'Warehouse District',
      date: 'TONIGHT 11PM',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      isLive: false,
    },
    {
      id: 2,
      title: 'Pride Party',
      venue: 'Heaven Nightclub',
      date: 'SAT 10PM',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
      isLive: true,
    },
    {
      id: 3,
      title: 'House Music Session',
      venue: 'Ministry of Sound',
      date: 'FRI 9PM',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
      isLive: false,
    },
  ];

  const products = [
    {
      id: 1,
      name: 'HOTMESS Tee',
      price: '£25',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      onSale: true,
    },
    {
      id: 2,
      name: 'Pride Pin Set',
      price: '£12',
      image: 'https://images.unsplash.com/photo-1610003556171-a5f4c1aa0e82?w=400',
      onSale: false,
    },
    {
      id: 3,
      name: 'Mesh Crop Top',
      price: '£35',
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
      onSale: false,
    },
    {
      id: 4,
      name: 'Festival Pack',
      price: '£50',
      image: 'https://images.unsplash.com/photo-1585394523821-501be3e8ec72?w=400',
      onSale: true,
    },
  ];

  const stats = [
    { value: '87%', label: 'Match Rate', description: 'AI-Powered' },
    { value: '247', label: 'Online Now', description: 'In Your Area' },
    { value: '8D', label: 'Compatibility', description: 'Dimensions' },
    { value: '0%', label: 'Ghosting', description: 'Guaranteed' },
  ];

  // Simulate live counter updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((prev) => prev + Math.floor(Math.random() * 5) - 2);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lux-showcase min-h-screen bg-black text-white">
      {/* Page Banner */}
      <LuxPageBanner
        message="🔥 NEW FEATURE: GO LIVE NOW AND CONNECT INSTANTLY"
        cta="TRY IT"
        ctaHref="/pulse"
        type="promo"
        dismissible
        storageKey="go-live-promo"
      />

      {/* Hero Carousel */}
      <section className="mb-12">
        <LuxCarousel
          slides={heroSlides}
          autoPlay
          interval={5000}
          aspectRatio="hero"
        />
      </section>

      <div className="max-w-7xl mx-auto px-6 space-y-16 pb-16">
        {/* Stats Section */}
        <section>
          <h2 className="text-3xl font-black italic text-white mb-8 text-center">
            HOTMESS BY THE NUMBERS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 bg-white/5 border-2 border-white/10 hover:border-[#C8962C]/50 transition-colors"
              >
                <div className="text-5xl font-black text-[#C8962C] mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-white/80 uppercase tracking-wider font-bold mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-white/50">{stat.description}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Live Counter */}
        <section>
          <h3 className="text-2xl font-black italic text-white mb-6">
            LIVE COUNTER VARIANTS
          </h3>
          <div className="space-y-6">
            <LuxLiveCounter count={liveCount} label="ONLINE NOW" variant="default" showTrend trend={5} />
            <LuxLiveCounter count={liveCount} label="LIVE" variant="minimal" />
            <LuxLiveCounter count={liveCount} label="ACTIVE" variant="badge" />
          </div>
        </section>

        {/* Countdown Timer */}
        <section>
          <h3 className="text-2xl font-black italic text-white mb-6">
            COUNTDOWN TIMER
          </h3>
          <LuxCountdownTimer
            endTime={new Date(Date.now() + 2 * 60 * 60 * 1000)} // 2 hours from now
            title="FLASH SALE ENDS IN"
            description="50% off all merchandise"
            variant="default"
          />
        </section>

        {/* Promo Banner */}
        <section>
          <LuxPromoBanner
            title="LIMITED TIME OFFER"
            description="Get 3 months premium for the price of 1"
            endTime={new Date(Date.now() + 24 * 60 * 60 * 1000)} // 24 hours from now
            cta="UPGRADE NOW"
            ctaHref="/upgrade"
          />
        </section>

        {/* Profile Carousel */}
        <section>
          <LuxProfileCarousel
            title="NEARBY MATCHES"
            subtitle="RIGHT NOW"
            profiles={profiles}
            onProfileClick={(profile) => console.log('Profile clicked:', profile)}
          />
        </section>

        {/* Event Carousel */}
        <section>
          <LuxEventCarousel
            title="TONIGHT'S EVENTS"
            subtitle="HAPPENING NOW"
            events={events}
            onEventClick={(event) => console.log('Event clicked:', event)}
          />
        </section>

        {/* Product Carousel */}
        <section>
          <LuxProductCarousel
            title="FEATURED MERCH"
            subtitle="NEW DROPS"
            products={products}
            onProductClick={(product) => console.log('Product clicked:', product)}
          />
        </section>

        {/* Video Player */}
        <section>
          <h3 className="text-2xl font-black italic text-white mb-6">
            VIDEO PLAYER
          </h3>
          <LuxVideo
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            poster="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920"
            title="HOTMESS RADIO"
            subtitle="LIVE NOW"
            controls
            aspectRatio="16:9"
          />
        </section>

        {/* Hero Banner */}
        <section>
          <LuxHeroBanner
            title="JOIN THE MESS"
            subtitle="HOTMESS LONDON"
            description="Where chaos meets connection"
            cta="SIGN UP FREE"
            ctaHref="/auth"
            secondaryCta="LEARN MORE"
            secondaryCtaHref="/more"
            image="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920"
            height="md"
          />
        </section>

        {/* Ad Slots */}
        <section>
          <h3 className="text-2xl font-black italic text-white mb-6">
            ADVERTISING SLOTS
          </h3>
          <div className="flex flex-col items-center gap-8">
            <LuxAdSlot
              slotId="demo-leaderboard"
              size="leaderboard"
              fallbackImage="https://via.placeholder.com/728x90/C8962C/FFFFFF?text=AD+SPACE"
              fallbackHref="#"
            />
            <LuxAdSlot
              slotId="demo-rectangle"
              size="medium-rectangle"
              fallbackImage="https://via.placeholder.com/300x250/00D9FF/FFFFFF?text=AD+SPACE"
              fallbackHref="#"
            />
          </div>
        </section>

        {/* Component Grid */}
        <section>
          <h3 className="text-2xl font-black italic text-white mb-6 text-center">
            ALL COMPONENTS READY
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 border-2 border-white/10">
              <Zap className="w-8 h-8 text-[#C8962C] mb-3" />
              <h4 className="text-lg font-black text-white mb-2">LuxCarousel</h4>
              <p className="text-sm text-white/70">Hero, Profile, Event, and Product carousels</p>
            </div>
            <div className="p-6 bg-white/5 border-2 border-white/10">
              <Heart className="w-8 h-8 text-[#C8962C] mb-3" />
              <h4 className="text-lg font-black text-white mb-2">LuxVideo</h4>
              <p className="text-sm text-white/70">Brutalist video player with Chrome Red controls</p>
            </div>
            <div className="p-6 bg-white/5 border-2 border-white/10">
              <Users className="w-8 h-8 text-[#C8962C] mb-3" />
              <h4 className="text-lg font-black text-white mb-2">LuxBanner</h4>
              <p className="text-sm text-white/70">Page, Hero, Promo, and Ad banners</p>
            </div>
            <div className="p-6 bg-white/5 border-2 border-white/10">
              <TrendingUp className="w-8 h-8 text-[#C8962C] mb-3" />
              <h4 className="text-lg font-black text-white mb-2">Engagement</h4>
              <p className="text-sm text-white/70">Live counters, timers, and activity feeds</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
