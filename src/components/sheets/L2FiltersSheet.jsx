/**
 * L2FiltersSheet — Discovery + Market filters
 *
 * When opened from GhostedMode (context='discovery' or no context):
 *   - Age range (18-99)
 *   - Distance radius (km)
 *   - Vibe/intent multi-select
 *   - Online-only toggle
 *   Saves to localStorage key `hm_ghosted_filters`.
 *
 * When opened from MarketMode (context='market' or onApply prop passed):
 *   - Category, Condition, Max Price, Sort By (legacy behaviour)
 */

import { useState } from 'react';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, Check } from 'lucide-react';

// ─── DISCOVERY constants ───────────────────────────────────────────────────

const VIBES = [
  'Hook-up', 'Dating', 'Friendship', 'Kink', 'Group fun',
  'Parties', 'Networking', 'Travel buddy',
];

const DISTANCE_OPTIONS = [1, 5, 10, 25, 50, 100];

const GHOSTED_FILTERS_KEY = 'hm_ghosted_filters';

export const defaultGhostedFilters = () => ({
  ageMin: 18,
  ageMax: 99,
  distanceKm: 50,
  vibes: /** @type {string[]} */ ([]),
  onlineOnly: false,
});

export const loadGhostedFilters = () => {
  try {
    const raw = localStorage.getItem(GHOSTED_FILTERS_KEY);
    if (!raw) return defaultGhostedFilters();
    return { ...defaultGhostedFilters(), ...JSON.parse(raw) };
  } catch {
    return defaultGhostedFilters();
  }
};

const saveGhostedFilters = (filters) => {
  try {
    localStorage.setItem(GHOSTED_FILTERS_KEY, JSON.stringify(filters));
    // Dispatch storage event so GhostedMode can react
    window.dispatchEvent(new StorageEvent('storage', {
      key: GHOSTED_FILTERS_KEY,
      newValue: JSON.stringify(filters),
    }));
  } catch {
    // ignore
  }
};

// ─── MARKET constants (legacy) ─────────────────────────────────────────────

const CATEGORIES = ['All', 'Clothing', 'Accessories', 'Shoes', 'Homeware', 'Tickets', 'Other'];
const CONDITIONS = ['Any', 'New', 'Like New', 'Good', 'Fair'];

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * @param {{ onApply?: Function, initialFilters?: Record<string, any>, context?: 'discovery' | 'market' }} props
 */
