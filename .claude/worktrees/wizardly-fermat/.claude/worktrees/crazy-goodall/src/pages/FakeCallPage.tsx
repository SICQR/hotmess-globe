/**
 * FakeCallPage — Standalone /fake-call route
 *
 * Deep-linkable fake call trigger. Renders the FakeCallGenerator
 * in a full-screen mobile layout so users can bookmark /fake-call
 * or launch it from a home screen shortcut.
 */

import { useNavigate } from 'react-router-dom';
import FakeCallGenerator from '@/components/safety/FakeCallGenerator';

export default function FakeCallPage() {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-[195] flex flex-col"
      style={{ background: '#050507' }}
    >
      {/* Sticky header */}
      <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-14 border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-white/60 active:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-sm font-bold text-white tracking-wide uppercase">
          Fake Call
        </h1>
        <div className="w-12" /> {/* spacer */}
      </div>

      {/* Full-screen FakeCallGenerator */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <FakeCallGenerator onClose={() => navigate(-1)} />
      </div>
    </div>
  );
}
