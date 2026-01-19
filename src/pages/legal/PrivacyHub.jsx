import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyHub() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tight">Privacy Hub</h1>
        <p className="text-white/60 mt-4">
          Export or delete requests live here. If you have an account, you can use the in-app account data tools.
        </p>

        <div className="mt-8 border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Export</p>
            <p className="text-sm text-white/80 mt-1">Request a copy of your personal data.</p>
            <Link to="/account/data/export" className="text-sm text-[#00D9FF] hover:underline">Go to export</Link>
          </div>
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider font-bold">Delete</p>
            <p className="text-sm text-white/80 mt-1">Request deletion of your personal data.</p>
            <Link to="/account/data/delete" className="text-sm text-[#00D9FF] hover:underline">Go to delete</Link>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/market" className="text-sm text-white/60 hover:text-white">← Back to shop</Link>
        </div>
      </div>
    </div>
  );
}