export default function L2FiltersSheet({ onApply, initialFilters = {}, context }) {
  const { closeSheet } = useSheet();

  // Determine mode: discovery (Ghosted) vs market
  const isDiscovery = !onApply && context !== 'market';

  // ── Discovery state ──────────────────────────────────────────────────────
  const saved = loadGhostedFilters();

  const [ageMin, setAgeMin] = useState(saved.ageMin);
  const [ageMax, setAgeMax] = useState(saved.ageMax);
  const [distanceKm, setDistanceKm] = useState(saved.distanceKm);
  const [vibes, setVibes] = useState(/** @type {string[]} */ (saved.vibes));
  const [onlineOnly, setOnlineOnly] = useState(saved.onlineOnly);

  // ── Market state ─────────────────────────────────────────────────────────
  const [category, setCategory] = useState(initialFilters.category || 'All');
  const [condition, setCondition] = useState(initialFilters.condition || 'Any');
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice || '');
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'newest');

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleVibe = (vibe) => {
    setVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const handleDiscoveryApply = () => {
    const filters = { ageMin, ageMax, distanceKm, vibes, onlineOnly };
    saveGhostedFilters(filters);
    closeSheet();
  };

  const handleDiscoveryReset = () => {
    const d = defaultGhostedFilters();
    setAgeMin(d.ageMin);
    setAgeMax(d.ageMax);
    setDistanceKm(d.distanceKm);
    setVibes(d.vibes);
    setOnlineOnly(d.onlineOnly);
  };

  const handleMarketApply = () => {
    const filters = {
      category: category !== 'All' ? category : null,
      condition: condition !== 'Any' ? condition : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      sortBy,
    };
    onApply?.(filters);
    closeSheet();
  };

  const handleMarketReset = () => {
    setCategory('All');
    setCondition('Any');
    setMaxPrice('');
    setSortBy('newest');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isDiscovery) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

          {/* Online Only toggle */}
          <div>
            <button
              onClick={() => setOnlineOnly((v) => !v)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-all',
                onlineOnly
                  ? 'bg-[#C8962C]/20 text-[#C8962C] border-[#C8962C]/40'
                  : 'bg-[#1C1C1E] text-white/60 border-white/10'
              )}
            >
              <span>Online Only</span>
              <div
                className={cn(
                  'w-11 h-6 rounded-full transition-colors flex items-center px-1',
                  onlineOnly ? 'bg-[#C8962C]' : 'bg-white/20'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full bg-white shadow transition-transform',
                    onlineOnly ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </div>
            </button>
          </div>

          {/* Age range */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
              Age Range: {ageMin} – {ageMax}
            </label>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-white/40 mb-1">
                  <span>Min: {ageMin}</span>
                  <span>18 – 99</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={ageMax - 1}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  className="w-full accent-[#C8962C] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-white/40 mb-1">
                  <span>Max: {ageMax}</span>
                </div>
                <input
                  type="range"
                  min={ageMin + 1}
                  max={99}
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  className="w-full accent-[#C8962C] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Distance */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
              Distance: up to {distanceKm === 100 ? '100+ km' : `${distanceKm} km`}
            </label>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDistanceKm(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                    distanceKm === d
                      ? 'bg-[#C8962C] text-black'
                      : 'bg-[#1C1C1E] text-white/60 border border-white/10'
                  )}
                >
                  {d === 100 ? '100+' : d} km
                </button>
              ))}
            </div>
          </div>

          {/* Vibe / Intent */}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
              Vibe / Intent
            </label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((vibe) => {
                const active = vibes.includes(vibe);
                return (
                  <button
                    key={vibe}
                    onClick={() => toggleVibe(vibe)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5',
                      active
                        ? 'bg-[#C8962C] text-black'
                        : 'bg-[#1C1C1E] text-white/60 border border-white/10'
                    )}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {vibe}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-white/8 flex gap-3">
          <button
            onClick={handleDiscoveryReset}
            className="flex-1 bg-[#1C1C1E] text-white/60 font-bold text-sm rounded-2xl py-3.5 border border-white/10 active:scale-95 transition-transform"
          >
            Reset
          </button>
          <button
            onClick={handleDiscoveryApply}
            className="flex-2 flex-grow-[2] bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Apply Filters
          </button>
        </div>
      </div>
    );
  }

  // ── Market mode (legacy) ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

        {/* Category */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                  category === c
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-[#1C1C1E] text-white/60 border border-white/10'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
            Condition
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                  condition === c
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-[#1C1C1E] text-white/60 border border-white/10'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Max price */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
            Max Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">£</span>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Any"
              min="0"
              step="1"
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-7 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-3">
            Sort By
          </label>
          <div className="space-y-2">
            {[
              { value: 'newest', label: 'Newest First' },
              { value: 'price-asc', label: 'Price: Low to High' },
              { value: 'price-desc', label: 'Price: High to Low' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm font-bold text-left flex items-center justify-between transition-all',
                  sortBy === opt.value
                    ? 'bg-[#C8962C]/20 text-[#C8962C] border border-[#C8962C]/30'
                    : 'bg-[#1C1C1E] text-white/60 border border-white/5'
                )}
              >
                {opt.label}
                {sortBy === opt.value && <span className="text-[#C8962C]">✓</span>}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="px-4 py-4 border-t border-white/8 flex gap-3">
        <button
          onClick={handleMarketReset}
          className="flex-1 bg-[#1C1C1E] text-white/60 font-bold text-sm rounded-2xl py-3.5 border border-white/10 active:scale-95 transition-transform"
        >
          Reset
        </button>
        <button
          onClick={handleMarketApply}
          className="flex-2 flex-grow-[2] bg-[#C8962C] text-black font-black text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Apply Filters
        </button>
      </div>
    </div>
  );
}
