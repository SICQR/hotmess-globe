import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Users, Lock, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CONSENT_VERSION = 'v1.0.0-2025';

export default function ConsentForm({ user, onAccepted }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      toast.error('Please read and accept the terms');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateMe({
        consent_accepted: true,
        consent_version: CONSENT_VERSION,
        consent_timestamp: new Date().toISOString(),
        is_18_plus: true,
      });

      toast.success('Welcome to HOTMESS LONDON');
      onAccepted();
    } catch (error) {
      console.error('Failed to accept consent:', error);
      toast.error('Failed to save consent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-2xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-[#FF1493]" />
          <h1 className="text-3xl font-black text-white">MEMBERSHIP AGREEMENT</h1>
        </div>

        <ScrollArea className="h-96 mb-6 pr-4">
          <div className="space-y-6 text-white/80">
            <div>
              <h3 className="font-bold text-[#FF1493] mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Private Association Membership
              </h3>
              <p className="text-sm leading-relaxed">
                HOTMESS LONDON operates as a private members association under UK law (Equality Act 2010, Section 193). 
                By accepting, you acknowledge this is a men-focused platform designed for adult nightlife, culture, and community.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[#00D9FF] mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacy & Location Protection
              </h3>
              <p className="text-sm leading-relaxed mb-2">
                Your privacy is paramount. We implement "fuzzy geolocation" - your location is automatically 
                grid-snapped to a 500m radius to prevent precise tracking. Key protections:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Real-time location pulses expire after 6 hours</li>
                <li>Grid-snapping prevents stalking and precise location inference</li>
                <li>Direct messages use Telegram E2E encryption</li>
                <li>You control your location privacy mode at all times</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-[#FFEB3B] mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Safety & Responsibility
              </h3>
              <p className="text-sm leading-relaxed mb-2">
                HOTMESS LONDON promotes responsible hedonism. You agree to:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Use Care Beacons for health resources (56 Dean Street, Hand N Hand)</li>
                <li>Report inappropriate behavior immediately</li>
                <li>Respect other members' boundaries and privacy</li>
                <li>Comply with all applicable local laws</li>
              </ul>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-400">
                  <strong>Important:</strong> This platform contains adult content and is for users 18+ only. 
                  All data processing complies with GDPR. Your sexual orientation data is treated as Special Category 
                  data with enhanced protection.
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">Data Minimization</h3>
              <p className="text-sm leading-relaxed">
                We minimize data retention. Ephemeral content (right now pulses) auto-deletes after 6 hours. 
                Messages are encrypted via Telegram. You can exercise your right to be forgotten at any time 
                via Settings → Delete Account.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <span className="text-sm text-white/90">
              I confirm I am 18+ years old, I have read and understood the above terms, and I agree to join 
              HOTMESS LONDON as a private member. I consent to the processing of my data as described, including 
              Special Category data relating to sexual orientation under GDPR Article 9.
            </span>
          </label>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!accepted || loading}
          className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black text-lg py-6"
        >
          {loading ? 'PROCESSING...' : 'ACCEPT & ENTER HOTMESS OS'}
        </Button>

        <p className="text-center text-xs text-white/40 mt-4">
          Version {CONSENT_VERSION} • Last Updated: December 2025
        </p>
      </motion.div>
    </div>
  );
}