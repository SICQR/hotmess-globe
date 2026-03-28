/**
 * CarePage — Hand N Hand wellbeing page
 * Aftercare tips, resources, community care.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Phone, Shield, Wind } from 'lucide-react';
import { motion } from 'framer-motion';

const GOLD = '#C8962C';

const TIPS = [
  { icon: '💧', title: 'Hydrate', body: 'Drink water. Your body needs it after a big night.' },
  { icon: '🛏️', title: 'Rest', body: 'Sleep is recovery. Give yourself permission to do nothing.' },
  { icon: '💬', title: 'Talk about it', body: 'Debrief with someone you trust. No detail is too small.' },
  { icon: '🚿', title: 'Shower reset', body: 'Physical reset helps mental reset. Take your time.' },
];

const RESOURCES = [
  { name: 'Samaritans', number: '116 123', desc: 'Free, 24/7, confidential' },
  { name: 'Switchboard LGBT+', number: '0300 330 0630', desc: 'LGBT+ helpline' },
  { name: 'National Domestic Abuse', number: '0808 2000 247', desc: '24hr freephone' },
];

export default function CarePage() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col text-white" style={{ background: '#050507' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b border-white/5 px-4"
        style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/60 active:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center">
            <h1 className="font-black text-base tracking-[0.12em] uppercase" style={{ color: GOLD }}>
              Hand N Hand
            </h1>
            <p className="text-[10px] text-white/30 font-medium">Care-first</p>
          </div>
          <div className="w-12" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 space-y-8">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Heart className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <h2 className="text-xl font-black mb-2">How are you doing?</h2>
          <p className="text-sm text-white/50 max-w-xs mx-auto">
            Whether it's after a night out or just a tough day — we've got you.
          </p>
        </motion.div>

        {/* Aftercare tips */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3 font-semibold">Aftercare tips</h3>
          <div className="grid grid-cols-2 gap-3">
            {TIPS.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/5"
              >
                <span className="text-2xl mb-2 block">{tip.icon}</span>
                <p className="text-sm font-bold text-white mb-1">{tip.title}</p>
                <p className="text-xs text-white/40 leading-relaxed">{tip.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3 font-semibold">If you need help</h3>
          <div className="space-y-2">
            {RESOURCES.map((r) => (
              <a
                key={r.name}
                href={`tel:${r.number.replace(/\s/g, '')}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#1C1C1E] border border-white/5 active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{r.name}</p>
                  <p className="text-xs text-white/40">{r.desc}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: GOLD }}>{r.number}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Breathing exercise */}
        <div className="p-6 rounded-2xl border border-white/5" style={{ background: `${GOLD}08` }}>
          <Wind className="w-6 h-6 mb-3" style={{ color: GOLD }} />
          <h3 className="text-sm font-bold text-white mb-2">4-7-8 Breathing</h3>
          <p className="text-xs text-white/50 leading-relaxed mb-3">
            Breathe in for 4 seconds. Hold for 7 seconds. Breathe out for 8 seconds. Repeat 3 times.
          </p>
          <p className="text-xs text-white/30">This activates your parasympathetic nervous system and helps you calm down.</p>
        </div>

        {/* Safety link */}
        <button
          onClick={() => navigate('/safety')}
          className="w-full py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
          style={{ backgroundColor: GOLD, color: 'black' }}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          Go to Safety Hub
        </button>
      </div>
    </div>
  );
}
