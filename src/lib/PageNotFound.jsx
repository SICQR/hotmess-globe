import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Catch-all 404. Doctrine copy (Phil 2026-05-26):
 *   "Lost in the fog. This route doesn't exist, but the night's still open."
 * CTA: Back to Pulse.
 */
export default function PageNotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location?.pathname || '/';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-7xl font-black tracking-tight text-white/30">404</h1>
          <div className="h-0.5 w-12 mx-auto" style={{ background: 'rgba(200,150,44,0.55)' }} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white tracking-tight">
            Lost in the fog
          </h2>
          <p className="text-white/55 leading-relaxed text-[15px]">
            This route doesn't exist, but the night's still open.
          </p>
          <p className="text-white/25 text-xs font-mono break-all">{path}</p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/pulse')}
            className="inline-flex items-center px-5 py-2.5 text-sm font-bold text-black rounded-full transition-opacity hover:opacity-90"
            style={{ background: '#C8962C' }}
          >
            Back to Pulse
          </button>
        </div>
      </div>
    </div>
  );
}
