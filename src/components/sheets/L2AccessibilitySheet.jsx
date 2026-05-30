/**
 * L2AccessibilitySheet -- Accessibility settings
 * Text size, reduce motion, high contrast -- saved to localStorage
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const LS_KEY = 'hm_accessibility';

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-11 h-6 rounded-full transition-all relative flex-shrink-0',
        enabled ? 'bg-[#C8962C]' : 'bg-white/15'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
        enabled ? 'left-5' : 'left-0.5'
      )} />
    </button>
  );
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

const TEXT_SIZES = [
  { key: 'small', label: 'Small' },
  { key: 'default', label: 'Default' },
  { key: 'large', label: 'Large' },
];

export default function L2AccessibilitySheet() {
  const [prefs, setPrefs] = useState(() => ({
    textSize: 'default',
    reduceMotion: false,
    highContrast: false,
    ...loadPrefs(),
  }));

  useEffect(() => {
    savePrefs(prefs);

    // Apply reduce motion
    if (prefs.reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    // Apply high contrast
    if (prefs.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Apply text size
    document.documentElement.dataset.textSize = prefs.textSize;
  }, [prefs]);

  const update = (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }));
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-1">
        Accessibility
      </p>

      {/* Text Size */}
      <div className="bg-[#1C1C1E] rounded-2xl p-4">
        <p className="text-white font-bold text-sm mb-1">Text Size</p>
        <p className="text-white/40 text-xs mb-3">Adjust the base text size across the app</p>
        <div className="flex gap-2">
          {TEXT_SIZES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => update('textSize', key)}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
                prefs.textSize === key
                  ? 'bg-[#C8962C] text-black'
                  : 'bg-white/5 text-white/40 border border-white/10'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Reduce Motion */}
      <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">Reduce Motion</p>
          <p className="text-white/40 text-xs mt-0.5">
            Limit animations and transitions
          </p>
        </div>
        <Toggle
          enabled={prefs.reduceMotion}
          onToggle={() => update('reduceMotion', !prefs.reduceMotion)}
        />
      </div>

      {/* High Contrast */}
      <div className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">High Contrast</p>
          <p className="text-white/40 text-xs mt-0.5">
            Increase text and border contrast
          </p>
        </div>
        <Toggle
          enabled={prefs.highContrast}
          onToggle={() => update('highContrast', !prefs.highContrast)}
        />
      </div>
    </div>
  );
}
