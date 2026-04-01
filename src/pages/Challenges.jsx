import React from 'react';
import { Target } from 'lucide-react';

export default function Challenges() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
          DAILY <span className="text-[#C8962C]">CHALLENGES</span>
        </h1>
        <p className="text-white/60 uppercase text-sm tracking-wider mb-8">
          Complete challenges. Build streaks.
        </p>
        <div className="border-2 border-white/10 p-12 text-center">
          <Target className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg font-bold">Challenges dropping soon</p>
          <p className="text-white/30 text-sm mt-2">
            Daily and weekly challenges for the community. Watch this space.
          </p>
        </div>
      </div>
    </div>
  );
}
