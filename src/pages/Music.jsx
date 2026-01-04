import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Radio as RadioIcon, Music2, Disc, Play, Pause, Calendar, MapPin, ExternalLink, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRadio } from '@/components/shell/RadioContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

export default function Music() {
  const { isRadioOpen, openRadio } = useRadio();
  const [activeTab, setActiveTab] = useState('live');
  const [currentUser, setCurrentUser] = useState(null);

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

  // Fetch music events (beacons with audio)
  const { data: musicEvents = [] } = useQuery({
    queryKey: ['music-events'],
    queryFn: async () => {
      try {
        const allBeacons = await base44.entities.Beacon.filter({ active: true, status: 'published' });
        const today = new Date();
        // Filter to music events with audio_url
        return allBeacons
          .filter(b => b.audio_url && b.event_date && new Date(b.event_date) >= today)
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
          .slice(0, 12);
      } catch (error) {
        console.error('Failed to fetch music events:', error);
        return [];
      }
    },
    refetchInterval: 60000
  });

  // Fetch audio releases
  const { data: releases = [] } = useQuery({
    queryKey: ['audio-releases'],
    queryFn: async () => {
      try {
        const metadata = await base44.entities.AudioMetadata.list('-created_date', 20);
        if (!metadata || metadata.length === 0) return [];
        
        const beaconIds = metadata.map(m => m.beacon_id).filter(Boolean);
        if (beaconIds.length === 0) return metadata.map(m => ({ ...m, beacon: null }));
        
        const beacons = await Promise.all(
          beaconIds.map(id => base44.entities.Beacon.filter({ id }).then(b => b[0]).catch(() => null))
        );
        return metadata.map(m => ({
          ...m,
          beacon: beacons.find(b => b?.id === m.beacon_id) || null
        }));
      } catch (error) {
        console.error('Failed to fetch releases:', error);
        return [];
      }
    }
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&q=80" 
            alt="Music"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#B026FF]/40 to-black" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <RadioIcon className="w-20 h-20 mx-auto mb-6 drop-shadow-2xl" />
          <h1 className="text-7xl md:text-9xl font-black italic mb-6 drop-shadow-2xl">
            MUSIC
          </h1>
          <p className="text-2xl uppercase tracking-wider text-white/90 mb-8 drop-shadow-lg">
            Live radio first. Then the releases. Then the rabbit hole.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={openRadio}
              className="bg-[#B026FF] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg shadow-2xl"
            >
              <Play className="w-5 h-5 mr-2" />
              LISTEN LIVE
            </Button>
            <Button 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg shadow-2xl backdrop-blur-sm"
            >
              BROWSE SHOWS
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 mb-12">
            <TabsTrigger 
              value="live"
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black"
            >
              <RadioIcon className="w-4 h-4 mr-2" />
              LIVE
            </TabsTrigger>
            <TabsTrigger 
              value="shows"
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black"
            >
              <Music2 className="w-4 h-4 mr-2" />
              SHOWS
            </TabsTrigger>
            <TabsTrigger 
              value="releases"
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black"
            >
              <Disc className="w-4 h-4 mr-2" />
              RELEASES
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <div className="bg-white/5 border-2 border-white/10 p-8 text-center">
              <div className="w-32 h-32 bg-[#B026FF] flex items-center justify-center mx-auto mb-6 animate-pulse">
                <RadioIcon className="w-16 h-16" />
              </div>
              <h3 className="text-3xl font-black uppercase mb-3">ON AIR NOW</h3>
              <p className="text-xl text-white/80 mb-2">HOTMESS RADIO</p>
              <p className="text-sm text-white/60 uppercase mb-8">24/7 LONDON OS SOUNDTRACK</p>
              <Button 
                onClick={openRadio}
                className="bg-[#B026FF] hover:bg-white text-black font-black uppercase px-12 py-6 text-lg"
              >
                {isRadioOpen ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    NOW PLAYING
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    LISTEN NOW
                  </>
                )}
              </Button>
            </div>

            <div className="mt-12">
              <h4 className="text-2xl font-black uppercase mb-6">NEXT UP</h4>
              <div className="grid gap-4">
                {[
                  { time: '22:00', show: 'HEAVY PULSE', host: 'DJ ARCHITECT' },
                  { time: '00:00', show: 'NIGHT HUNTER', host: 'SELECTOR X' },
                  { time: '02:00', show: 'DAWN PATROL', host: 'MORNING MESS' },
                ].map((slot, idx) => (
                  <div key={idx} className="bg-white/5 border-l-4 border-[#B026FF] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black uppercase text-lg">{slot.show}</p>
                        <p className="text-sm text-white/60">{slot.host}</p>
                      </div>
                      <p className="text-2xl font-mono font-bold text-[#B026FF]">{slot.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shows">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-black uppercase">UPCOMING SHOWS</h3>
                  <p className="text-white/60 uppercase text-sm tracking-wider">
                    Live sets, radio shows, and music events
                  </p>
                </div>
                <Link to={createPageUrl('Events')}>
                  <Button 
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
                  >
                    VIEW ALL EVENTS
                  </Button>
                </Link>
              </div>

              {musicEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {musicEvents.map((event) => (
                    <Link key={event.id} to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                      <div className="group relative aspect-[4/3] overflow-hidden bg-white/5 border-2 border-white/10 hover:border-[#B026FF] transition-all">
                        {event.image_url && (
                          <img 
                            src={event.image_url} 
                            alt={event.title}
                            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-end p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="px-2 py-1 bg-[#B026FF] text-black text-xs font-black uppercase">
                              MUSIC EVENT
                            </div>
                            {event.audio_url && (
                              <div className="px-2 py-1 bg-[#00D9FF] text-black text-xs font-black uppercase flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                AUDIO
                              </div>
                            )}
                          </div>
                          <h4 className="font-black text-xl mb-2 line-clamp-2">{event.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-white/80">
                            {event.event_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(event.event_date), 'MMM d, HH:mm')}
                              </div>
                            )}
                            {event.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.city}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/5 border-2 border-white/10">
                  <Music2 className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-2xl font-black mb-2">NO SHOWS SCHEDULED</h3>
                  <p className="text-white/60 mb-6">Check back soon for upcoming music events</p>
                  <Link to={createPageUrl('Events')}>
                    <Button 
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
                    >
                      BROWSE ALL EVENTS
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="releases">
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-black uppercase">RAW CONVICT RECORDS</h3>
                  <p className="text-white/60 uppercase text-sm tracking-wider">
                    Latest drops, catalogue, and trending tracks
                  </p>
                </div>
                {currentUser && currentUser.role === 'admin' && (
                  <Link to={createPageUrl('CreateBeacon')}>
                    <Button 
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
                    >
                      SUBMIT A RELEASE
                    </Button>
                  </Link>
                )}
              </div>
              
              {releases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {releases.map((release) => (
                    <div 
                      key={release.track_id}
                      className="group relative bg-white/5 border-2 border-white/10 hover:border-[#B026FF] transition-all p-4"
                    >
                      <div className="aspect-square bg-gradient-to-br from-[#B026FF]/20 to-black/40 mb-4 flex items-center justify-center">
                        <Disc className="w-16 h-16 text-[#B026FF] group-hover:animate-spin" style={{ animationDuration: '3s' }} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-[#B026FF] text-black text-[10px] font-black uppercase">
                            {release.mood}
                          </span>
                          <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black uppercase">
                            {release.bpm} BPM
                          </span>
                        </div>
                        
                        <h4 className="font-black uppercase text-sm line-clamp-2">
                          {release.beacon?.title || release.track_id}
                        </h4>
                        
                        {release.genre && (
                          <p className="text-xs text-white/60 uppercase">{release.genre}</p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <TrendingUp className="w-3 h-3" />
                            {release.play_count || 0} plays
                          </div>
                          
                          {release.soundcloud_url && (
                            <a 
                              href={release.soundcloud_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-[#FF1493] text-black hover:bg-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {release.beacon && (
                          <Link 
                            to={createPageUrl(`BeaconDetail?id=${release.beacon.id}`)}
                            className="block mt-2"
                          >
                            <Button 
                              variant="outline"
                              className="w-full border-white/20 text-white hover:bg-white hover:text-black text-xs font-black uppercase"
                            >
                              VIEW DETAILS
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/5 border-2 border-white/10">
                  <Disc className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-2xl font-black mb-2">NO RELEASES YET</h3>
                  <p className="text-white/60 mb-6">Label catalogue coming soon</p>
                  {currentUser && currentUser.role === 'admin' && (
                    <Link to={createPageUrl('CreateBeacon')}>
                      <Button 
                        className="bg-[#B026FF] hover:bg-white text-black font-black uppercase"
                      >
                        ADD FIRST RELEASE
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}