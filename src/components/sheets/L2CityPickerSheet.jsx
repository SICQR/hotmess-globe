/**
 * L2CityPickerSheet
 * Bottom sheet for selecting a city — globe flies to the chosen location.
 *
 * Props (via SheetContext):
 *   currentCity  — currently selected city name
 *   onSelect     — callback(cityName: string) called when user picks a city
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Check } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

const AMBER = '#C8962C';
const CARD_BG = '#1C1C1E';
const MUTED = '#8E8E93';

// City catalogue — lat/lng used in GlobeContext flyTo via setSelectedCity
const CITIES = [
  { name: 'London',        flag: '🇬🇧', vibe: 'The original mess' },
  { name: 'Berlin',        flag: '🇩🇪', vibe: 'Techno never sleeps' },
  { name: 'New York',      flag: '🇺🇸', vibe: 'Always on' },
  { name: 'Barcelona',     flag: '🇪🇸', vibe: 'Late nights, golden light' },
  { name: 'Amsterdam',     flag: '🇳🇱', vibe: 'Canals and chaos' },
  { name: 'Paris',         flag: '🇫🇷', vibe: 'Après minuit' },
  { name: 'Los Angeles',   flag: '🇺🇸', vibe: 'Chaos in the sun' },
  { name: 'Tokyo',         flag: '🇯🇵', vibe: 'Neon dreams' },
];

export default function L2CityPickerSheet() {
  const { closeSheet, activeSheets } = useSheet();

  // Pull props injected by openSheet('city-picker', { currentCity, onSelect })
  const sheetProps = activeSheets?.find((s) => s.type === 'city-picker')?.props ?? {};
  const { currentCity = 'London', onSelect } = sheetProps;

  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? CITIES.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : CITIES;

  const handlePick = useCallback(
    (cityName) => {
      onSelect?.(cityName);
      closeSheet();
    },
    [onSelect, closeSheet]
  );

  return (
    <motion.div
      key="city-picker-sheet"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      className="fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl overflow-hidden"
      style={{
        background: '#0D0D0D',
        borderTop: `1px solid rgba(255,255,255,0.08)`,
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Pick a city"
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-9 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: AMBER }} />
          <h2 className="text-white font-black text-sm uppercase tracking-wider">
            Change City
          </h2>
        </div>
        <button
          onClick={closeSheet}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div
          className="flex items-center gap-2 px-3 h-10 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 focus:outline-none"
            aria-label="Search cities"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <X className="w-3.5 h-3.5 text-white/30" />
            </button>
          )}
        </div>
      </div>

      {/* City list */}
      <div className="px-3 space-y-1.5 max-h-72 overflow-y-auto overscroll-contain">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: MUTED }}>
              No cities matched
            </p>
          ) : (
            filtered.map((city) => {
              const isActive = city.name === currentCity;
              return (
                <motion.button
                  key={city.name}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handlePick(city.name)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:scale-[0.98] transition-transform"
                  style={{
                    background: isActive
                      ? `${AMBER}14`
                      : CARD_BG,
                    border: `1px solid ${isActive ? `${AMBER}35` : 'rgba(255,255,255,0.06)'}`,
                  }}
                  aria-pressed={isActive}
                >
                  <span className="text-xl leading-none">{city.flag}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className="text-sm font-bold"
                      style={{ color: isActive ? AMBER : 'white' }}
                    >
                      {city.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: MUTED }}>
                      {city.vibe}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
                  )}
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
