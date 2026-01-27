import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Radio as RadioIcon, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { schedule } from '../components/radio/radioUtils';
import { useRadio } from '../components/shell/RadioContext';

export default function Radio() {
  const { openRadio } = useRadio();

  const LIVE_STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';
  const HNHMESS_SOUNDCLOUD_EMBED_HTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%3Atracks%3A2243204375%3Fsecret_token%3Ds-jK7AWO2CQ6t&color=%23a35624&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe><div style="font-size: 10px; color: #cccccc;line-break: anywhere;word-break: normal;overflow: hidden;white-space: nowrap;text-overflow: ellipsis; font-family: Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif;font-weight: 100;"><a href="https://soundcloud.com/rawconvictrecords" title="Raw Convict Records" target="_blank" style="color: #cccccc; text-decoration: none;">Raw Convict Records</a> · <a href="https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t" title="HNH MESS" target="_blank" style="color: #cccccc; text-decoration: none;">HNH MESS</a></div>`;

  const shows = [
    {
      ...schedule.shows[0],
      color: 'from-[#E62020] to-[#B026FF]'
    },
    {
      ...schedule.shows[1],
      color: 'from-[#00D9FF] to-[#39FF14]'
    },
    {
      ...schedule.shows[2],
      color: 'from-[#FFEB3B] to-[#FF6B35]'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b-2 border-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E62020]/20 to-[#00D9FF]/20" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <RadioIcon className="w-12 h-12 text-[#E62020]" />
              <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tight">
                HOTMESS RADIO
              </h1>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white/80 mb-12">
              24/7. Three tentpoles. One rule: care-first.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button 
                onClick={openRadio}
                variant="cyan"
                size="xl"
                className="font-black uppercase"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Listen Live
              </Button>
              <Link to={createPageUrl('RadioSchedule')}>
                <Button variant="glass" size="xl" className="border-white/20 font-black uppercase">
                  <Calendar className="w-5 h-5 mr-2" />
                  See Schedule
                </Button>
              </Link>
            </div>

            <div className="mt-10 max-w-xl mx-auto">
              <div className="bg-black/40 border border-white/20 p-4">
                <p className="text-xs text-white/60 uppercase tracking-wider mb-3">
                  Live stream player
                </p>
                <audio
                  controls
                  preload="none"
                  crossOrigin="anonymous"
                  className="w-full"
                >
                  <source src={LIVE_STREAM_URL} />
                </audio>

                <div className="mt-6">
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-3">
                    HNHMESS
                  </p>
                  <div dangerouslySetInnerHTML={{ __html: HNHMESS_SOUNDCLOUD_EMBED_HTML }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Show Cards */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {shows.map((show, idx) => (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link to={`/music/shows/${show.slug}`}>
                <div className="group bg-black border-2 border-white hover:border-[#E62020] transition-all overflow-hidden h-full">
                  <div className={`h-48 bg-gradient-to-br ${show.color} relative overflow-hidden`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RadioIcon className="w-20 h-20 text-white/20" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-black uppercase mb-3 group-hover:text-[#E62020] transition-colors">
                      {show.title}
                    </h3>
                    <p className="text-white/60 mb-6 text-sm">
                      {show.tagline}
                    </p>
                    <div className="flex items-center gap-2 text-xs uppercase font-black text-[#E62020]">
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