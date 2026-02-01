import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { ShoppingBag, Radio, Heart, Calendar, Zap, ArrowRight, Ghost, Play, Mic, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServerNow } from '@/hooks/use-server-now';
import { schedule, getNextEpisode } from '../components/radio/radioUtils';
import { format } from 'date-fns';
import GlobeHero from '@/components/globe/GlobeHero';

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
      
      {/* 1. RADIO STRIP - The heartbeat (FIRST) */}
      <section className="py-6 px-6 bg-gradient-to-r from-purple-950/40 via-black to-purple-950/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <Link to="/music/live" className="block">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-purple-500/50 rounded-xl p-4 md:p-6 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Radio className="w-7 h-7 md:w-8 md:h-8 text-purple-500" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full animate-pulse border-2 border-black" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-green-500 uppercase tracking-widest font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                    LIVE NOW
                  </p>
                  <h3 className="text-xl md:text-2xl font-black uppercase">
                    {nextRadioUp?.show?.title || 'RAW CONVICT RADIO'}
                  </h3>
                  <p className="text-xs md:text-sm text-white/50">
                    {nextRadioUp?.nextEpisode ? `Next: ${format(nextRadioUp.nextEpisode.date, 'EEE HH:mm')}` : 'Live shows & DJ culture'}
                  </p>
                </div>
              </div>
              <Button className="bg-purple-500 hover:bg-purple-400 text-white font-black uppercase group-hover:scale-105 transition-transform hidden sm:flex">
                <Play className="w-5 h-5 mr-2" />
                LISTEN
              </Button>
            </motion.div>
          </Link>
        </div>
      </section>

      {/* 2. GLOBE HERO - Simplified */}
      <section className="relative min-h-[80svh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <GlobeHero />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <h1 className="text-[18vw] md:text-[10vw] font-black italic leading-[0.85] tracking-tighter mb-6">
            HOT<span className="text-[#FF1493]">MESS</span>
          </h1>
          
          <p className="text-base md:text-xl font-bold uppercase tracking-[0.2em] text-white/70 mb-8">
            Radio • Tonight • Connection • Care
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/welcome">
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-6 py-5 md:px-8 md:py-6 text-base md:text-lg">
                <Play className="w-5 h-5 mr-2" />
                ENTER
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" className="border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-black uppercase px-6 py-5 md:px-8 md:py-6 text-base md:text-lg backdrop-blur-sm">
                <Zap className="w-5 h-5 mr-2" />
                TONIGHT
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 3. RIGHT NOW STRIP */}
      <section className="py-4 px-6 bg-gradient-to-r from-pink-950/30 via-black to-cyan-950/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white/60">London is</span>
              <span className="text-green-400 font-bold">warm tonight</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-500" />
              <span className="text-white/60">{recentBeacons.length || 0} active</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span className="text-white/60">{recentBeacons.filter(b => b.kind === 'event').length || 0} events tonight</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. MODES GRID */}
      <section className="py-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black italic mb-4">
              WHAT'S <span className="text-pink-500">YOURS</span>
            </h2>
            <p className="text-white/50 uppercase tracking-widest text-sm">Choose your mode</p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { to: '/music/live', icon: Radio, title: 'Radio', desc: 'Live shows', color: 'from-purple-500 to-violet-500' },
              { to: '/events', icon: Zap, title: 'Tonight', desc: "What's on", color: 'from-cyan-500 to-blue-500' },
              { to: '/social', icon: Ghost, title: 'Ghosted', desc: 'Find people', color: 'from-pink-500 to-red-500' },
              { to: '/market', icon: ShoppingBag, title: 'Shop', desc: 'Drops', color: 'from-yellow-500 to-orange-500' },
            ].map((mode, i) => (
              <motion.div
                key={mode.to}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={mode.to}>
                  <div className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/50 p-5 md:p-6 h-36 md:h-44 transition-all hover:scale-[1.02]">
                    <div className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-20 transition-opacity`} />
                    <mode.icon className="w-8 h-8 md:w-10 md:h-10 text-white mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="text-lg md:text-xl font-black uppercase mb-1">{mode.title}</h3>
                    <p className="text-xs md:text-sm text-white/50">{mode.desc}</p>
                    <ArrowRight className="absolute bottom-5 right-5 w-4 h-4 text-white/30 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TONIGHT SECTION */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-4">EVENTS</p>
            <h2 className="text-5xl md:text-6xl font-black italic mb-4 text-white">
              TONIGHT<span className="text-[#00D9FF]">.</span>
            </h2>
            <p className="text-lg uppercase tracking-wider text-white/60">
              Three moves you can make.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
            {/* RSVP */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-white/5 border border-white/10 p-6 h-full rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-[#00D9FF] text-black flex items-center justify-center rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black uppercase">RSVP</h3>
                </div>

                {tonightEvent ? (
                  <>
                    <p className="text-white/60 uppercase tracking-wider text-xs mb-2">Tonight</p>
                    <p className="text-xl font-black mb-2 line-clamp-1">{tonightEvent.title}</p>
                    <p className="text-white/70 text-sm mb-5 line-clamp-2">{tonightEvent.description}</p>
                    <Link to={`/events/${encodeURIComponent(tonightEvent.id)}`}>
                      <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase w-full">
                        RSVP
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-white/70 text-sm mb-5">
                      Find what's on and lock it in.
                    </p>
                    <Link to="/events">
                      <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase w-full">
                        VIEW EVENTS
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>

            {/* PULSE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white/5 border border-white/10 p-6 h-full rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-white/10 flex items-center justify-center rounded-lg">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black uppercase">PULSE</h3>
                </div>
                <p className="text-white/70 text-sm mb-5">
                  Map + layers. Find the energy.
                </p>
                <Link to="/pulse">
                  <Button variant="outline" className="border border-white/30 text-white hover:bg-white hover:text-black font-black uppercase w-full">
                    OPEN PULSE
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* GHOSTED */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white/5 border border-white/10 p-6 h-full rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-pink-500/20 flex items-center justify-center rounded-lg">
                    <Ghost className="w-5 h-5 text-pink-500" />
                  </div>
                  <h3 className="text-xl font-black uppercase">GHOSTED</h3>
                </div>
                <p className="text-white/70 text-sm mb-5">
                  Who's out right now. Your pace.
                </p>
                <Link to="/social">
                  <Button className="bg-pink-500 text-white hover:bg-white hover:text-black font-black uppercase w-full">
                    DISCOVER
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <Link to="/events">
              <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase px-8 py-4">
                VIEW ALL EVENTS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. SHOP PREVIEW */}
      <section className="py-16 px-6 bg-black border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-yellow-500/70 mb-2">MESSMARKET</p>
                <h2 className="text-3xl md:text-4xl font-black italic">NEW DROP</h2>
              </div>
              <Link to="/market">
                <Button variant="outline" className="border-white/20 text-white/70 hover:bg-white hover:text-black font-bold uppercase text-sm">
                  SHOP ALL
                </Button>
              </Link>
            </div>

            <Link to="/market">
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-white/10 hover:border-yellow-500/50 p-6 md:p-8 transition-all">
                <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-black uppercase px-3 py-1 rounded-full">
                  NEW
                </div>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-white/5 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-yellow-500/50" />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <p className="text-white/50 text-sm uppercase tracking-wider mb-2">Limited Edition</p>
                    <h3 className="text-2xl md:text-3xl font-black mb-2">HOTMESS MERCH</h3>
                    <p className="text-white/60 mb-4">Support the platform. Look good doing it.</p>
                    <p className="text-2xl font-black text-yellow-500">£35</p>
                  </div>
                  <ArrowRight className="w-8 h-8 text-white/30 group-hover:text-yellow-500 group-hover:translate-x-2 transition-all hidden md:block" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 7. B2B HOOK - For Venues */}
      <section className="py-12 px-6 bg-gradient-to-r from-cyan-950/20 via-black to-cyan-950/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/for-venues">
              <div className="group flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-xl p-6 md:p-8 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Mic className="w-7 h-7 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase mb-1">Got a night?</h3>
                    <p className="text-white/60">List your event. Reach the scene.</p>
                  </div>
                </div>
                <Button className="bg-cyan-500 hover:bg-white text-black font-black uppercase group-hover:scale-105 transition-transform">
                  FOR VENUES & PROMOTERS
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 8. CARE LANDING */}
      <section className="py-16 px-6 bg-gradient-to-b from-black to-red-950/20 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <Heart className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-red-400 mb-4">Care</p>
            <h2 className="text-2xl md:text-3xl font-black mb-4">Landing matters as much as leaving.</h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              You good? Care is always here. No judgment, just support.
            </p>
            <Link to="/care">
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white font-black uppercase">
                Open Care
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="py-24 px-6 bg-black text-white text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-5xl md:text-7xl font-black italic mb-6">
            JOIN<span className="text-[#FF1493]">.</span>
          </h2>
          <p className="text-lg md:text-xl uppercase tracking-wider text-white/50 mb-10">
            Men-only. 18+. Consent-first. Care always.
          </p>
          
          {currentUser ? (
            <div className="space-y-4">
              <p className="text-lg text-[#39FF14]">Welcome back, {currentUser.full_name || 'you'}</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/social">
                  <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-5 text-lg">
                    GO TO GHOSTED
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-5 text-lg">
                    TONIGHT
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-10 py-6 text-xl">
                GET STARTED
              </Button>
            </Link>
          )}
        </motion.div>
      </section>
    </div>
  );
}
