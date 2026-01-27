import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function ConsentGate({ onAccept, onCancel, recipientName }) {
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);

  const canProceed = agreedToGuidelines && agreedToConsent;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black border-2 border-[#E62020] max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#E62020]" />
          <h2 className="text-4xl font-black uppercase mb-2">CONSENT CHECK</h2>
          <p className="text-white/80 uppercase tracking-wider text-sm">
            First message to {recipientName}
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-white/5 border-l-4 border-[#E62020] p-4">
            <h3 className="font-black uppercase text-lg mb-3 text-[#E62020]">
              OUR CONSENT CUE
            </h3>
            <p className="text-xl font-bold mb-2">
              "Ask first. Confirm yes. Respect no. No pressure."
            </p>
            <p className="text-sm text-white/70">
              This is a consent-first community. Before sending your first message, 
              please review and agree to our communication guidelines.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm text-white/80">
              <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
              <span>Always ask before initiating contact or sharing explicit content</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-white/80">
              <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
              <span>Respect boundaries and take "no" as a complete answer</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-white/80">
              <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
              <span>No harassment, pressure, or coercion of any kind</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-white/80">
              <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
              <span>Report unsafe behavior immediately</span>
            </div>
          </div>

          <div className="bg-red-600/20 border-2 border-red-600 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <p className="font-black uppercase text-sm mb-2 text-red-400">VIOLATIONS</p>
                <p className="text-sm text-white/80">
                  Violations of consent guidelines may result in immediate account suspension. 
                  Safety is our top priority.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox 
              checked={agreedToGuidelines}
              onCheckedChange={setAgreedToGuidelines}
              className="mt-1"
            />
            <span className="text-sm group-hover:text-white transition-colors">
              <span className="font-bold">I have read and agree to the community guidelines</span> 
              {' '}and understand the consent-first principles
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox 
              checked={agreedToConsent}
              onCheckedChange={setAgreedToConsent}
              className="mt-1"
            />
            <span className="text-sm group-hover:text-white transition-colors">
              <span className="font-bold">I confirm I will respect boundaries</span> 
              {' '}and will not send unsolicited explicit content
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase py-4"
          >
            CANCEL
          </Button>
          <Button
            onClick={onAccept}
            disabled={!canProceed}
            className="flex-1 bg-[#E62020] hover:bg-white text-black font-black uppercase py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            AGREE & SEND
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}