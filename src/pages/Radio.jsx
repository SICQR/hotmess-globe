import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio as RadioIcon, Calendar, Play, ArrowRight, Disc, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { schedule, getNextEpisode } from '../components/radio/radioUtils';
import { useRadio } from '../components/shell/RadioContext';
import { format } from 'date-fns';

export default function Radio() {
  const { openRadio, isRadioOpen } = useRadio();
  const releasesRef = useRef(null);

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

  // RAW CONVICT RECORDS releases (separate from HOTMESS RADIO)
  const releases = [
    { id: 1, title: 'HNHMESS', artist: 'Raw Convict', cover: '/images/hero/radio-cover.jpg', year: '2024', soundcloud: '#' },
    { id: 2, title: 'LATE NIGHT VOL.1', artist: 'Various', cover: '/images/hero/hero-pink.jpg', year: '2024', soundcloud: '#' },
    { id: 3, title: 'UNDERGROUND', artist: 'Raw Convict', cover: '/images/hero/hero-red.jpg', year: '2024', soundcloud: '#' },
    { id: 4, title: 'AFTER HOURS', artist: 'Various', cover: '/images/hero/hero-green.jpg', year: '2023', soundcloud: '#' },
    { id: 5, title: 'DARK ROOM EP', artist: 'Raw Convict', cover: '/images/hero/hero-main.png', year: '2023', soundcloud: '#' },
  ];

  const scrollReleases = (direction) => {
    if (releasesRef.current) {
      const scrollAmount = 300;
      releasesRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HOTMESS RADIO HERO - The Live Station */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hotmess-radio-hero.png" 
            alt="HOTMESS Radio" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/90 via-black/80 to-black" />
        </div>

        {/* Animated radio waves */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-2 border-pink-500/30"
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-pink-500/20"
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-pink-500/10"
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
            <span className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-lg uppercase tracking-[0.3em] font-bold">LIVE NOW</span>
          </div>

          <h1 className="text-[12vw] md:text-[8vw] font-black italic leading-[0.85] tracking-tighter mb-4">
            HOTMESS
          </h1>
          <h2 className="text-[8vw] md:text-[5vw] font-black italic leading-[0.85] tracking-tighter mb-8 text-pink-500">
            RADIO<span className="text-white">.</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-white/70 mb-4 max-w-2xl mx-auto">
            The heartbeat of London's queer underground
          </p>

          <p className="text-base md:text-lg text-white/50 mb-12 max-w-xl mx-auto">
            24/7 live stream. DJ culture. Shows that care about the community. This is our frequency.
          </p>

          <div className="flex flex-wrap gap-6 justify-center">
            <Button 
              onClick={openRadio}
              variant="hot" size="lg" className="font-black uppercase px-12 text-xl"
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
              className="w-1.5 h-1.5 bg-pink-500 rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* 2. SHOWS SECTION */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-purple-950/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">PROGRAMMING</p>
            <h2 className="text-5xl md:text-7xl font-black italic mb-6">
              THE SHOWS<span className="text-pink-500">.</span>
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
                  <div className="group relative h-[500px] overflow-hidden rounded-2xl border border-white/10 hover:border-pink-500/50 transition-all">
                    <div className={`absolute inset-0 bg-gradient-to-br ${
                      idx === 0 ? 'from-pink-500/40 to-black/60' :
                      idx === 1 ? 'from-white/20 to-black/60' :
                      'from-white/10 to-black/60'
                    }`} />
                    
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
                        <div className="flex items-center gap-2 text-sm font-black text-pink-500 group-hover:text-white transition-colors">
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

      {/* 3. NEXT UP */}
      <section className="py-20 px-6 bg-black border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">SCHEDULE</p>
            <h2 className="text-4xl md:text-5xl font-black italic mb-4">
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
                  <div className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/5 border border-white/10 hover:border-pink-500/50 rounded-xl transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-pink-500/20 rounded-lg flex items-center justify-center">
                        <RadioIcon className="w-8 h-8 text-pink-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase group-hover:text-pink-500 transition-colors">
                          {show.title}
                        </h3>
                        <p className="text-white/50">{show.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-3xl font-mono font-black text-pink-500">
                          {nextEpisode.startTime}
                        </p>
                        <p className="text-sm text-white/50 uppercase">
                          {format(nextEpisode.date, 'EEE d MMM')}
                        </p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-white/30 group-hover:text-pink-500 group-hover:translate-x-2 transition-all" />
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
        </div>
      </section>

      {/* 4. RAW CONVICT RECORDS - THE LABEL (Separate from Radio) */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-orange-950/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-orange-400 mb-4">THE LABEL</p>
              <h2 className="text-4xl md:text-6xl font-black italic mb-4">
                RAW CONVICT<br/>RECORDS<span className="text-orange-500">.</span>
              </h2>
              <p className="text-lg text-white/50 mt-4 max-w-xl">
                Independent label. Underground releases. No compromise. The sound of London's queer nightlife, pressed and distributed.
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
            className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {releases.map((release, idx) => (
              <motion.div
                key={release.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex-shrink-0 w-72 snap-start"
              >
                <div className="group">
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-4 border border-white/10 group-hover:border-orange-500/50 transition-all">
                    <img 
                      src={release.cover} 
                      alt={release.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button className="bg-orange-500 hover:bg-white text-black font-black uppercase">
                        <Play className="w-5 h-5 mr-2" />
                        PLAY
                      </Button>
                    </div>
                    <div className="absolute top-3 left-3 px-3 py-1 bg-orange-500 text-black text-xs font-black uppercase rounded-full">
                      {release.year}
                    </div>
                  </div>
                  <h3 className="font-black uppercase text-xl group-hover:text-orange-400 transition-colors">{release.title}</h3>
                  <p className="text-white/50">{release.artist}</p>
                </div>
              </motion.div>
            ))}
            {/* View All Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-72 snap-start"
            >
              <Link to="/music/releases" className="group block">
                <div className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:border-orange-500 transition-colors">
                  <Disc className="w-20 h-20 text-white/30 group-hover:text-orange-500 transition-colors mb-4" />
                  <span className="font-black uppercase text-lg text-white/50 group-hover:text-white transition-colors">VIEW ALL RELEASES</span>
                  <ArrowRight className="w-6 h-6 text-white/30 group-hover:text-orange-500 mt-3 transition-colors" />
                </div>
              </Link>
            </motion.div>
          </div>

          {/* SoundCloud Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <a 
              href="https://soundcloud.com/rawconvictrecords" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-orange-500/10 border border-orange-500/30 rounded-full hover:bg-orange-500 hover:text-black transition-all font-black uppercase"
            >
              <ExternalLink className="w-5 h-5" />
              FOLLOW ON SOUNDCLOUD
            </a>
          </motion.div>
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
          <RadioIcon className="w-20 h-20 mx-auto mb-8 text-pink-500" />
          <h2 className="text-4xl md:text-6xl font-black italic mb-6">
            TUNE IN<span className="text-pink-500">.</span>
          </h2>
          <p className="text-xl text-white/60 mb-10">
            The sound of London's queer underground. Always on.
          </p>
          <Button 
            onClick={openRadio}
            variant="hot" size="lg" className="font-black uppercase px-14 text-2xl"
          >
            <Play className="w-8 h-8 mr-3" />
            LISTEN NOW
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
