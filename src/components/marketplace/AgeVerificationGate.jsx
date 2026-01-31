/**
 * Age Verification Gate
 * 
 * Blocks adult content until user verifies age.
 * Provides multiple verification methods.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CreditCard,
  FileCheck,
  ArrowRight,
  Loader2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';

// Verification methods
const VERIFICATION_METHODS = [
  {
    id: 'payment',
    title: 'Card Verification',
    description: 'Quick verification using your payment card',
    icon: CreditCard,
    fast: true,
    note: 'No charge - just verifies card is 18+'
  },
  {
    id: 'id_check',
    title: 'ID Verification',
    description: 'Upload a government ID for full verification',
    icon: FileCheck,
    fast: false,
    note: 'Most secure, may take a few minutes'
  }
];

export default function AgeVerificationGate({ 
  children, 
  contentRating = 'xxx',
  onVerified,
  className = '' 
}) {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(null); // null = loading
  const [showModal, setShowModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [error, setError] = useState(null);

  // Check verification status
  useEffect(() => {
    async function checkVerification() {
      if (!user?.id) {
        setIsVerified(false);
        return;
      }

      const { data, error } = await supabase
        .from('age_verifications')
        .select('id, status, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        setIsVerified(false);
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setIsVerified(false);
        return;
      }

      setIsVerified(true);
    }

    checkVerification();
  }, [user?.id]);

  // Handle verification method selection
  const handleSelectMethod = async (method) => {
    if (!user) {
      setError('You must be logged in to verify your age.');
      return;
    }

    setSelectedMethod(method);
    setVerifying(true);
    setError(null);

    try {
      if (method === 'payment') {
        // In production: integrate with Stripe Identity or similar
        // For now, simulate the flow
        await simulatePaymentVerification();
      } else if (method === 'id_check') {
        // In production: integrate with Jumio, Onfido, etc.
        await simulateIdVerification();
      }

      // Record verification
      const { error: insertError } = await supabase
        .from('age_verifications')
        .insert({
          user_id: user.id,
          method: method,
          status: 'active',
          verification_data: { verified_via: method }
        });

      if (insertError) throw insertError;

      setIsVerified(true);
      setShowModal(false);
      onVerified?.();

    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Simulate payment verification (replace with real integration)
  const simulatePaymentVerification = () => {
    return new Promise((resolve) => setTimeout(resolve, 2000));
  };

  // Simulate ID verification (replace with real integration)
  const simulateIdVerification = () => {
    return new Promise((resolve) => setTimeout(resolve, 3000));
  };

  // Loading state
  if (isVerified === null) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  // Verified - show content
  if (isVerified) {
    return <>{children}</>;
  }

  // Not verified - show gate
  return (
    <>
      {/* Blurred preview with gate */}
      <div className={`relative ${className}`}>
        {/* Blurred background hint */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
        
        {/* Gate content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <div className="w-16 h-16 bg-[#FF1493]/20 border-2 border-[#FF1493] flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-[#FF1493]" />
          </div>

          <h3 className="text-2xl font-black text-white uppercase mb-2">
            Adult Content
          </h3>
          
          <p className="text-white/60 mb-6 max-w-sm">
            This content is rated {contentRating.toUpperCase()} and requires age verification to view.
          </p>

          {user ? (
            <Button
              onClick={() => setShowModal(true)}
              className="bg-[#FF1493] hover:bg-[#FF1493]/80 text-white font-bold"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify Age (18+)
            </Button>
          ) : (
            <Link to="/auth">
              <Button className="bg-[#FF1493] hover:bg-[#FF1493]/80 text-white font-bold">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Log in to Verify
              </Button>
            </Link>
          )}

          <p className="mt-4 text-xs text-white/40">
            One-time verification. We don't store your documents.
          </p>
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-black border-2 border-white/20 text-white max-w-md">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#FF1493]/20 border border-[#FF1493] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#FF1493]" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase">Age Verification</h2>
                <p className="text-sm text-white/60">Confirm you're 18+</p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-[#FFB800]/10 border border-[#FFB800]/30 mb-6">
              <AlertTriangle className="w-5 h-5 text-[#FFB800] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/80">
                By continuing, you confirm you are at least 18 years old and legally permitted to view adult content in your jurisdiction.
              </p>
            </div>

            {/* Methods */}
            {!verifying && !selectedMethod && (
              <div className="space-y-3">
                <p className="text-xs uppercase text-white/40 font-bold mb-3">
                  Choose verification method
                </p>
                
                {VERIFICATION_METHODS.map((method) => {
                  const Icon = method.icon;
                  
                  return (
                    <button
                      key={method.id}
                      onClick={() => handleSelectMethod(method.id)}
                      className="w-full p-4 border border-white/20 hover:border-[#FF1493] 
                                 bg-white/5 hover:bg-white/10 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Icon className="w-5 h-5 text-[#FF1493]" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{method.title}</span>
                              {method.fast && (
                                <span className="px-2 py-0.5 bg-[#39FF14]/20 text-[10px] text-[#39FF14] uppercase">
                                  Fast
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50">{method.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#FF1493] transition-colors" />
                      </div>
                      {method.note && (
                        <p className="mt-2 text-[10px] text-white/40 ml-9">{method.note}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Verifying state */}
            {verifying && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-[#FF1493] mx-auto mb-4" />
                <p className="text-white/80 mb-2">Verifying your age...</p>
                <p className="text-xs text-white/40">This usually takes a few seconds</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 mb-4">
                <p className="text-sm text-red-400">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setError(null);
                    setSelectedMethod(null);
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-[10px] text-white/40 text-center">
                Your verification data is handled securely and not stored. 
                By proceeding, you agree to our Terms of Service.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
