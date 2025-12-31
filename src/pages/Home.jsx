import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapPin, ShoppingBag, Users, Radio, Heart, Calendar, Zap, ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TutorialTooltip from '../components/tutorial/TutorialTooltip';

const COLLECTIONS = [
  { id: 'raw', name: 'RAW', tagline: 'Hardwear. Clean lines. Loud intent.', color: '#000000' },
  { id: 'hung', name: 'HUNG', tagline: "Fit that doesn't ask permission.", color: '#FF1493' },
  { id: 'high', name: 'HIGH', tagline: 'Club armour. Daylight optional.', color: '#B026FF' },
  { id: 'super', name: 'SUPER', tagline: 'Limited. Unapologetic. Gone fast.', color: '#00D9FF' },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);

  const { data: recentBeacons = [] } = useQuery({
    queryKey: ['recent-beacons'],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({ active: true }, '-created_date', 6);
      return beacons;
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => base44.entities.Product.filter({ status: 'active' }, '-created_date', 3)
  });

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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#FF1493]/10 to-black" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-6 max-w-6xl"
        >
          <h1 className="text-[20vw] md:text-[12vw] font-black italic leading-[0.8] tracking-tighter mb-8">
            HOT<span className="text-[#FF1493]">MESS</span>
          </h1>
          <p className="text-2xl md:text-4xl font-bold uppercase tracking-wider mb-4">
            LONDON OS
          </p>
          <p className="text-base md:text-xl text-white/60 uppercase tracking-widest mb-12 max-w-3xl mx-auto">
            RAW / HUNG / HIGH / SUPER + HNH MESS. No filler. No shame.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to={createPageUrl('Connect')}>
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg">
                <Users className="w-5 h-5 mr-2" />
                CONNECT NOW
              </Button>
            </Link>
            <Link to={createPageUrl('Marketplace')}>
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                <ShoppingBag className="w-5 h-5 mr-2" />
                SHOP THE DROP
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* SHOP COLLECTIONS */}
      <section className="py-32 px-6 bg-white text-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-4">COLLECTIONS</p>
            <h2 className="text-6xl md:text-8xl font-black italic mb-6">SHOP THE DROP</h2>
            <p className="text-xl uppercase tracking-wider text-black/60 max-w-2xl">
              Hardwear. Fit. Club armour. Limited runs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {COLLECTIONS.map((col, idx) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link to={createPageUrl('Marketplace')}>
                  <div className="group relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: col.color }}>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                      <h3 className="text-6xl font-black italic mb-4 text-white">{col.name}</h3>
                      <p className="text-sm uppercase tracking-widest text-white/80">{col.tagline}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {products.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group"
                >
                  <Link to={createPageUrl(`ProductDetail?id=${product.id}`)}>
                    <div className="aspect-square bg-black mb-4 overflow-hidden">
                      {product.image_urls?.[0] && (
                        <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      )}
                    </div>
                    <h3 className="font-black uppercase text-lg mb-2">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[#FF1493] font-bold">{product.price_xp} XP</span>
                      <span className="text-black/40">•</span>
                      <span className="text-black/60">£{product.price_gbp}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONNECT */}
      <section className="py-32 px-6 bg-[#FF1493] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-4">DISCOVERY</p>
              <h2 className="text-6xl md:text-8xl font-black italic mb-8">FIND YOUR TRIBE</h2>
              <p className="text-xl mb-8 leading-relaxed">
                Compatibility-first discovery. No swiping. No ghosts. Just good chemistry backed by real data.
              </p>
              <Link to={createPageUrl('Connect')}>
                <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4 text-lg">
                  START CONNECTING
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-black/20 backdrop-blur-sm p-6 border-2 border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">RIGHT NOW</h3>
                </div>
                <p className="text-white/80 text-sm uppercase tracking-wide">
                  30min–Tonight. Can host / Travel / Hotel. Real time, real intent.
                </p>
              </div>
              <div className="bg-black/20 backdrop-blur-sm p-6 border-2 border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase">BROWSE</h3>
                </div>
                <p className="text-white/80 text-sm uppercase tracking-wide">
                  Explore profiles. Filter by vibes, tribes, boundaries. Your pace.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BEACONS */}
      <section className="py-32 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-4">EVENTS</p>
            <h2 className="text-6xl md:text-8xl font-black italic mb-6 text-white">
              TONIGHT<span className="text-[#00D9FF]">.</span>
            </h2>
            <p className="text-xl uppercase tracking-wider text-white/60 max-w-2xl">
              Live beacon network. Real-time intensity. Verified check-ins.
            </p>
          </motion.div>

          {recentBeacons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {recentBeacons.map((beacon, idx) => (
                <motion.div
                  key={beacon.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                    <div className="group bg-white/5 border border-white/10 p-6 hover:border-[#00D9FF] transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="px-2 py-1 bg-[#00D9FF] text-black text-xs font-black uppercase">
                          {beacon.kind}
                        </div>
                        <MapPin className="w-4 h-4 text-white/40" />
                      </div>
                      <h3 className="font-black text-xl mb-2 text-white">{beacon.title}</h3>
                      <p className="text-sm text-white/60 mb-3 line-clamp-2">{beacon.description}</p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Calendar className="w-3 h-3" />
                        <span className="uppercase">{beacon.city}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center">
            <Link to={createPageUrl('Events')}>
              <Button className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase px-8 py-4 text-lg">
                VIEW ALL EVENTS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* RADIO + CARE */}
      <section className="py-32 px-6 bg-[#B026FF] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Radio className="w-12 h-12" />
                <h2 className="text-5xl font-black italic">RADIO</h2>
              </div>
              <p className="text-xl mb-8 leading-relaxed text-white/90">
                24/7 stream. London OS soundtrack. No ads. Just frequency.
              </p>
              <Link to={createPageUrl('Radio')}>
                <Button className="bg-black text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4">
                  LISTEN NOW
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-12 h-12" />
                <h2 className="text-5xl font-black italic">CARE</h2>
              </div>
              <p className="text-xl mb-8 leading-relaxed text-white/90">
                Aftercare checklists. Emergency contacts. Community resources. Because preparation isn't paranoia.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[#B026FF] font-black uppercase">
                  LEARN MORE
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 bg-black text-white text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-6xl md:text-9xl font-black italic mb-8">
            JOIN<span className="text-[#FF1493]">.</span>
          </h2>
          <p className="text-2xl uppercase tracking-wider text-white/60 mb-12">
            London OS. No ghost status. Right now ends automatically.
          </p>
          {currentUser ? (
            <div className="space-y-4">
              <p className="text-xl text-[#39FF14]">Welcome back, {currentUser.full_name}</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to={createPageUrl('Connect')}>
                  <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-8 py-6 text-lg">
                    GO RIGHT NOW
                  </Button>
                </Link>
                <Link to={createPageUrl('Globe')}>
                  <Button variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                    VIEW GLOBE
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Link to={createPageUrl('Onboarding')}>
              <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase px-12 py-8 text-2xl">
                GET STARTED
              </Button>
            </Link>
          )}
        </motion.div>
      </section>

      <TutorialTooltip page="home" />
    </div>
  );
}