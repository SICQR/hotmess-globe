import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldPulse } from '@/contexts/WorldPulseContext';
import { createChoreographer, ZOOM_STATES, VISUAL_STATES } from '@/lib/globe/zoomChoreography';
import { VISUAL_TYPES, ANIMATIONS, getVisualType, TIME_JITTER } from '@/lib/globe/visualLanguage';
import { canRender, filterRenderableTiles } from '@/lib/globe/canRender';
import { loadCityPack, getVisibleZones, isInPeakWindow } from '@/lib/globe/cityLoader';
import { isDisabled } from '@/lib/safety/killSwitch';

const CITIES = [
  { id: 'london', name: 'London', lat: 51.5, lng: -0.12, energy: 0.9 },
  { id: 'berlin', name: 'Berlin', lat: 52.52, lng: 13.4, energy: 0.85 },
  { id: 'paris', name: 'Paris', lat: 48.85, lng: 2.35, energy: 0.7 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.68, lng: 139.69, energy: 0.8 },
  { id: 'new_york', name: 'NYC', lat: 40.71, lng: -74.0, energy: 0.75 },
  { id: 'los_angeles', name: 'LA', lat: 34.05, lng: -118.24, energy: 0.65 },
  { id: 'sydney', name: 'Sydney', lat: -33.87, lng: 151.21, energy: 0.6 },
  { id: 'sao_paulo', name: 'São Paulo', lat: -23.55, lng: -46.63, energy: 0.7 },
  { id: 'san_francisco', name: 'SF', lat: 37.77, lng: -122.42, energy: 0.72 },
];

const latLngToXY = (lat, lng, width, height) => {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
};

// Visual language colors
const COLORS = {
  heat: { base: '#FF1493', glow: 'rgba(255,20,147,0.4)' },
  pulse: { base: '#FFD700', glow: 'rgba(255,215,0,0.4)' },
  wave: { base: '#00FF88', glow: 'rgba(0,255,136,0.3)' },
  sparkle: { base: '#FFFFFF', glow: 'rgba(255,255,255,0.2)' },
};

