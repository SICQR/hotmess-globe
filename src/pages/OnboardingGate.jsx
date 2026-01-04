import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, FileText, MapPin, User } from 'lucide-react';

export default function OnboardingGate() {
  const [step, setStep] = useState(0);
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    try {
      return sessionStorage.getItem('age_verified') === 'true';
    } catch {
      return false;
    }
  });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // If all consents already given, redirect to Home (Pulse)
        if (user.has_agreed_terms && user.has_consented_data && user.has_consented_gps) {
          if (user.full_name && user.avatar_url) {
            window.location.href = createPageUrl('Home');
          } else {
        // Profile setup is handled by the consolidated Profile page (setup mode)
        window.location.href = createPageUrl('Profile');
          }
        } else {
          // Avoid showing age verification twice: the global /age gate already stores sessionStorage.age_verified.
          setStep(ageConfirmed ? 2 : 1);
        }
      } catch (error) {
        // Not authenticated, redirect to login
        base44.auth.redirectToLogin(createPageUrl('OnboardingGate'));
      }
    };
    checkUserStatus();
  }, []);

  const handleNext = async () => {
    if (step === 1 && !ageConfirmed) {
      return;
    }
    if (step === 2 && !termsAgreed) {
      return;
    }
    if (step === 3 && (!dataConsent || !gpsConsent)) {
      return;
    }
    
    if (step === 3) {
      // Save all consents to user
      await base44.auth.updateMe({
        has_agreed_terms: termsAgreed,
        has_consented_data: dataConsent,
        has_consented_gps: gpsConsent
      });
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  const handleCreateProfile = () => {
    window.location.href = createPageUrl('Profile');
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40">Loading...</p>
          </div>
        );
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <Shield className="w-16 h-16 text-[#FF1493] mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4 uppercase">Age Verification</h2>
            <p className="text-lg mb-8 text-white/80">You must be 18+ to use HOTMESS</p>
            <div className="flex items-center justify-center space-x-3 mb-8">
              <Checkbox
                id="age-confirm"
                checked={ageConfirmed}
                onCheckedChange={(value) => {
                  const nextValue = !!value;
                  setAgeConfirmed(nextValue);
                  if (nextValue) {
                    try {
                      sessionStorage.setItem('age_verified', 'true');
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="w-6 h-6 border-2 border-white"
              />
              <Label htmlFor="age-confirm" className="text-lg font-bold cursor-pointer">
                I am 18 years or older
              </Label>
            </div>
            <Button 
              onClick={handleNext} 
              disabled={!ageConfirmed}
              className="bg-[#FF1493] text-black hover:bg-white font-black uppercase px-8 py-6 text-lg disabled:opacity-50"
            >
              Continue
            </Button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <FileText className="w-16 h-16 text-[#00D9FF] mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4 uppercase">Terms & Conditions</h2>
            <div className="max-h-80 overflow-y-auto bg-white/5 p-6 rounded-lg mb-6 text-sm text-left border border-white/10">
              <h3 className="font-black text-lg mb-3 text-[#FF1493]">1. ELIGIBILITY</h3>
              <p className="mb-4 text-white/80">Must be 18+. No exceptions.</p>
              
              <h3 className="font-black text-lg mb-3 text-[#FF1493]">2. USER CONDUCT</h3>
              <p className="mb-4 text-white/80">No harassment, no illegal activity, no fake profiles. Be real. Be respectful.</p>
              
              <h3 className="font-black text-lg mb-3 text-[#FF1493]">3. PRIVACY & DATA</h3>
              <p className="mb-4 text-white/80">We collect location data for beacons and Right Now features. Your data is encrypted and never sold. See Privacy Policy for details.</p>
              
              <h3 className="font-black text-lg mb-3 text-[#FF1493]">4. CONTENT</h3>
              <p className="mb-4 text-white/80">You own your content. We can moderate and remove content that violates guidelines.</p>
              
              <h3 className="font-black text-lg mb-3 text-[#FF1493]">5. LIABILITY</h3>
              <p className="mb-4 text-white/80">HOTMESS is a platform. We're not responsible for user interactions. Use common sense. Stay safe.</p>
              
              <h3 className="font-black text-lg mb-3 text-[#FF1493]">6. CHANGES</h3>
              <p className="mb-4 text-white/80">We can update these terms. Continued use = acceptance.</p>
            </div>
            <div className="flex items-center justify-center space-x-3 mb-8">
              <Checkbox
                id="terms-agree"
                checked={termsAgreed}
                onCheckedChange={setTermsAgreed}
                className="w-6 h-6 border-2 border-white"
              />
              <Label htmlFor="terms-agree" className="text-lg font-bold cursor-pointer">
                I agree to the Terms & Conditions
              </Label>
            </div>
            <Button 
              onClick={handleNext}
              disabled={!termsAgreed}
              className="bg-[#00D9FF] text-black hover:bg-white font-black uppercase px-8 py-6 text-lg disabled:opacity-50"
            >
              Continue
            </Button>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <MapPin className="w-16 h-16 text-[#B026FF] mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4 uppercase">Permissions</h2>
            <p className="text-lg mb-8 text-white/80">We need your consent for full functionality</p>
            <div className="space-y-6 mb-8 text-left">
              <div className="flex items-start space-x-3 bg-white/5 p-4 rounded-lg border border-white/10">
                <Checkbox
                  id="data-consent"
                  checked={dataConsent}
                  onCheckedChange={setDataConsent}
                  className="w-6 h-6 border-2 border-white mt-1"
                />
                <Label htmlFor="data-consent" className="text-base font-semibold cursor-pointer flex-1">
                  <span className="block mb-1">Data Collection</span>
                  <span className="text-sm text-white/60 font-normal">Anonymous usage data to improve app experience</span>
                </Label>
              </div>
              <div className="flex items-start space-x-3 bg-white/5 p-4 rounded-lg border border-white/10">
                <Checkbox
                  id="gps-consent"
                  checked={gpsConsent}
                  onCheckedChange={setGpsConsent}
                  className="w-6 h-6 border-2 border-white mt-1"
                />
                <Label htmlFor="gps-consent" className="text-base font-semibold cursor-pointer flex-1">
                  <span className="block mb-1">GPS Access</span>
                  <span className="text-sm text-white/60 font-normal">Required for Right Now, Beacons, and location-based features</span>
                </Label>
              </div>
            </div>
            <Button 
              onClick={handleNext}
              disabled={!dataConsent || !gpsConsent}
              className="bg-[#B026FF] text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg disabled:opacity-50"
            >
              Continue
            </Button>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <User className="w-16 h-16 text-[#39FF14] mx-auto mb-6" />
            <h2 className="text-4xl font-black mb-4 uppercase">Complete Profile</h2>
            <p className="text-lg mb-8 text-white/80">
              Almost there! Create your profile and upload a photo to unlock HOTMESS.
            </p>
            <Button 
              onClick={handleCreateProfile}
              className="bg-[#39FF14] text-black hover:bg-white font-black uppercase px-8 py-6 text-lg"
            >
              Setup Profile
            </Button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-lg shadow-2xl max-w-2xl w-full border-2 border-white/20"
      >
        {/* Progress indicator */}
        {step > 0 && step < 4 && (
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-all ${
                  s <= step ? 'bg-[#FF1493]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        )}
        {renderStep()}
      </motion.div>
    </div>
  );
}