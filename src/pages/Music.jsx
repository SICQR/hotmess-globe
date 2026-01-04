import React, { useState } from 'react';
import { Radio as RadioIcon, Music2, Disc, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRadio } from '@/components/shell/RadioContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Music() {
  const { isRadioOpen, toggleRadio, openRadio } = useRadio();
  const [activeTab, setActiveTab] = useState('live');

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
            <div className="text-center py-12">
              <Music2 className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <h3 className="text-2xl font-black mb-2">SHOWS COMING SOON</h3>
              <p className="text-white/60">Browse shows, episodes, and clips</p>
            </div>
          </TabsContent>

          <TabsContent value="releases">
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-black uppercase">RAW CONVICT RECORDS</h3>
                  <p className="text-white/60 uppercase text-sm tracking-wider">
                    New drops, catalogue, and what's playing this week
                  </p>
                </div>
                <Button 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
                >
                  SUBMIT A RELEASE
                </Button>
              </div>
              
              <div className="text-center py-12">
                <Disc className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-2xl font-black mb-2">RELEASES COMING SOON</h3>
                <p className="text-white/60">Label catalogue and new drops</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}