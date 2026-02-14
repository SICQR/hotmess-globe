import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { useCurrentUser } from '@/components/utils/queryConfig';

const AGE_KEY = 'hm_age_confirmed_v1';

export default function AccountConsents() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();

  const localAgeVerified = useMemo(() => {
    try {
      return localStorage.getItem(AGE_KEY) === 'true' || sessionStorage.getItem('age_verified') === 'true';
    } catch {
      return false;
    }
  }, []);

  const initialAge = !!currentUser?.consent_age || localAgeVerified;
  const initialLocation = !!currentUser?.has_consented_gps;

  const [ageConsent, setAgeConsent] = useState(initialAge);
  const [locationConsent, setLocationConsent] = useState(initialLocation);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Once we know who the user is, prefill checkboxes so returning users
    // don't have to re-accept age/consent just to toggle location.
    if (!currentUser) return;
    setAgeConsent((prev) => prev || !!currentUser?.consent_age || localAgeVerified);
    setLocationConsent(!!currentUser?.has_consented_gps);
  }, [currentUser, localAgeVerified]);

  const handleSubmit = async () => {
    const alreadyAccepted = !!currentUser?.consent_accepted;
    const hasAgeAlready = !!currentUser?.consent_age || localAgeVerified;

    // Only require the explicit age checkbox for first-time consent.
    if (!alreadyAccepted && !ageConsent && !hasAgeAlready) {
      toast.error('You must confirm you are 18+ to continue');
      return;
    }

    setLoading(true);
    try {
      // Keep age verification consistent across gates.
      try {
        if (ageConsent || hasAgeAlready) localStorage.setItem(AGE_KEY, 'true');
      } catch {
        // ignore
      }

      await base44.auth.updateMe({
        consent_accepted: true,
        consent_age: ageConsent || hasAgeAlready,
        consent_location: !!locationConsent,
        consent_date: new Date().toISOString(),

        // These are the required flags checked by Layout/OnboardingGate.
        has_agreed_terms: true,
        has_consented_data: true,
        has_consented_gps: !!locationConsent,
      });

      window.location.href = createPageUrl('Profile');
    } catch (error) {
      toast.error(error?.message || 'Failed to save consents');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-black border-2 border-white p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">
              WELCOME TO <span className="text-[#FF1493]">HOTMESS</span>
            </h1>
            <p className="text-white/60 uppercase text-sm tracking-wider">LONDON NIGHTLIFE OS</p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-white/5 border-2 border-white/20 p-6">
              <div className="flex items-start gap-4">
                <Calendar className="w-6 h-6 text-[#FF1493] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-black uppercase text-lg mb-2">AGE VERIFICATION</h3>
                  <p className="text-white/60 text-sm mb-4">
                    HOTMESS is an 18+ platform for queer nightlife. By continuing, you confirm you are at least 18 years old.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={ageConsent}
                      onCheckedChange={setAgeConsent}
                      className="border-white data-[state=checked]:bg-[#FF1493] data-[state=checked]:border-[#FF1493]"
                    />
                    <span className="text-sm font-bold uppercase">I am 18 years or older</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border-2 border-white/20 p-6">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-[#00D9FF] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-black uppercase text-lg mb-2">LOCATION SERVICES</h3>
                  <p className="text-white/60 text-sm mb-4">
                    We use your location to show nearby events, beacons, and users. Your exact location is never shared - we use a 500m privacy grid.
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={locationConsent}
                      onCheckedChange={setLocationConsent}
                      className="border-white data-[state=checked]:bg-[#00D9FF] data-[state=checked]:border-[#00D9FF]"
                    />
                    <span className="text-sm font-bold uppercase">I consent to location services</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border-2 border-[#FFEB3B] p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-[#FFEB3B] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-black uppercase text-lg mb-2 text-[#FFEB3B]">CARE-FIRST PLATFORM</h3>
                  <p className="text-white/60 text-sm">
                    Safety resources, consent gates, and community standards are baked into every feature. Report inappropriate behavior anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || (!currentUser?.consent_accepted && !ageConsent)}
            className="w-full bg-[#FF1493] hover:bg-white text-black font-black text-lg py-6 border-2 border-white"
          >
            {loading ? 'PROCESSING...' : (currentUser?.consent_accepted ? 'SAVE' : 'ENTER THE NIGHT')}
          </Button>

          <p className="text-center text-xs text-white/40 mt-6 uppercase font-mono">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}