export default function GlobeHero() {
  const canvasRef = useRef(null);
  const [activePulse, setActivePulse] = useState(null);
  const [hoveredCity, setHoveredCity] = useState(null);
  const [zoomState, setZoomState] = useState(ZOOM_STATES.WORLD);
  const [visualConfig, setVisualConfig] = useState(VISUAL_STATES[ZOOM_STATES.WORLD]);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityPack, setCityPack] = useState(null);
  const [dwellTimer, setDwellTimer] = useState(null);
  const [showContextCard, setShowContextCard] = useState(null);
  const [modeMenu, setModeMenu] = useState(false);
  
  const { pulses, emitPulse } = useWorldPulse();
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const choreographerRef = useRef(null);

  // Initialize choreographer
  useEffect(() => {
    choreographerRef.current = createChoreographer({
      onStateChange: ({ from, to, visual, animate, duration }) => {
        setZoomState(to);
        setVisualConfig(visual);
      },
      onGesture: ({ type, action, position, target }) => {
        if (action === 'show_context_card' && target) {
          setShowContextCard(target);
        } else if (action === 'mode_switch') {
          setModeMenu(true);
        } else if (action === 'texture_zones' && selectedCity) {
          // Load city zones on dwell
          loadCityData(selectedCity);
        }
      },
    });
    
    return () => choreographerRef.current?.destroy();
  }, [selectedCity]);

  // Load city pack when zoomed in
  const loadCityData = useCallback(async (cityId) => {
    if (!cityId || currentZoom < 3) return;
    const pack = await loadCityPack(cityId, currentZoom);
    if (pack) setCityPack(pack);
  }, [currentZoom]);

  // Initialize particles (sparkles)
  useEffect(() => {
    particlesRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      type: 'sparkle', // Visual language: sparkle = discovery
    }));
  }, []);

  // Animate canvas with visual language
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width / 2, height / 2);

      // World glow at WORLD zoom (visual language)
      if (visualConfig.glow) {
        const glowGradient = ctx.createRadialGradient(
          width / 4, height / 4, 0,
          width / 4, height / 4, Math.min(width, height) / 3
        );
        glowGradient.addColorStop(0, 'rgba(255, 20, 147, 0.15)');
        glowGradient.addColorStop(0.5, 'rgba(255, 20, 147, 0.05)');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width / 2, height / 2);
      }

      // Draw grid lines (fades at higher zoom)
      const gridOpacity = zoomState === ZOOM_STATES.WORLD ? 0.05 : 0.02;
      ctx.strokeStyle = `rgba(255, 20, 147, ${gridOpacity})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i / 20) * height / 2);
        ctx.lineTo(width / 2, (i / 20) * height / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((i / 20) * width / 2, 0);
        ctx.lineTo((i / 20) * width / 2, height / 2);
        ctx.stroke();
      }

      // Draw sparkles (visual language: sparkle = discovery)
      if (visualConfig.sparkles) {
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > 100) p.vx *= -1;
          if (p.y < 0 || p.y > 100) p.vy *= -1;

          const px = (p.x / 100) * width / 2;
          const py = (p.y / 100) * height / 2;
          
          // Twinkle animation (from visual language)
          const twinkle = visualConfig.sparkles === 'fading' 
            ? 0.3 
            : 0.5 + 0.5 * Math.sin(frame * 0.02 + p.x);
          
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * twinkle})`;
          ctx.fill();
        });
      }

      // Draw city heat points (visual language: heat = presence)
      CITIES.forEach((city) => {
        // Safety check: skip killed cities
        if (isDisabled(city.id)) return;
        
        const pos = latLngToXY(city.lat, city.lng, width / 2, height / 2);
        
        // Breathe animation (from visual language)
        const breathe = Math.sin(frame * 0.015) * 0.2 + 0.8;
        const energy = city.energy * breathe;
        
        // Different rendering based on zoom state
        const isSelected = selectedCity === city.id;
        let radius, color;
        
        if (visualConfig.cities === 'dots') {
          radius = 4 + energy * 6;
          color = COLORS.heat;
        } else if (visualConfig.cities === 'emerging') {
          radius = 6 + energy * 10;
          color = COLORS.heat;
        } else if (visualConfig.cities === 'full') {
          radius = 8 + energy * 15;
          color = isSelected ? COLORS.pulse : COLORS.heat;
        } else {
          return; // Don't render at higher zooms
        }

        // Heat glow (outer)
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2);
        gradient.addColorStop(0, color.glow.replace('0.4', String(energy * 0.8)));
        gradient.addColorStop(0.5, color.glow.replace('0.4', String(energy * 0.3)));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(255, 255, 255, ${energy})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw radio waves if active (visual language: wave = radio energy)
      if (activePulse?.type === 'wave') {
        const city = CITIES.find(c => c.name === activePulse.city);
        if (city) {
          const pos = latLngToXY(city.lat, city.lng, width / 2, height / 2);
          const waveProgress = (frame % 60) / 60;
          const waveRadius = 20 + waveProgress * 80;
          const waveOpacity = 0.5 * (1 - waveProgress);
          
          ctx.strokeStyle = `rgba(0, 255, 136, ${waveOpacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw connections between nearby cities
      if (visualConfig.cities) {
        ctx.strokeStyle = 'rgba(255, 20, 147, 0.08)';
        ctx.lineWidth = 1;
        CITIES.forEach((city1, i) => {
          if (isDisabled(city1.id)) return;
          CITIES.slice(i + 1).forEach((city2) => {
            if (isDisabled(city2.id)) return;
            const p1 = latLngToXY(city1.lat, city1.lng, width / 2, height / 2);
            const p2 = latLngToXY(city2.lat, city2.lng, width / 2, height / 2);
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (dist < 150) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          });
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [visualConfig, zoomState, selectedCity, activePulse]);

  // Simulate pulses with visual language types
  useEffect(() => {
    const interval = setInterval(() => {
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const types = ['heat', 'pulse', 'wave']; // Visual language types
      setActivePulse({ 
        city: city.name, 
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: TIME_JITTER.apply(new Date()) // Apply time jitter for safety
      });
      setTimeout(() => setActivePulse(null), 3000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle wheel for zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    const newZoom = Math.max(0, Math.min(20, currentZoom + delta));
    setCurrentZoom(newZoom);
    choreographerRef.current?.setZoom(newZoom);
  }, [currentZoom]);

  // Handle city click
  const handleCityClick = useCallback((city) => {
    setSelectedCity(city.id);
    // Zoom to city level
    setCurrentZoom(5);
    choreographerRef.current?.setZoom(5);
    loadCityData(city.id);
  }, [loadCityData]);

  // Handle long press for mode switch
  const handleLongPress = useCallback((e) => {
    e.preventDefault();
    setModeMenu(true);
  }, []);

  // Handle tap for context card
  const handleTap = useCallback((city) => {
    if (activePulse?.city === city.name) {
      setShowContextCard({
        type: activePulse.type,
        city: city.name,
        data: { energy: city.energy }
      });
    }
  }, [activePulse]);

  return (
    <div 
      className="relative w-full h-full min-h-[80vh] overflow-hidden bg-black"
      onWheel={handleWheel}
      onContextMenu={handleLongPress}
    >
      {/* Canvas background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full opacity-80"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 text-xs text-white/40 font-mono">
        {zoomState.toUpperCase()} • z{currentZoom.toFixed(1)}
      </div>

      {/* City labels - only show based on visual config */}
      {visualConfig.labels && (
        <div className="absolute inset-0 pointer-events-none">
          {CITIES.map((city) => {
            if (isDisabled(city.id)) return null;
            const pos = latLngToXY(city.lat, city.lng, 100, 100);
            const showLabel = 
              visualConfig.labels === 'city_only' ||
              (visualConfig.labels === 'on_intent' && (hoveredCity === city.name || selectedCity === city.id));
            
            if (!showLabel && visualConfig.labels !== 'zone_names') return null;
            
            return (
              <motion.div
                key={city.id}
                className="absolute cursor-pointer pointer-events-auto"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: selectedCity === city.id ? 1 : 0.6 }}
                onClick={() => handleCityClick(city)}
                onMouseEnter={() => setHoveredCity(city.name)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <div className="text-[10px] uppercase tracking-widest text-pink-500 whitespace-nowrap">
                  {city.name}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Active pulse notification */}
      <AnimatePresence>
        {activePulse && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute bottom-8 left-1/2 bg-black/80 backdrop-blur-md border border-pink-500/50 rounded-full px-6 py-3 cursor-pointer"
            onClick={() => handleTap(CITIES.find(c => c.name === activePulse.city))}
          >
            <div className="flex items-center gap-3">
              <span 
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: COLORS[activePulse.type]?.base || COLORS.heat.base }}
              />
              <span className="text-sm font-medium">
                <span className="text-pink-500">{activePulse.city}</span>
                <span className="text-white/60 ml-2">{activePulse.type}</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context card (on tap) */}
      <AnimatePresence>
        {showContextCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-6 min-w-[250px]"
            onClick={() => setShowContextCard(null)}
          >
            <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
              {showContextCard.type}
            </div>
            <div className="text-xl font-bold text-white mb-3">
              {showContextCard.city}
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <div className="text-white/40">Energy</div>
                <div className="text-pink-500">{Math.round((showContextCard.data?.energy || 0) * 100)}%</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode switch menu (long press) */}
      <AnimatePresence>
        {modeMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/95 backdrop-blur-xl border border-pink-500/30 rounded-2xl p-4"
            onClick={() => setModeMenu(false)}
          >
            <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Switch Mode</div>
            <div className="flex gap-2">
              {['Explore', 'Now', 'Radio'].map(mode => (
                <button
                  key={mode}
                  className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/40 rounded-full text-sm text-white transition-colors"
                  onClick={() => {
                    setModeMenu(false);
                    // Emit mode change
                    emitPulse?.({ type: 'mode_change', mode: mode.toLowerCase() });
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50 pointer-events-none" />
    </div>
  );
}
