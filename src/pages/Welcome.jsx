import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Radio, ShoppingBag, Shield, Sparkles, ChevronRight, Globe, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = ['intro', 'city', 'modes', 'safety', 'done'];

const CITIES = [
  { id: 'london', name: 'London', emoji: '🇬🇧', vibe: 'Underground' },
  { id: 'berlin', name: 'Berlin', emoji: '🇩🇪', vibe: 'Techno' },
  { id: 'paris', name: 'Paris', emoji: '🇫🇷', vibe: 'Chic' },
  { id: 'tokyo', name: 'Tokyo', emoji: '🇯🇵', vibe: 'Neon' },
  { id: 'nyc', name: 'New York', emoji: '🇺🇸', vibe: 'Hustle' },
  { id: 'los_angeles', name: 'Los Angeles', emoji: '🌴', vibe: 'Scene' },
  { id: 'san_francisco', name: 'San Francisco', emoji: '🌉', vibe: 'Tech' },
  { id: 'sydney', name: 'Sydney', emoji: '🇦🇺', vibe: 'Beach' },
];

const MODES = [
  { 
    id: 'explore', 
    name: 'EXPLORE', 
    desc: 'Discover the scene, browse profiles, see what\'s on',
    icon: Globe,
    color: 'from-[#00D9FF] to-[#0891B2]',
    glow: 'shadow-glow-cyan'
  },
  { 
    id: 'now', 
    name: 'RIGHT NOW', 
    desc: 'Connect tonight — 30min to 3hr windows, real intent',
    icon: Zap,
    color: 'from-[#FF1493] to-[#B026FF]',
    glow: 'shadow-glow-hot'
  },
  { 
    id: 'radio', 
    name: 'RADIO', 
    desc: 'Live sets, DJ culture, curated soundscapes',
    icon: Radio,
    color: 'from-[#B026FF] to-[#E879F9]',
    glow: 'shadow-glow-purple'
  },
  { 
    id: 'market', 
    name: 'MARKET', 
    desc: 'Drops, merch, P2P commerce, ticket resale',
    icon: ShoppingBag,
    color: 'from-[#FFD700] to-[#FF6B35]',
    glow: 'shadow-glow-gold'
  }
];

