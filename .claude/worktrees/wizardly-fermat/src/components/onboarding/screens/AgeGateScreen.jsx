/**
 * AgeGateScreen — Birth year + male confirmation.
 * Under-18 → BlockedScreen. Non-male → BlockedScreen.
 * Stores age_gate_passed in sessionStorage (user not yet authed).
 */
import React, { useState, useMemo } from 'react';
import BlockedScreen from './BlockedScreen';

const GOLD = '#C8962C';
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 81 }, (_, i) => currentYear - i);

function ProgressDots({ current, total }) {
  return (
    <div className="flex gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="text-xs"
          style={{ color: i < current ? GOLD : '#333' }}
        >
          {i < current ? '●' : '○'}
        </span>
      ))}
    </div>
  );
}

export { ProgressDots };

export default function AgeGateScreen({ onComplete }) {
  const [birthYear, setBirthYear] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [blocked, setBlocked] = useState(null);

  const age = useMemo(() => {
    if (!birthYear) return null;
    return currentYear - Number(birthYear);
  }, [birthYear]);

  // Immediate block on under-18
  if (blocked === 'age' || (age !== null && age < 18)) {
    return <BlockedScreen reason="age" />;
  }

  if (blocked === 'gender') {
    return <BlockedScreen reason="gender" />;
  }

  const canContinue = birthYear && age >= 18 && confirmed;

  const handleContinue = () => {
    if (!canContinue) return;
    // Store in sessionStorage — will be applied after auth
    try {
      sessionStorage.setItem('hm_age_gate_passed', 'true');
      sessionStorage.setItem('hm_age_gate_year', birthYear);
    } catch {}
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        {/* HOTMESS wordmark */}
        <p className="text-2xl font-black italic tracking-tight text-white mb-8 select-none">
          HOT<span style={{ color: '#C8962C' }}>MESS</span>
        </p>
        <ProgressDots current={1} total={5} />
        <h2 className="text-white text-xl font-bold mb-2">Verify your age</h2>
        <p className="text-white/40 text-sm mb-8">You must be 18+ to enter.</p>

        {/* Birth year dropdown */}
        <div className="mb-6">
          <select
            value={birthYear}
            onChange={(e) => {
              setBirthYear(e.target.value);
              const y = Number(e.target.value);
              if (y && currentYear - y < 18) {
                setBlocked('age');
              }
            }}
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none appearance-none text-base"
            style={{ borderBottomColor: birthYear ? GOLD : '#333' }}
          >
            <option value="">Year of birth</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Male confirmation checkbox */}
        <label className="flex items-start gap-3 mb-10 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-[#333] accent-[#C8962C] bg-black"
          />
          <span className="text-white/70 text-sm leading-tight">
            I confirm I am a man aged 18 or over
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide transition-opacity"
          style={{
            backgroundColor: GOLD,
            opacity: canContinue ? 1 : 0.3,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
