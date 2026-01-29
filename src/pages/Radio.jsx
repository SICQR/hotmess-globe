import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Radio as RadioIcon, Calendar, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { schedule } from '../components/radio/radioUtils';
import { useRadio } from '../components/shell/RadioContext';

export default function Radio() {
  const { openRadio } = useRadio();
  const [heroLoaded, setHeroLoaded] = useState(false);

  const LIVE_STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';
  const HNHMESS_SOUNDCLOUD_EMBED_HTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%3Atracks%3A2243204375%3Fsecret_token%3Ds-jK7AWO2CQ6t&color=%23a35624&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe><div style="font-size: 10px; color: #cccccc;line-break: anywhere;word-break: normal;overflow: hidden;white-space: nowrap;text-overflow: ellipsis; font-family: Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif;font-weight: 100;"><a href="https://soundcloud.com/rawconvictrecords" title="Raw Convict Records" target="_blank" style="color: #cccccc; text-decoration: none;">Raw Convict Records</a> · <a href="https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t" title="HNH MESS" target="_blank" style="color: #cccccc; text-decoration: none;">HNH MESS</a></div>`;

  // Use shows directly from schedule (now includes color and image)
  const shows = schedule.shows;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero with Background Image */}
      <div className="relative overflow-hidden border-b-2 border-white min-h-[70vh] flex items-end">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={schedule.heroImage || '/images/radio/hotmess-radio-hero.jpg'}
            alt="HOTMESS RADIO"
            className={`w-full h-full object-cover object-center transition-opacity duration-700 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setHeroLoaded(true)}
          />
          {/* Fallback gradient while loading */}
          <div className={`absolute inset-0 bg-gradient-to-br from-[#FF1493]/30 to-[#00D9FF]/30 transition-opacity duration-700 ${heroLoaded ? 'opacity-0' : 'opacity-100'}`} />
          {/* Bottom gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight mb-2 drop-shadow-lg">
              HOTMESS RADIO
            </h1>
            <p className="text-xl md:text-2xl font-bold text-white/90 mb-2 drop-shadow-md">
              ALWAYS TOO MUCH, YET NEVER ENOUGH.
            </p>
            <p className="text-sm text-white/70 mb-8">
              hotmessldm.com/radio
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Button 
                onClick={openRadio}
                size="lg"
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-white font-black uppercase gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                Listen Live
              </Button>
              <Link to={createPageUrl('RadioSchedule')}>
                <Button variant="outline" size="lg" className="border-white/40 bg-black/50 backdrop-blur text-white font-black uppercase">
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live Player Section */}
      <div className="bg-gradient-to-b from-black to-zinc-900 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <p className="text-xs text-white/60 uppercase tracking-wider mb-4 font-bold">
              Live Stream
            </p>
            <audio
              controls
              preload="none"
              crossOrigin="anonymous"
              className="w-full"
            >
              <source src={LIVE_STREAM_URL} />
            </audio>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-4 font-bold">
                Featured: HNHMESS
              </p>
              <div dangerouslySetInnerHTML={{ __html: HNHMESS_SOUNDCLOUD_EMBED_HTML }} />
            </div>
          </div>
        </div>
      </div>

      {/* Show Cards */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black uppercase tracking-tight mb-8 text-center">
          Our Shows
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {shows.map((show, idx) => (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link to={`/music/shows/${show.slug}`}>
                <div className="group bg-black border-2 border-white hover:border-[#FF1493] transition-all overflow-hidden h-full rounded-lg">
                  <div className={`aspect-square bg-gradient-to-br ${show.color || 'from-[#FF1493] to-[#B026FF]'} relative overflow-hidden`}>
                    {show.image ? (
                      <img 
                        src={show.image} 
                        alt={show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RadioIcon className="w-20 h-20 text-white/20" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-black uppercase mb-2 group-hover:text-[#FF1493] transition-colors">
                      {show.title}
                    </h3>
                    <p className="text-white/60 mb-4 text-sm">
                      {show.tagline}
                    </p>
                    <p className="text-white/40 text-xs mb-4 line-clamp-2">
                      {show.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs uppercase font-black text-[#FF1493]">
                      View Show
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Links */}
      <div className="border-t-2 border-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link to={createPageUrl('Home')} className="text-white/60 hover:text-white uppercase font-bold">
              Care
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/market" className="text-white/60 hover:text-white uppercase font-bold">
              Shop
            </Link>
            <span className="text-white/20">•</span>
            <Link to={createPageUrl('Home')} className="text-white/60 hover:text-white uppercase font-bold">
              Affiliate
            </Link>
            <span className="text-white/20">•</span>
            <Link to={createPageUrl('Settings')} className="text-white/60 hover:text-white uppercase font-bold">
              Legal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}