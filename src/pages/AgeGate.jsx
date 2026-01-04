import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function AgeGate() {
  const [confirmed, setConfirmed] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextUrl = searchParams.get('next') || createPageUrl('Home');

  const handleConfirm = () => {
    if (!confirmed) {
      toast.error('You must confirm you are 18+ to continue');
      return;
    }
    
    // Store age verification in session
    sessionStorage.setItem('age_verified', 'true');
    
    // Redirect to next URL
    window.location.href = nextUrl;
  };

  const handleExit = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white/5 border-2 border-white/20 p-8">
          <div className="text-center mb-8">
            <Shield className="w-20 h-20 mx-auto mb-4 text-[#FF1493]" />
            <h1 className="text-5xl font-black uppercase mb-4">
              HOT<span className="text-[#FF1493]">MESS</span>
            </h1>
            <p className="text-white/60 uppercase tracking-wider text-sm">18+ VERIFICATION REQUIRED</p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-red-600/20 border-2 border-red-600 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-black uppercase text-sm mb-2 text-red-400">AGE RESTRICTED CONTENT</p>
                  <p className="text-sm text-white/80">
                    This platform contains adult content and is intended for users 18 years or older. 
                    By proceeding, you confirm you meet the age requirement.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Consent-first community with clear boundaries</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Safety resources and support always available</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-white/80">
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <span>Report, block, and moderation tools built-in</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/20 p-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox 
                checked={confirmed}
                onCheckedChange={setConfirmed}
                className="mt-1"
              />
              <span className="text-sm group-hover:text-white transition-colors">
                <span className="font-bold">I confirm that I am 18 years of age or older</span> and agree to view adult content. 
                I understand this platform contains explicit material.
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleConfirm}
              disabled={!confirmed}
              className="w-full bg-[#FF1493] hover:bg-white text-black font-black uppercase py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ENTER (18+)
            </Button>
            <Button
              onClick={handleExit}
              variant="outline"
              className="w-full border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase py-6 text-lg"
            >
              EXIT (UNDER 18)
            </Button>
          </div>

          <p className="text-center text-xs text-white/40 mt-6 uppercase tracking-wider">
            By entering, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}