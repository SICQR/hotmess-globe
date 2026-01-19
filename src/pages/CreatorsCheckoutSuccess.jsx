import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreatorsCheckoutSuccess() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        <div className="border border-white/10 bg-white/5 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#39FF14] mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Checkout complete</h1>
          <p className="text-white/60 mt-2">
            Thanks. Care always.
          </p>

          <div className="mt-6 flex flex-col md:flex-row gap-3 justify-center">
            <Button asChild className="bg-[#B026FF] text-white hover:bg-white hover:text-black font-black uppercase">
              <Link to="/market/creators">Back to MESS Market</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black font-black uppercase">
              <Link to="/market">Official shop</Link>
            </Button>
          </div>

          <div className="mt-6 text-xs text-white/50">
            <Link to="/safety" className="text-white hover:underline">Safety</Link> •{' '}
            <Link to="/music/live" className="text-white hover:underline">Listen live</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
