import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio as RadioIcon, Calendar, Play, Clock, ArrowRight, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { schedule, getNextEpisode } from '../components/radio/radioUtils';
import { useRadio } from '../components/shell/RadioContext';
import { format } from 'date-fns';

export default function Radio() {
  const { openRadio, isRadioOpen } = useRadio();

  const shows = schedule?.shows || [];

  const nextUp = shows
    .map((show) => {
      const nextEpisode = getNextEpisode(show?.id);
      if (!show || !nextEpisode?.date) return null;
      return { show, nextEpisode };
    })
    .filter(Boolean)
    .sort((a, b) => a.nextEpisode.date - b.nextEpisode.date)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO - Full viewport */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-pink.jpg" 
            alt="Radio" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/80 via-black/60 to-black" />
        </div>

        {/* Animated circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-purple-500/30"
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-purple-500/20"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6 max-w-5xl"
        >
          {/* Live indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-sm uppercase tracking-[0.3em] font-bold">Live Now</span>
          </div>

          <h1 className="text-[15vw] md:text-[10vw] font-black italic leading-[0.85] tracking-tighter mb-6">
            RADIO<span className="text-purple-500">.</span>
          </h1>
          
          <p className="text-xl md:text-3xl font-bold text-white/80 mb-6 max-w-2xl mx-auto">
            The heartbeat of London's queer underground
          </p>

          <p className="text-base md:text-lg text-white/50 mb-12 max-w-xl mx-auto">
            24/7 live shows. DJ culture. Music that moves you. Three tentpoles, one rule: care-first.
          </p>

          <div className="flex flex-wrap gap-6 justify-center">
            <Button 
              onClick={openRadio}
              className="bg-purple-500 hover:bg-white text-white hover:text-black font-black uppercase px-12 py-7 text-xl"
            >
              <Play className="w-7 h-7 mr-3" />
              {isRadioOpen ? 'NOW PLAYING' : 'LISTEN LIVE'}
            </Button>
            <Link to="/music/schedule">
              <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-10 py-7 text-xl">
                <Calendar className="w-6 h-6 mr-3" />
                SCHEDULE
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
              className="w-1.5 h-1.5 bg-purple-500 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* 2. NOW PLAYING - Large section */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-purple-950/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Album Art */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <img 
                  src="/images/hero/radio-cover.jpg" 
                  alt="Now Playing" 
                  className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl shadow-purple-500/30"
                />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-6 -right-6 w-28 h-28 bg-green-500 rounded-full flex items-center justify-center shadow-xl"
                >
                  <Play className="w-12 h-12 text-black ml-1" />
                </motion.div>
              </div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-purple-400 mb-4 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                ON AIR
              </p>
              <h2 className="text-4xl md:text-6xl font-black italic mb-6">
                RAW CONVICT RADIO
              </h2>
              <p className="text-xl text-white/60 mb-8">
                London's filthiest frequency. Underground sounds. No compromise.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-4 text-white/70">
                  <Headphones className="w-5 h-5 text-purple-500" />
                  <span>24/7 Live Stream</span>
                </div>
                <div className="flex items-center gap-4 text-white/70">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span>Scheduled shows throughout the week</span>
                </div>
              </div>

              <Button 
                onClick={openRadio}
                className="bg-purple-500 hover:bg-white text-white hover:text-black font-black uppercase px-10 py-6 text-lg"
              >
                <Play className="w-6 h-6 mr-3" />
                TUNE IN
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. SHOWS SECTION */}
      <section className="py-24 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-white/40 mb-4">PROGRAMMING</p>
            <h2 className="text-5xl md:text-7xl font-black italic mb-6">
              THE SHOWS<span className="text-purple-500">.</span>
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Three tentpoles. Different vibes. Same commitment to the culture.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {shows.map((show, idx) => (
              <motion.div
                key={show.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link to={`/music/shows/${show.slug}`}>
                  <div className="group relative h-[500px] overflow-hidden rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all">
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${
                      idx === 0 ? 'from-pink-500/40 to-purple-900/60' :
                      idx === 1 ? 'from-cyan-500/40 to-blue-900/60' :
                      'from-yellow-500/40 to-orange-900/60'
                    }`} />
                    
                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-end p-8">
                      <div className="mb-auto pt-4">
                        <RadioIcon className="w-16 h-16 text-white/20" />
                      </div>
                      
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">
                          {show.schedule?.[0]?.day || 'WEEKLY'}
                        </p>
                        <h3 className="text-3xl font-black uppercase mb-3 group-hover:text-purple-300 transition-colors">
                          {show.title}
                        </h3>
                        <p className="text-white/60 mb-6">
                          {show.tagline}
                        </p>
                        <div className="flex items-center gap-2 text-sm font-black text-purple-400 group-hover:text-white transition-colors">
                          VIEW SHOW
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. NEXT UP */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-purple-950/20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-purple-400 mb-4">SCHEDULE</p>
            <h2 className="text-4xl md:text-6xl font-black italic mb-4">
              NEXT UP
            </h2>
          </motion.div>

          <div className="space-y-4">
            {nextUp.length > 0 ? nextUp.map(({ show, nextEpisode }, idx) => (
              <motion.div
                key={`${show.id}-${nextEpisode.date.toISOString()}`}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link to={`/music/shows/${show.slug}`}>
                  <div className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/5 border border-white/10 hover:border-purple-500/50 rounded-xl transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <RadioIcon className="w-8 h-8 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase group-hover:text-purple-400 transition-colors">
                          {show.title}
                        </h3>
                        <p className="text-white/50">{show.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-3xl font-mono font-black text-purple-400">
                          {nextEpisode.startTime}
                        </p>
                        <p className="text-sm text-white/50 uppercase">
                          {format(nextEpisode.date, 'EEE d MMM')}
                        </p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-white/30 group-hover:text-purple-500 group-hover:translate-x-2 transition-all" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/50">Schedule coming soon</p>
                <Link to="/music/schedule" className="inline-block mt-4">
                  <Button variant="outline" className="border-white/20 font-black uppercase">
                    VIEW FULL SCHEDULE
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="text-center mt-10">
            <Link to="/music/schedule">
              <Button className="bg-purple-500 hover:bg-white text-white hover:text-black font-black uppercase px-10 py-5 text-lg">
                <Calendar className="w-5 h-5 mr-3" />
                FULL SCHEDULE
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="py-32 px-6 bg-black text-center border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <RadioIcon className="w-20 h-20 mx-auto mb-8 text-purple-500" />
          <h2 className="text-4xl md:text-6xl font-black italic mb-6">
            TUNE IN<span className="text-purple-500">.</span>
          </h2>
          <p className="text-xl text-white/60 mb-10">
            The sound of London's queer underground. Always on.
          </p>
          <Button 
            onClick={openRadio}
            className="bg-purple-500 hover:bg-white text-white hover:text-black font-black uppercase px-14 py-8 text-2xl"
          >
            <Play className="w-8 h-8 mr-3" />
            LISTEN NOW
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
