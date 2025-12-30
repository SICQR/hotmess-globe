import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio as RadioIcon, Play, Pause, Music, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Radio() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  // SoundCloud track/playlist IDs for RAW Convict Records
  const featuredPlaylists = [
    {
      id: 1,
      title: 'RAW Convict Records - Latest',
      embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords&color=%23ff1493&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true',
      type: 'profile'
    }
  ];

  const liveStream = {
    title: 'RAW Convict Radio - Live 24/7',
    streamUrl: 'https://listen.radioking.com/radio/736103/stream/802454',
    description: 'Non-stop underground techno, house, and drag performances'
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
              <RadioIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">RAW CONVICT RADIO</h1>
              <p className="text-white/60 uppercase tracking-wider text-sm">UNDERGROUND PULSE • 24/7</p>
            </div>
          </div>
        </motion.div>

        {/* XP Earning Info */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border-2 border-[#FFEB3B] rounded-none p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <Zap className="w-8 h-8 text-[#FFEB3B] flex-shrink-0" />
              <div>
                <h3 className="font-black text-lg mb-2 uppercase">EARN XP WHILE LISTENING</h3>
                <p className="text-white/80 text-sm mb-3">
                  Keep the stream active to earn 10 XP every 5 minutes. Support the underground and level up.
                </p>
                <div className="flex items-center gap-2 text-xs text-[#FFEB3B] font-bold uppercase">
                  <TrendingUp className="w-4 h-4" />
                  Your XP: {currentUser.xp || 0}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="live" className="uppercase tracking-wider">Live Stream</TabsTrigger>
            <TabsTrigger value="soundcloud" className="uppercase tracking-wider">SoundCloud</TabsTrigger>
            <TabsTrigger value="mixes" className="uppercase tracking-wider">DJ Mixes</TabsTrigger>
          </TabsList>

          {/* Live Stream Tab */}
          <TabsContent value="live">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border-2 border-[#FF1493] rounded-none p-8"
            >
              <div className="flex items-start gap-6 mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-black uppercase mb-2">{liveStream.title}</h2>
                  <p className="text-white/60 mb-4">{liveStream.description}</p>
                  
                  {/* Audio Player */}
                  <audio
                    controls
                    className="w-full mb-4"
                    style={{
                      filter: 'invert(1) hue-rotate(180deg)',
                      height: '40px'
                    }}
                  >
                    <source src={liveStream.streamUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://soundcloud.com/rawconvictrecords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5500] hover:bg-[#FF5500]/90 text-white font-bold rounded-none uppercase tracking-wider text-sm transition-colors"
                    >
                      <Music className="w-4 h-4" />
                      SoundCloud
                    </a>
                    <a
                      href="https://www.instagram.com/rawconvictrecords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#833AB4] to-[#E1306C] hover:opacity-90 text-white font-bold rounded-none uppercase tracking-wider text-sm transition-opacity"
                    >
                      Instagram
                    </a>
                  </div>
                </div>

                {/* Visualizer */}
                <div className="hidden md:flex gap-2">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-[#FF1493] rounded-full animate-pulse"
                      style={{
                        height: `${30 + Math.random() * 70}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.5 + Math.random() * 0.5}s`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Stream Info */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
                    <span className="font-bold text-sm">LIVE</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Genre</div>
                  <div className="font-bold text-sm">TECHNO • HOUSE</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Listeners</div>
                  <div className="font-bold text-sm">LIVE NOW</div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* SoundCloud Tab */}
          <TabsContent value="soundcloud">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Banner */}
              <div className="relative h-64 bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border-2 border-[#FF1493] rounded-none overflow-hidden">
                <img
                  src="https://i1.sndcdn.com/visuals-000000164488-oG7j49-original.jpg"
                  alt="RAW Convict Records"
                  className="w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex items-end p-8">
                  <div>
                    <h2 className="text-4xl font-black uppercase mb-2">RAW CONVICT RECORDS</h2>
                    <p className="text-white/80 uppercase tracking-wider">UNDERGROUND • TECHNO • HOUSE • DRAG</p>
                  </div>
                </div>
              </div>

              {/* Featured Widget */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-black uppercase">FEATURED TRACKS</h3>
                </div>
                <iframe
                  width="100%"
                  height="450"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords&color=%23ff1493&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=true"
                  className="w-full"
                />
              </div>

              {/* All Tracks */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-black uppercase">ALL RELEASES</h3>
                </div>
                <div className="p-6">
                  <iframe
                    width="100%"
                    height="800"
                    scrolling="yes"
                    frameBorder="no"
                    allow="autoplay"
                    src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords/tracks&color=%23ff1493&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Playlists */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-black uppercase">PLAYLISTS & SETS</h3>
                </div>
                <div className="p-6">
                  <iframe
                    width="100%"
                    height="800"
                    scrolling="yes"
                    frameBorder="no"
                    allow="autoplay"
                    src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords/sets&color=%23ff1493&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Likes & Reposts */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h3 className="text-xl font-black uppercase">LIKES & REPOSTS</h3>
                </div>
                <div className="p-6">
                  <iframe
                    width="100%"
                    height="800"
                    scrolling="yes"
                    frameBorder="no"
                    allow="autoplay"
                    src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords/likes&color=%23ff1493&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
                    className="w-full"
                  />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* DJ Mixes Tab */}
          <TabsContent value="mixes">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Playlists/Sets from RAW Convict */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-2xl font-black uppercase">DJ SETS & MIXES</h2>
                  <p className="text-white/60 mt-2">Curated sets from RAW Convict Records artists</p>
                </div>
                <div className="p-6">
                  <iframe
                    width="100%"
                    height="800"
                    scrolling="yes"
                    frameBorder="no"
                    allow="autoplay"
                    src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords/sets&color=%23ff1493&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Popular Tracks Widget */}
              <div className="bg-white/5 border border-white/10 rounded-none overflow-hidden">
                <div className="p-6 border-b border-white/10">
                  <h2 className="text-2xl font-black uppercase">POPULAR TRACKS</h2>
                </div>
                <iframe
                  width="100%"
                  height="450"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rawconvictrecords/popular-tracks&color=%23ff1493&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=true"
                  className="w-full"
                />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}