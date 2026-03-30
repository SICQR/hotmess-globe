/**
 * AppBanner — 4 visual variants for placement-based banners
 *
 * Variants:
 *   hero   — full-width image bg, large text, CTA button
 *   strip  — thin horizontal bar with text + optional CTA
 *   card   — rounded card with image, text, CTA
 *   subtle — minimal text-only hint with link
 *
 * Usage:
 *   <AppBanner placement="home_hero" variant="hero" />
 *   <AppBanner placement="ghosted_top" variant="strip" />
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { fetchBanner } from '@/services/AppBannerService';

export function AppBanner({ placement, variant = 'card', className = '', onDismiss }) {
  const [banner, setBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    fetchBanner(placement).then((b) => {
      if (mounted) setBanner(b);
    });
    return () => { mounted = false; };
  }, [placement]);

  if (!banner || dismissed) return null;

  const handleCta = () => {
    if (!banner.cta_url) return;
    if (banner.cta_url.startsWith('http')) {
      window.open(banner.cta_url, '_blank', 'noopener');
    } else {
      navigate(banner.cta_url);
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    onDismiss?.();
  };

  const bgColor = banner.bg_color || '#1C1C1E';
  const accentColor = banner.accent_color || '#C8962C';

  // ── HERO ──
  if (variant === 'hero') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`relative w-full overflow-hidden rounded-2xl ${className}`}
          style={{ backgroundColor: bgColor }}
          onClick={handleCta}
        >
          {banner.image_url && (
            <div className="absolute inset-0">
              <img
                src={banner.image_url}
                alt=""
                className="w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>
          )}
          <div className="relative p-6 min-h-[180px] flex flex-col justify-end">
            {banner.badge_text && (
              <span
                className="inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-black uppercase mb-2"
                style={{ backgroundColor: accentColor, color: '#000' }}
              >
                {banner.badge_text}
              </span>
            )}
            <h2 className="text-xl font-black uppercase leading-tight text-white">
              {banner.headline}
            </h2>
            {banner.subline && (
              <p className="text-sm text-white/60 mt-1">{banner.subline}</p>
            )}
            {banner.track_lyric_quote && (
              <p className="text-xs italic text-white/40 mt-2">"{banner.track_lyric_quote}"</p>
            )}
            {banner.cta_text && (
              <button
                className="mt-3 px-5 py-2 rounded-xl text-xs font-black uppercase w-fit transition-colors active:scale-[0.97]"
                style={{ backgroundColor: accentColor, color: '#000' }}
                onClick={handleCta}
              >
                {banner.cta_text}
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60"
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── STRIP ──
  if (variant === 'strip') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`w-full overflow-hidden ${className}`}
          style={{ backgroundColor: bgColor }}
          onClick={handleCta}
        >
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {banner.badge_text && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black uppercase"
                  style={{ backgroundColor: accentColor, color: '#000' }}
                >
                  {banner.badge_text}
                </span>
              )}
              <span className="text-xs font-bold text-white/80 truncate">
                {banner.headline}
              </span>
              {banner.subline && (
                <span className="text-[10px] text-white/40 truncate hidden sm:inline">
                  {banner.subline}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {banner.cta_text && (
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color: accentColor }}
                >
                  {banner.cta_text}
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── SUBTLE ──
  if (variant === 'subtle') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${className}`}
          onClick={handleCta}
        >
          <Sparkles className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
          <span className="text-[11px] text-white/50">
            {banner.headline}
          </span>
          {banner.cta_text && (
            <span className="text-[11px] font-bold" style={{ color: accentColor }}>
              {banner.cta_text}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── CARD (default) ──
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className={`relative overflow-hidden rounded-2xl border border-white/8 ${className}`}
        style={{ backgroundColor: bgColor }}
        onClick={handleCta}
      >
        {banner.image_url && (
          <div className="h-32 overflow-hidden">
            <img
              src={banner.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          {banner.badge_text && (
            <span
              className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mb-2"
              style={{ backgroundColor: accentColor, color: '#000' }}
            >
              {banner.badge_text}
            </span>
          )}
          <h3 className="text-sm font-black uppercase text-white leading-tight">
            {banner.headline}
          </h3>
          {banner.subline && (
            <p className="text-xs text-white/50 mt-1">{banner.subline}</p>
          )}
          {banner.track_lyric_quote && (
            <p className="text-[10px] italic text-white/30 mt-1.5">"{banner.track_lyric_quote}"</p>
          )}
          {banner.cta_text && (
            <button
              className="mt-3 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors active:scale-[0.97]"
              style={{ backgroundColor: accentColor, color: '#000' }}
              onClick={handleCta}
            >
              {banner.cta_text}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AppBanner;
