/**
 * AmbientGlobe — Lightweight 2D canvas globe for non-Pulse routes.
 *
 * Renders an atmospheric, non-interactive animated canvas:
 *   - Gold heat dots for cities
 *   - Sparkle particles drifting across the field
 *   - Subtle grid lines and city connection arcs
 *   - Gradient overlays for depth
 *
 * Zero React UI overlays, zero interactivity, zero heavy hooks.
 * Runs at ~30 fps via frame-skip to keep CPU usage trivial.
 */

import { useEffect, useRef, memo } from 'react';

const CITIES = [
  { name: 'London',    lat: 51.5,   lng: -0.12,   energy: 0.9  },
  { name: 'Berlin',    lat: 52.52,  lng: 13.4,    energy: 0.85 },
  { name: 'Paris',     lat: 48.85,  lng: 2.35,    energy: 0.7  },
  { name: 'Tokyo',     lat: 35.68,  lng: 139.69,  energy: 0.8  },
  { name: 'NYC',       lat: 40.71,  lng: -74.0,   energy: 0.75 },
  { name: 'LA',        lat: 34.05,  lng: -118.24, energy: 0.65 },
  { name: 'Sydney',    lat: -33.87, lng: 151.21,  energy: 0.6  },
  { name: 'São Paulo', lat: -23.55, lng: -46.63,  energy: 0.7  },
  { name: 'SF',        lat: 37.77,  lng: -122.42, energy: 0.72 },
];

const GOLD = '#C8962C';
const GOLD_GLOW = 'rgba(200,150,44,';   // append opacity + ')'
const WHITE_DIM = 'rgba(255,255,255,';

const toXY = (lat, lng, w, h) => ({
  x: ((lng + 180) / 360) * w,
  y: ((90 - lat) / 180) * h,
});

function AmbientGlobe() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef(
    Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
    })),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Size canvas to container (2x for retina)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    let frame = 0;
    const draw = () => {
      frame++;
      // Run at ~30 fps by skipping every other frame
      if (frame % 2 !== 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const w = W();
      const h = H();

      // Fade trail
      ctx.fillStyle = 'rgba(5,5,7,0.12)';
      ctx.fillRect(0, 0, w, h);

      // Radial gold glow (centre)
      const grd = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.45);
      grd.addColorStop(0, `${GOLD_GLOW}0.06)`);
      grd.addColorStop(0.5, `${GOLD_GLOW}0.02)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // Grid lines (very faint)
      ctx.strokeStyle = `${GOLD_GLOW}0.03)`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i / 16) * h);
        ctx.lineTo(w, (i / 16) * h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((i / 16) * w, 0);
        ctx.lineTo((i / 16) * w, h);
        ctx.stroke();
      }

      // Particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 100) p.vx *= -1;
        if (p.y < 0 || p.y > 100) p.vy *= -1;
        const px = (p.x / 100) * w;
        const py = (p.y / 100) * h;
        const twinkle = 0.4 + 0.6 * Math.sin(frame * 0.01 + p.x * 0.3);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${WHITE_DIM}${(p.opacity * twinkle).toFixed(3)})`;
        ctx.fill();
      });

      // City heat dots + glow
      CITIES.forEach((city) => {
        const pos = toXY(city.lat, city.lng, w, h);
        const breathe = Math.sin(frame * 0.008) * 0.15 + 0.85;
        const e = city.energy * breathe;
        const r = 3 + e * 5;

        // Outer glow
        const cg = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 2.5);
        cg.addColorStop(0, `${GOLD_GLOW}${(e * 0.5).toFixed(2)})`);
        cg.addColorStop(0.6, `${GOLD_GLOW}${(e * 0.15).toFixed(2)})`);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `${WHITE_DIM}${(e * 0.9).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // City connections (faint gold arcs)
      ctx.strokeStyle = `${GOLD_GLOW}0.04)`;
      ctx.lineWidth = 0.8;
      CITIES.forEach((c1, i) => {
        CITIES.slice(i + 1).forEach((c2) => {
          const p1 = toXY(c1.lat, c1.lng, w, h);
          const p2 = toXY(c2.lat, c2.lng, w, h);
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          if (dist < w * 0.35) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.55 }}
      />
      {/* Top + bottom vignette for content readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/80 via-transparent to-[#050507]/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/40 via-transparent to-[#050507]/40 pointer-events-none" />
    </div>
  );
}

export default memo(AmbientGlobe);