const Welcome = () => {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [selectedModes, setSelectedModes] = useState(['explore']);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const next = () => {
    if (step === STEPS.length - 1) {
      localStorage.setItem('hotmess_onboarded', 'true');
      localStorage.setItem('hotmess_city', city);
      localStorage.setItem('hotmess_modes', JSON.stringify(selectedModes));
      navigate('/');
    } else {
      setStep(s => s + 1);
    }
  };

  const toggleMode = (id) => {
    setSelectedModes(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const slideVariants = {
    enter: { x: 100, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-50" />
      
      {/* Cursor glow effect */}
      <div 
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle, rgba(255,20,147,0.15) 0%, transparent 70%)',
          left: mousePos.x - 250,
          top: mousePos.y - 250,
        }}
      />
      
      {/* Noise texture */}
      <div className="fixed inset-0 noise pointer-events-none z-10" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#FF1493] to-[#00D9FF]"
          initial={{ width: '0%' }}
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Step indicators */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        {STEPS.map((_, i) => (
          <div 
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-[#FF1493]' : i < step ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {/* Step 0: Intro */}
          {step === 0 && (
            <motion.div
              key="intro"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-2xl"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h1 className="text-[15vw] md:text-[10vw] font-black italic leading-[0.85] tracking-tighter mb-6">
                  <span className="text-white">HOT</span>
                  <span className="text-gradient-hot">MESS</span>
                </h1>
              </motion.div>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-xl md:text-2xl text-white/70 mb-4 uppercase tracking-[0.2em]"
              >
                The Living World
              </motion.p>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-sm md:text-base text-white/40 mb-12 uppercase tracking-widest"
              >
                Nights • Radio • Connection • Commerce
              </motion.p>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Button 
                  onClick={next}
                  className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black uppercase px-12 py-6 text-lg shadow-glow-hot transition-all duration-300 group"
                >
                  <span>ENTER</span>
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 1: City Selection */}
          {step === 1 && (
            <motion.div
              key="city"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-xl w-full"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-2"
              >
                <MapPin className="w-12 h-12 mx-auto text-[#00D9FF] mb-4" />
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-black uppercase mb-3"
              >
                YOUR <span className="text-[#00D9FF]">CITY</span>
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/50 uppercase tracking-wider text-sm mb-8"
              >
                City-level only • No GPS • No tracking
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 gap-3 mb-8"
              >
                {CITIES.map((c, i) => (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    onClick={() => setCity(c.id)}
                    className={`p-4 text-left transition-all duration-300 border-2 ${
                      city === c.id 
                        ? 'bg-[#00D9FF] border-[#00D9FF] text-black shadow-glow-cyan' 
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.emoji}</span>
                      <div>
                        <p className="font-black uppercase text-sm">{c.name}</p>
                        <p className={`text-xs uppercase tracking-wider ${city === c.id ? 'text-black/60' : 'text-white/40'}`}>
                          {c.vibe}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
              
              <Button 
                onClick={next}
                disabled={!city}
                className="bg-[#00D9FF] hover:bg-white text-black font-black uppercase px-12 py-6 text-lg disabled:opacity-30 disabled:cursor-not-allowed shadow-glow-cyan transition-all duration-300"
              >
                CONTINUE
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Mode Selection */}
          {step === 2 && (
            <motion.div
              key="modes"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-2xl w-full"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Sparkles className="w-12 h-12 mx-auto text-[#B026FF] mb-4" />
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-black uppercase mb-3"
              >
                YOUR <span className="text-[#B026FF]">VIBE</span>
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/50 uppercase tracking-wider text-sm mb-8"
              >
                Select what you're here for • Change anytime
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-3 mb-8"
              >
                {MODES.map((m, i) => {
                  const Icon = m.icon;
                  const isSelected = selectedModes.includes(m.id);
                  
                  return (
                    <motion.button
                      key={m.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      onClick={() => toggleMode(m.id)}
                      className={`w-full p-5 text-left transition-all duration-300 border-2 group ${
                        isSelected 
                          ? `bg-gradient-to-r ${m.color} border-transparent ${m.glow}` 
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-black/20' : 'bg-white/10'
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-white/60'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`font-black uppercase text-lg ${isSelected ? 'text-white' : 'text-white'}`}>
                            {m.name}
                          </p>
                          <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-white/50'}`}>
                            {m.desc}
                          </p>
                        </div>
                        <div className={`w-6 h-6 border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-white border-white' : 'border-white/30'
                        }`}>
                          {isSelected && <div className="w-3 h-3 bg-black" />}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
              
              <Button 
                onClick={next}
                className="bg-[#B026FF] hover:bg-white text-white hover:text-black font-black uppercase px-12 py-6 text-lg shadow-glow-purple transition-all duration-300"
              >
                CONTINUE
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 3: Safety */}
          {step === 3 && (
            <motion.div
              key="safety"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-xl"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#39FF14] to-[#00D9FF] flex items-center justify-center shadow-glow-green">
                  <Shield className="w-12 h-12 text-black" />
                </div>
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-black uppercase mb-4"
              >
                WE GOT <span className="text-[#39FF14]">YOU</span>
              </motion.h2>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 mb-10"
              >
                <div className="glass p-4 text-left">
                  <p className="text-white/80 text-sm">
                    <span className="text-[#39FF14] font-black">→</span> City-level signals only — no precise GPS
                  </p>
                </div>
                <div className="glass p-4 text-left">
                  <p className="text-white/80 text-sm">
                    <span className="text-[#39FF14] font-black">→</span> "Right Now" statuses auto-expire — no ghost trails
                  </p>
                </div>
                <div className="glass p-4 text-left">
                  <p className="text-white/80 text-sm">
                    <span className="text-[#39FF14] font-black">→</span> Safety check-ins built into the experience
                  </p>
                </div>
                <div className="glass p-4 text-left">
                  <p className="text-white/80 text-sm">
                    <span className="text-[#39FF14] font-black">→</span> Report, block, disappear — all one tap
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  onClick={next}
                  className="bg-[#39FF14] hover:bg-white text-black font-black uppercase px-12 py-6 text-lg shadow-glow-green transition-all duration-300"
                >
                  GOT IT
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <motion.div
              key="done"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center max-w-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mb-8"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#FF1493] via-[#B026FF] to-[#00D9FF] flex items-center justify-center animate-glow-pulse">
                  <Heart className="w-16 h-16 text-white" />
                </div>
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-5xl md:text-7xl font-black uppercase mb-4"
              >
                WELCOME TO THE
              </motion.h1>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-6xl md:text-8xl font-black italic text-gradient-hot mb-8"
              >
                MESS
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/50 uppercase tracking-widest mb-10"
              >
                Your city: {CITIES.find(c => c.id === city)?.name || 'London'} • Your vibe is set
              </motion.p>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button 
                  onClick={next}
                  className="bg-gradient-to-r from-[#FF1493] to-[#B026FF] hover:from-white hover:to-white text-white hover:text-black font-black uppercase px-16 py-8 text-xl shadow-glow-hot-lg transition-all duration-300 group"
                >
                  <span>LET'S GO</span>
                  <Sparkles className="w-6 h-6 ml-3 group-hover:animate-spin-slow" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Welcome;
