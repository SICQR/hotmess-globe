import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tight">Privacy</h1>
        <p className="text-white/60 mt-4">
          Privacy information and your rights (GDPR). For account data export/delete, use the Privacy Hub.
        </p>

        <div className="mt-8 border border-white/10 bg-white/5 p-6 space-y-3">
          <p className="text-sm text-white/80">
            Data rights: access, export, deletion, and retention requests.
          </p>
          <Link to="/legal/privacy-hub" className="text-sm font-black uppercase tracking-wider text-[#00D9FF] hover:underline">
            Open Privacy Hub
          </Link>
        </div>

        <div className="mt-8">
          <Link to="/market" className="text-sm text-white/60 hover:text-white">← Back to shop</Link>
        </div>
      </div>
    </div>
  );
}
