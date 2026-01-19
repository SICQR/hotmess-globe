import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tight">Terms</h1>
        <p className="text-white/60 mt-4">
          Terms of service and purchase terms. This is a placeholder page—replace with your final legal copy.
        </p>

        <div className="mt-8">
          <Link to="/market" className="text-sm text-white/60 hover:text-white">← Back to shop</Link>
        </div>
      </div>
    </div>
  );
}
