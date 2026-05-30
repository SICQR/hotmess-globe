/**
 * ComingSoon — minimal stub for routes that aren't built yet.
 * Dark theme, HOTMESS brand, back button.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AMBER = '#C8962C';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#050507' }}
    >
      <button
        onClick={() => navigate(-1 as any)}
        className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:bg-white/10"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-white/50" />
      </button>

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: `${AMBER}15` }}
      >
        <span className="text-3xl">🔨</span>
      </div>

      <h1 className="text-white font-bold text-xl mb-2">Coming soon</h1>
      <p className="text-white/40 text-sm text-center max-w-xs">
        We're finishing this right now. Check back shortly.
      </p>

      <button
        onClick={() => navigate('/more')}
        className="mt-8 px-6 h-10 rounded-2xl text-sm font-bold active:scale-[0.97] transition-transform"
        style={{ background: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}30` }}
      >
        Back to HOTMESS
      </button>
    </div>
  );
}
