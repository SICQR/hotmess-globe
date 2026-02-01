import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Calendar, Zap, ArrowRight, Ghost, Play, Mic, Users, Sparkles, MapPin, Disc, ChevronLeft, ChevronRight, Radio as RadioIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServerNow } from '@/hooks/use-server-now';
import { schedule, getNextEpisode } from '../components/radio/radioUtils';
import { useRadio } from '../components/shell/RadioContext';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const { serverNow } = useServerNow();
  const { openRadio } = useRadio();
  const releasesRef = useRef(null);

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

  const tonightEvents = useMemo(() => {
    const events = Array.isArray(recentBeacons)
      ? recentBeacons.filter((b) => String(b?.kind || '').toLowerCase() === 'event')
      : [];
    return events.slice(0, 4);
  }, [recentBeacons]);

  // RAW CONVICT RECORDS releases
  const releases = [
    { id: 1, title: 'HOTMESS', artist: 'Paul King ft Stewart Who', cover: '/images/RCR001 Paul King ft Stewart Who - Hotmess.JPEG', year: '2024', catalog: 'RCR001' },
    { id: 2, title: 'WALKING RED FLAG', artist: 'Raw Convict', cover: '/images/walking-red-flag-cover.jpg', year: '2024', catalog: 'RCR002' },
    { id: 3, title: 'RADIO COVER', artist: 'HOTMESS', cover: '/images/hero/radio-cover.jpg', year: '2024', catalog: 'RCR003' },
  ];

  const scrollReleases = (direction) => {
    if (releasesRef.current) {
      const scrollAmount = 300;
      releasesRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO - Full viewport with image */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-main.png" 
            alt="HOTMESS" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
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
            <Button 
              onClick={openRadio}
              className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black uppercase px-10 py-7 text-lg md:text-xl"
            >
              <Play className="w-6 h-6 mr-3" />
              LISTEN LIVE
            </Button>
            <Link to="/events">
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-10 py-7 text-lg md:text-xl backdrop-blur-sm">
                <Zap className="w-6 h-6 mr-3" />
                TONIGHT
              </Button>
            </Link>
          </div>
        </motion.div>

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

      {/* 3. HOTMESS RADIO - Live Station */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hotmess-radio-hero.png" 
            alt="HOTMESS Radio" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE 24/7
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-4">
                HOTMESS<br/>RADIO<span className="text-pink-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                The heartbeat of London's queer underground
              </p>
              <p className="text-lg text-white/50 mb-6 max-w-lg">
                24/7 live stream. DJ culture. Shows that care. This is our frequency.
              </p>
              {nextRadioUp && (
                <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-8">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">NEXT SHOW</p>
                  <p className="text-lg font-black">{nextRadioUp.show.title}</p>
                  <p className="text-sm text-pink-500">{nextRadioUp.nextEpisode.startTime}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={openRadio}
                  variant="hot" size="lg" className="font-black uppercase px-10"
                >
                  <Play className="w-6 h-6 mr-3" />
                  LISTEN NOW
                </Button>
                <Link to="/music/schedule">
                  <Button variant="outline" className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    <Calendar className="w-5 h-5 mr-3" />
                    SCHEDULE
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative w-80 h-80">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-4 border-pink-500/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-4 rounded-full border-2 border-white/20"
                />
                <div className="absolute inset-8 rounded-full bg-pink-500 flex items-center justify-center">
                  <RadioIcon className="w-24 h-24 text-white" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-black font-black text-xs">LIVE</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. RAW CONVICT RECORDS - Label & Releases */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/raw-convict-hero.png" 
            alt="Raw Convict Records" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/60" />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">THE LABEL</p>
              <h2 className="text-4xl md:text-6xl font-black italic">
                RAW CONVICT<br/>RECORDS<span className="text-pink-500">.</span>
              </h2>
              <p className="text-lg text-white/70 mt-4 max-w-xl">
                Underground releases. No compromise. The sound of London's queer nightlife, pressed and distributed.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => scrollReleases('left')}
                className="border-white/20 text-white w-12 h-12 p-0"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                onClick={() => scrollReleases('right')}
                className="border-white/20 text-white w-12 h-12 p-0"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </motion.div>

          {/* Releases Carousel */}
          <div 
            ref={releasesRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {releases.map((release, idx) => (
              <motion.div
                key={release.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex-shrink-0 w-64 snap-start"
              >
                <Link to="/music/releases" className="group block">
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
                    <img 
                      src={release.cover} 
                      alt={release.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-16 h-16 text-white" />
                    </div>
                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-pink-500 text-white text-xs font-black uppercase rounded-full">
                      {release.year}
                    </div>
                  </div>
                  <h3 className="font-black uppercase text-lg group-hover:text-pink-500 transition-colors">{release.title}</h3>
                  <p className="text-white/50 text-sm">{release.artist}</p>
                </Link>
              </motion.div>
            ))}
            {/* View All Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-64 snap-start"
            >
              <Link to="/music/releases" className="group block">
                <div className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:border-pink-500 transition-colors">
                  <Disc className="w-16 h-16 text-white/30 group-hover:text-pink-500 transition-colors mb-4" />
                  <span className="font-black uppercase text-white/50 group-hover:text-white transition-colors">VIEW ALL</span>
                  <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-pink-500 mt-2 transition-colors" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. TONIGHT SECTION - Full width with real event previews */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-green.jpg" 
            alt="Tonight" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black via-black/90 to-black/70" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Event Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="grid grid-cols-2 gap-4">
                {(tonightEvents.length > 0 ? tonightEvents : [1,2,3,4]).map((event, i) => (
                  <Link 
                    key={event?.id || i} 
                    to={event?.id ? `/events/${event.id}` : '/events'}
                    className="group"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-white/20 hover:border-pink-500 transition-all">
                      {event?.image_url ? (
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-xs text-pink-500 uppercase tracking-wider mb-1">
                          {event?.event_date ? new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'short' }) : 'TONIGHT'}
                        </p>
                        <p className="text-sm font-black line-clamp-2">
                          {event?.title || 'Event ' + (i + 1)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">
                EVENTS
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-6">
                TONIGHT<span className="text-pink-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                What's happening in London
              </p>
              <p className="text-lg text-white/50 mb-10 max-w-lg">
                Find the energy. RSVP to nights. See who's going. The pulse of queer London, mapped.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/events">
                  <Button variant="hot" size="lg" className="font-black uppercase px-10">
                    <Calendar className="w-6 h-6 mr-3" />
                    VIEW EVENTS
                  </Button>
                </Link>
                <Link to="/pulse">
                  <Button variant="outline" className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    <MapPin className="w-6 h-6 mr-3" />
                    PULSE MAP
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. GHOSTED SECTION - Full width with profile previews */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/ghosted-cover.jpg" 
            alt="Ghosted" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">
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
                <Button variant="hot" size="lg" className="font-black uppercase px-10">
                  <Ghost className="w-6 h-6 mr-3" />
                  DISCOVER
                </Button>
              </Link>
            </motion.div>

            {/* Profile grid with filled images */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden lg:block"
            >
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map((i) => (
                  <div 
                    key={i} 
                    className="aspect-[3/4] rounded-xl overflow-hidden border border-white/20 hover:border-pink-500 transition-all group"
                  >
                    <div className="w-full h-full bg-white/10 flex items-end justify-center pb-6">
                      <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Ghost className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. HNHMESS - Stigma-smashing lube */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/HNHMESS HERO.PNG" 
            alt="HNHMESS" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">
                STIGMA-SMASHING ESSENTIALS
              </p>
              <h2 className="text-5xl md:text-8xl font-black italic mb-6">
                HNH<span className="text-pink-500">MESS</span><span className="text-pink-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/80 mb-4">
                Lube without the shame.
              </p>
              <p className="text-lg text-white/60 mb-8 max-w-lg">
                Sex-positive. Queer-owned. Designed for the community, by the community. 
                No whispers. No brown paper bags. Just quality essentials that celebrate who we are.
              </p>
              <div className="bg-white/5 rounded-xl p-6 border border-pink-500/30 mb-10">
                <div className="flex items-center gap-4 mb-3">
                  <RadioIcon className="w-6 h-6 text-pink-500" />
                  <span className="font-black uppercase text-pink-500">As heard on</span>
                </div>
                <p className="text-2xl font-black mb-2">HAND N HAND</p>
                <p className="text-white/60">
                  Every Sunday on HOTMESS RADIO. Real talk about sex, health, and connection.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link to="/market?brand=hnhmess">
                  <Button variant="hot" size="lg" className="font-black uppercase px-10">
                    <ShoppingBag className="w-6 h-6 mr-3" />
                    SHOP HNHMESS
                  </Button>
                </Link>
                <Button 
                  onClick={openRadio}
                  variant="outline" 
                  className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg"
                >
                  <Play className="w-6 h-6 mr-3" />
                  HAND N HAND
                </Button>
              </div>
            </motion.div>

            {/* Product visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative">
                <div className="w-80 h-80 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 blur-3xl absolute inset-0" />
                <img 
                  src="/images/HOTMESS HERO HNH.PNG" 
                  alt="HNHMESS Product"
                  className="relative w-80 h-auto rounded-2xl shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 8. HOME COLLECTIONS - Permanent lines */}
      <section className="py-20 px-6 bg-black border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-white/60 mb-4">HOTMESS CLOTHING</p>
            <h2 className="text-4xl md:text-6xl font-black italic mb-6">
              HOME COLLECTIONS<span className="text-pink-500">.</span>
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              Our permanent lines. Always in stock.
            </p>
          </motion.div>

          {/* Home Collection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { name: 'RAW', tagline: 'Unfiltered swimwear & basics', image: '/images/brand-raw-swim.png' },
              { name: 'HUNG', tagline: 'Statement streetwear', image: '/images/hung-hero.png' },
              { name: 'HIGH', tagline: 'Elevated essentials', image: '/images/brand-essentials-hoodie.png' },
            ].map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/market?brand=${brand.name.toLowerCase()}`} className="group block">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 group-hover:border-pink-500 transition-colors">
                    <img 
                      src={brand.image} 
                      alt={brand.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-2xl font-black">{brand.name}</span>
                    <p className="text-sm text-white/50 uppercase tracking-wider mt-1">{brand.tagline}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/market">
              <Button className="bg-white hover:bg-pink-500 text-black hover:text-white font-black uppercase px-10 py-6 text-lg">
                <ShoppingBag className="w-6 h-6 mr-3" />
                SHOP COLLECTIONS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 9. LIMITED DROPS - SUPERHUNG & SUPERHIGH */}
      <section className="py-20 px-6 bg-black border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">EXCLUSIVE</p>
            <h2 className="text-4xl md:text-6xl font-black italic mb-6">
              LIMITED DROPS<span className="text-pink-500">.</span>
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              When it's gone, it's gone. No restocks.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            {[
              { name: 'SUPERHUNG', tagline: 'Ultra-limited statement pieces', image: '/images/brand-hung-black.png' },
              { name: 'SUPERHIGH', tagline: 'Rare elevated drops', image: '/images/brand-hung-yellow.png' },
            ].map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/market?brand=${brand.name.toLowerCase()}`} className="group block">
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white/20 group-hover:border-pink-500 transition-colors">
                    <img 
                      src={brand.image} 
                      alt={brand.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <span className="text-2xl font-black">{brand.name}</span>
                    <p className="text-sm text-white/50 uppercase tracking-wider mt-1">{brand.tagline}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/market?category=limited">
              <Button variant="hot" size="lg" className="font-black uppercase px-10">
                <ShoppingBag className="w-6 h-6 mr-3" />
                SHOP LIMITED DROPS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 10. MESS MARKET - Third-party marketplace */}
      <section className="relative min-h-[60vh] flex items-center bg-black">
        <div className="w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Categories */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'PRELOVED', desc: 'Secondhand luxury', icon: '♻️', link: '/market?category=preloved' },
                  { name: 'DIGITAL', desc: 'Content & downloads', icon: '💾', link: '/market?category=digital' },
                  { name: 'RETAIL', desc: 'Partner brands', icon: '🏪', link: '/market?category=retail' },
                  { name: 'ALL', desc: 'Browse everything', icon: '🛒', link: '/market' },
                ].map((cat) => (
                  <Link key={cat.name} to={cat.link} className="group">
                    <div className="aspect-square rounded-xl bg-white/5 border border-white/20 hover:border-pink-500 transition-all flex flex-col items-center justify-center p-6">
                      <span className="text-4xl mb-3">{cat.icon}</span>
                      <span className="font-black text-lg group-hover:text-pink-500 transition-colors">{cat.name}</span>
                      <span className="text-xs text-white/50 mt-1">{cat.desc}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">
                THIRD-PARTY MARKETPLACE
              </p>
              <h2 className="text-5xl md:text-7xl font-black italic mb-6">
                MESS<br/>MARKET<span className="text-pink-500">.</span>
              </h2>
              <p className="text-xl md:text-2xl text-white/70 mb-4">
                Buy. Sell. Trade.
              </p>
              <p className="text-lg text-white/50 mb-10 max-w-lg">
                Preloved luxury, digital content, and curated retail partners. 10% platform fee. Verified sellers only.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/market">
                  <Button variant="hot" size="lg" className="font-black uppercase px-10">
                    <ShoppingBag className="w-6 h-6 mr-3" />
                    BROWSE MARKET
                  </Button>
                </Link>
                <Link to="/sell">
                  <Button variant="outline" className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    BECOME A SELLER
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 11. B2B SECTION - For Venues */}
      <section className="py-24 px-6 bg-black border-y border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-white/10 flex items-center justify-center">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">
              FOR VENUES & PROMOTERS
            </p>
            <h2 className="text-4xl md:text-6xl font-black italic mb-6">
              GOT A NIGHT?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              List your event. Reach London's queer nightlife scene. Analytics, promotion, and direct access.
            </p>
            <Link to="/for-venues">
              <Button className="bg-white hover:bg-pink-500 text-black hover:text-white font-black uppercase px-12 py-6 text-lg">
                LIST YOUR EVENT
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 12. CARE SECTION */}
      <section className="py-32 px-6 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-24 h-24 mx-auto mb-10 rounded-full bg-white/10 flex items-center justify-center">
              <Heart className="w-12 h-12 text-white/80" />
            </div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60 mb-6">
              CARE
            </p>
            <h2 className="text-4xl md:text-6xl font-black mb-8">
              Landing matters as much as leaving.
            </h2>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
              You good? Care is always here. No judgment. No shame. Just support when you need it.
            </p>
            <Link to="/care">
              <Button variant="outline" className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase px-10 py-6 text-lg">
                <Heart className="w-6 h-6 mr-3" />
                OPEN CARE
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
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
