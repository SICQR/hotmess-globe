import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, 
  Upload, 
  Mic, 
  CheckCircle, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PageShell from '@/components/shell/PageShell';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider'; // Assuming AuthProvider exists

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    price: 19999,
    credits: 100,
    description: '100 Pre-roll slots. Perfect for event promotion.'
  },
  {
    id: 'growth',
    name: 'Growth Pack',
    price: 59999,
    credits: 500,
    description: '500 Pre-rolls + 200 Mid-rolls. Serious reach.'
  },
  {
    id: 'takeover',
    name: 'Radio Takeover',
    price: 29999,
    credits: 1,
    description: '1 Hour dedicated slot. You own the airwaves.'
  }
];

export default function RadioAdWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [adType, setAdType] = useState('upload'); 
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setStep(2);
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      return;
    }

    setLoading(true);
    const totalAmount = selectedPackage.price + (adType === 'script' ? 2999 : 0);

    try {
      const res = await fetch('/api/business/create-ad-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          adType,
          script: adType === 'script' ? script : null,
          amount: totalAmount,
          userId: user.id,
          metadata: { email: user.email }
        })
      });

      const { url, error } = await res.json();
      if (error) throw new Error(error);

      window.location.href = url;
      
    } catch (error) {
      toast.error("Checkout failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="BUSINESS"
        title="Radio Ad Wizard"
        subtitle="Get your brand on air in minutes"
        maxWidth="4xl"
      >
        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-12 px-4 md:px-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center relative z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                  step >= s 
                    ? 'bg-hot-500 border-hot-500 text-white' 
                    : 'bg-black border-white/20 text-white/40'
                }`}
              >
                {step > s ? <CheckCircle className="w-6 h-6" /> : s}
              </div>
              <span className="text-xs mt-2 uppercase tracking-wider text-white/60">
                {s === 1 ? 'Package' : s === 2 ? 'Creative' : 'Checkout'}
              </span>
            </div>
          ))}
          <div className="absolute left-0 w-full top-5 h-0.5 bg-white/10 -z-0" />
        </div>

        {/* STEP 1: CHOOSE PACKAGE */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black uppercase">Choose Your Reach</h2>
              <p className="text-white/60">Select an advertising package to get started.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg)}
                  className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-hot-500 hover:bg-white/10 transition-all"
                >
                  <div className="absolute top-4 right-4">
                    <Radio className="w-6 h-6 text-white/20 group-hover:text-hot-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                  <div className="text-3xl font-black text-hot-500 mb-4">
                    £{(pkg.price / 100).toFixed(2)}
                  </div>
                  <p className="text-sm text-white/60 mb-6 min-h-[40px]">
                    {pkg.description}
                  </p>
                  <Button className="w-full bg-white/10 hover:bg-hot-500 font-bold uppercase">
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2: UPLOAD CREATIVE */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-2xl mx-auto"
          >
             <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <h2 className="text-2xl font-black uppercase">Ad Creative</h2>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
              {/* Type Toggle */}
              <div className="flex bg-black rounded-lg p-1 mb-8 border border-white/10">
                <button
                  onClick={() => setAdType('upload')}
                  className={`flex-1 py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    adType === 'upload' ? 'bg-hot-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Audio
                </button>
                <button
                  onClick={() => setAdType('script')}
                  className={`flex-1 py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    adType === 'script' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  Record My Script
                </button>
              </div>

              {adType === 'upload' ? (
                <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-hot-500 hover:bg-white/5 transition-all cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-white/40 mb-4" />
                  <h3 className="font-bold text-lg mb-2">Drop your MP3 here</h3>
                  <p className="text-white/40 text-sm">Max 10MB. 320kbps preferred.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-full h-fit">
                      <Mic className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-cyan-400 text-sm mb-1">We'll voice it for you</h4>
                      <p className="text-xs text-white/70">
                        Write your script below. Our AI (or human talent) will generate a professional voiceover.
                        <span className="block mt-1 font-bold text-white">+£29.99 production fee</span>
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase text-white/60">Script (Max 150 words)</label>
                    <Textarea 
                      placeholder="Hey London, this is DJ Tebo inviting you to..."
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      className="bg-black border-white/20 min-h-[150px]"
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-sm text-white/40 uppercase">Total</div>
                  <div className="text-2xl font-black text-hot-500">
                    £{((selectedPackage.price + (adType === 'script' ? 2999 : 0)) / 100).toFixed(2)}
                  </div>
                </div>
                <Button 
                  onClick={handleCheckout}
                  size="lg" 
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase px-8"
                >
                  {loading ? 'Processing...' : 'Pay & Launch'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </PageShell>
    </div>
  );
}
