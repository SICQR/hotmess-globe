import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Calendar, Zap, ArrowRight, Ghost, Play, Mic, Users, Sparkles, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServerNow } from '@/hooks/use-server-now';
import { schedule, getNextEpisode } from '../components/radio/radioUtils';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const { serverNow } = useServerNow();

  // Get next radio show
  const nextRadioUp = useMemo(() => {
    const candidates = (schedule?.shows || [])
      .map((show) => {
        const nextEpisode = getNextEpisode(show?.id);
        if (!show || !nextEpisode?.date) return null;
        return { show, nextEpisode };
      })
      .filter(Boolean);

    if (!candidates.length) return null;
    return candidates.sort((a, b) => a.nextEpisode.date - b.nextEpisode.date)[0];
  }, [serverNow]);

  // Get tonight's events
  const { data: recentBeacons = [] } = useQuery({
    queryKey: ['recent-beacons'],
    queryFn: async () => {
      const allBeacons = await base44.entities.Beacon.filter({ active: true, status: 'published' });
      const today = new Date();
      const upcomingBeacons = allBeacons.filter(b => {
        if (b.kind === 'event' && b.event_date) {
          return new Date(b.event_date) >= today;
        }
        return true;
      });
      return upcomingBeacons
        .sort((a, b) => {
          const aDate = a.event_date ? new Date(a.event_date) : new Date(a.created_date);
          const bDate = b.event_date ? new Date(b.event_date) : new Date(b.created_date);
          return aDate - bDate;
        })
        .slice(0, 6);
    },
    refetchInterval: 60000
  });

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setCurrentUser(null);
          return;
        }
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, []);

  const tonightEvent = useMemo(() => {
    const events = Array.isArray(recentBeacons)
      ? recentBeacons.filter((b) => String(b?.kind || '').toLowerCase() === 'event')
      : [];
    return events[0] || null;
  }, [recentBeacons]);

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO - Full viewport with image */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-main.png" 
            alt="HOTMESS" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 text-center px-6 max-w-5xl"
        >
          <p className="text-sm md:text-base uppercase tracking-[0.5em] text-pink-500 mb-6">
            London's Queer Culture Platform
          </p>
          
          <h1 className="text-[20vw] md:text-[12vw] font-black italic leading-[0.85] tracking-tighter mb-8">
            HOT<span className="text-[#FF1493]">MESS</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-bold uppercase tracking-[0.15em] text-white/80 mb-12">
            Radio • Tonight • Ghosted • Shop
          </p>

          <div className="flex flex-wrap gap-6 justify-center">
            <Link to="/music/live">
              <Button className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black uppercase px-10 py-7 text-lg md:text-xl">
                <Play className="w-6 h-6 mr-3" />
                LISTEN LIVE
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-10 py-7 text-lg md:text-xl backdrop-blur-sm">
                <Zap className="w-6 h-6 mr-3" />
                TONIGHT
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* 2. RIGHT NOW STRIP */}
      <section className="py-6 px-6 bg-gradient-to-r from-pink-950/40 via-black to-cyan-950/40 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-base md:text-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white/60">London is</span>
              <span className="text-green-400 font-black">WARM TONIGHT</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-pink-500" />
              <span className="font-black text-white">{recentBeacons.length || 47}</span>
              <span className="text-white/60">active</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span className="font-black text-white">{recentBeacons.filter(b => b.kind === 'event').length || 3}</span>
              <span className="text-white/60">events tonight</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. RADIO SECTION - Full width with image */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-pink.jpg" 
            alt="Radio" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-purple-400 mb-4 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE NOW
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-6">
                RADIO<span className="text-purple-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                {nextRadioUp?.show?.title || 'RAW CONVICT RADIO'}
              </p>
              <p className="text-lg text-white/50 mb-10 max-w-lg">
                The heartbeat of London's queer underground. Live shows, DJ culture, and music that moves you.
              </p>
              <Link to="/music/live">
                <Button className="bg-purple-500 hover:bg-white text-white hover:text-black font-black uppercase px-10 py-6 text-lg">
                  <Play className="w-6 h-6 mr-3" />
                  LISTEN NOW
                </Button>
              </Link>
            </motion.div>

            {/* Album Art */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden lg:block"
            >
              <div className="relative">
                <img 
                  src="/images/hero/radio-cover.jpg" 
                  alt="Now Playing" 
                  className="w-full max-w-md mx-auto rounded-2xl shadow-2xl shadow-purple-500/20"
                />
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Play className="w-10 h-10 text-black ml-1" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. TONIGHT SECTION - Full width with image */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-green.jpg" 
            alt="Tonight" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black via-black/80 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden lg:block order-1"
            >
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-cyan-500/50" />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:order-2 text-right lg:text-left"
            >
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-400 mb-4">
                EVENTS
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-6">
                TONIGHT<span className="text-cyan-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                {tonightEvent?.title || "What's happening in London"}
              </p>
              <p className="text-lg text-white/50 mb-10 max-w-lg ml-auto lg:ml-0">
                Find the energy. RSVP to nights. See who's going. Three moves you can make.
              </p>
              <div className="flex flex-wrap gap-4 justify-end lg:justify-start">
                <Link to="/events">
                  <Button className="bg-cyan-500 hover:bg-white text-black font-black uppercase px-10 py-6 text-lg">
                    <Calendar className="w-6 h-6 mr-3" />
                    VIEW EVENTS
                  </Button>
                </Link>
                <Link to="/pulse">
                  <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    <MapPin className="w-6 h-6 mr-3" />
                    PULSE MAP
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. GHOSTED SECTION - Full width with image */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-red.jpg" 
            alt="Ghosted" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-400 mb-4">
                DISCOVERY
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-6">
                GHOSTED<span className="text-pink-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                Who's out right now
              </p>
              <p className="text-lg text-white/50 mb-10 max-w-lg">
                Opt-in. Contextual. Your pace. Find people without the pressure. Presence over performance.
              </p>
              <Link to="/social">
                <Button className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-10 py-6 text-lg">
                  <Ghost className="w-6 h-6 mr-3" />
                  DISCOVER
                </Button>
              </Link>
            </motion.div>

            {/* Profile grid mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden lg:block"
            >
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 flex items-end justify-center pb-4">
                    <Ghost className="w-8 h-8 text-pink-500/50" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. SHOP SECTION - Full width */}
      <section className="relative min-h-[60vh] flex items-center bg-gradient-to-br from-yellow-950/30 via-black to-orange-950/30">
        <div className="w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Product mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="relative bg-white/5 rounded-2xl p-8 border border-white/10">
                <div className="absolute top-4 right-4 bg-yellow-500 text-black text-sm font-black uppercase px-4 py-2 rounded-full">
                  NEW DROP
                </div>
                <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center mb-6">
                  <ShoppingBag className="w-24 h-24 text-yellow-500/30" />
                </div>
                <p className="text-white/50 text-sm uppercase tracking-wider mb-2">Limited Edition</p>
                <h3 className="text-2xl font-black mb-2">HOTMESS MERCH</h3>
                <p className="text-3xl font-black text-yellow-500">£35</p>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <p className="text-sm uppercase tracking-[0.4em] text-yellow-400 mb-4">
                MESSMARKET
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-6">
                SHOP<span className="text-yellow-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                Support the platform
              </p>
              <p className="text-lg text-white/50 mb-10 max-w-lg">
                Limited drops. Exclusive merch. Fund the culture without extraction.
              </p>
              <Link to="/market">
                <Button className="bg-yellow-500 hover:bg-white text-black font-black uppercase px-10 py-6 text-lg">
                  <ShoppingBag className="w-6 h-6 mr-3" />
                  SHOP NOW
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. B2B SECTION - For Venues */}
      <section className="py-24 px-6 bg-gradient-to-r from-cyan-950/20 via-black to-cyan-950/20 border-y border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Mic className="w-10 h-10 text-cyan-500" />
            </div>
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-400 mb-4">
              FOR VENUES & PROMOTERS
            </p>
            <h2 className="text-4xl md:text-6xl font-black italic mb-6">
              GOT A NIGHT?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              List your event. Reach London's queer nightlife scene. Analytics, promotion, and direct access to the community.
            </p>
            <Link to="/for-venues">
              <Button className="bg-cyan-500 hover:bg-white text-black font-black uppercase px-12 py-6 text-lg">
                LIST YOUR EVENT
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 8. CARE SECTION */}
      <section className="py-32 px-6 bg-gradient-to-b from-black via-red-950/10 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-24 h-24 mx-auto mb-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Heart className="w-12 h-12 text-red-400" />
            </div>
            <p className="text-sm uppercase tracking-[0.4em] text-red-400 mb-6">
              CARE
            </p>
            <h2 className="text-4xl md:text-6xl font-black mb-8">
              Landing matters as much as leaving.
            </h2>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
              You good? Care is always here. No judgment. No shame. Just support when you need it.
            </p>
            <Link to="/care">
              <Button variant="outline" className="border-2 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white font-black uppercase px-10 py-6 text-lg">
                <Heart className="w-6 h-6 mr-3" />
                OPEN CARE
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-32 px-6 bg-black text-white text-center border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-6xl md:text-8xl font-black italic mb-8">
            JOIN<span className="text-[#FF1493]">.</span>
          </h2>
          <p className="text-xl md:text-2xl uppercase tracking-wider text-white/50 mb-12">
            Men-only. 18+. Consent-first. Care always.
          </p>
          
          {currentUser ? (
            <div className="space-y-6">
              <p className="text-xl text-[#39FF14]">Welcome back, {currentUser.full_name || 'you'}</p>
              <div className="flex flex-wrap gap-6 justify-center">
                <Link to="/social">
                  <Button className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black uppercase px-10 py-6 text-xl">
                    GO TO GHOSTED
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-10 py-6 text-xl">
                    TONIGHT
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black uppercase px-14 py-8 text-2xl">
                GET STARTED
              </Button>
            </Link>
          )}
        </motion.div>
      </section>
    </div>
  );
}
