import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  QrCode, 
  Megaphone,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageShell from '@/components/shell/PageShell';
import { toast } from 'sonner';

export default function VenueOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'Club', // Club, Bar, Sauna, Shop
    capacity: '',
  });

  const handleNext = () => setStep(step + 1);

  const handleSubscribe = async () => {
    toast.loading("Setting up your Globe Pin...");
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    toast.dismiss();
    toast.success("Welcome to HotMess Business!");
    // Redirect to dashboard
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="BUSINESS"
        title="Claim Your Spot"
        subtitle="Put your venue on the map. Literally."
        maxWidth="2xl"
      >
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          
          {/* Step 1: Venue Details */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Venue Details</h3>
                  <p className="text-sm text-white/60">Tell us about your space.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold uppercase text-white/60 mb-2 block">Venue Name</label>
                  <Input 
                    placeholder="e.g. The Glory" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-black border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold uppercase text-white/60 mb-2 block">Address</label>
                  <Input 
                    placeholder="Postcode or Street Address" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="bg-black border-white/20"
                  />
                </div>
              </div>

              <Button onClick={handleNext} className="w-full bg-cyan-500 hover:bg-cyan-600 font-bold uppercase mt-4">
                Next: Subscription
              </Button>
            </motion.div>
          )}

          {/* Step 2: Pay & Activate */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="inline-block p-4 rounded-full bg-emerald-500/20 mb-4">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black uppercase">Ready to Launch</h2>
                <p className="text-white/60 max-w-sm mx-auto mt-2">
                  Activate your **Premium Venue** profile to unlock these features immediately.
                </p>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-6 space-y-3">
                {[
                  { icon: MapPin, text: "Permanent Globe Pin (Animated)" },
                  { icon: QrCode, text: "Check-in Beacons (5x)" },
                  { icon: Megaphone, text: "Push Notification System" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-hot-500" />
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-6">
                <div>
                  <p className="text-sm text-white/40 uppercase">Monthly Subscription</p>
                  <p className="text-3xl font-black text-white">£149.99<span className="text-lg text-white/40">/mo</span></p>
                </div>
                <Button 
                  onClick={handleSubscribe}
                  size="lg"
                  className="bg-hot-500 hover:bg-hot-600 font-black uppercase"
                >
                  Activate Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              
              <p className="text-center text-xs text-white/40">
                Cancel anytime. 14-day money back guarantee.
              </p>
            </motion.div>
          )}

        </div>
      </PageShell>
    </div>
  );
}
