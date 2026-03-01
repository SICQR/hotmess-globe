import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Zap, Radio, PartyPopper, ShoppingBag, CheckCircle, AlertCircle,
  ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const SIGNAL_TYPES = [
  { id: 'event', label: 'Event', icon: PartyPopper, color: '#00D9FF', description: 'Boost visibility for your upcoming event' },
  { id: 'radio_premiere', label: 'Radio Premiere', icon: Radio, color: '#C8962C', description: 'Announce a new show or track premiere' },
  { id: 'drop', label: 'Product Drop', icon: ShoppingBag, color: '#C8962C', description: 'Amplify a new product or merch release' },
  { id: 'special', label: 'Special Offer', icon: Sparkles, color: '#FFD700', description: 'Promote a limited-time deal or offer' },
];

const CITIES = [
  { id: 'london', label: 'London', emoji: '🇬🇧' },
  { id: 'berlin', label: 'Berlin', emoji: '🇩🇪' },
  { id: 'paris', label: 'Paris', emoji: '🇫🇷' },
  { id: 'amsterdam', label: 'Amsterdam', emoji: '🇳🇱' },
  { id: 'nyc', label: 'New York', emoji: '🇺🇸' },
  { id: 'los_angeles', label: 'Los Angeles', emoji: '🇺🇸' },
  { id: 'tokyo', label: 'Tokyo', emoji: '🇯🇵' },
  { id: 'sydney', label: 'Sydney', emoji: '🇦🇺' },
];

const BUDGET_TIERS = [
  { credits: 50, reach: '~2.5K', label: 'Starter' },
  { credits: 100, reach: '~5K', label: 'Standard', recommended: true },
  { credits: 250, reach: '~12K', label: 'Boost' },
  { credits: 500, reach: '~25K', label: 'Mega' },
];

const BusinessAmplify = () => {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    signal_type: '',
    city: 'london',
    starts_at: '',
    duration_hours: 24,
    budget: 100,
    title: '',
    description: '',
  });

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) { setLoading(false); return; }
    
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('owner_id', user.user.id)
      .single();
    
    setBusiness(biz);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!business) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('business_amplifications').insert({
        business_id: business.id,
        signal_type: form.signal_type,
        city: form.city,
        starts_at: form.starts_at,
        duration_hours: form.duration_hours,
        budget: form.budget,
        title: form.title,
        description: form.description,
        status: 'scheduled'
      });

      if (error) throw error;

      toast.success('Amplification scheduled!');
      navigate('/business/insights');
    } catch (err) {
      toast.error('Failed to schedule amplification');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSignal = SIGNAL_TYPES.find(s => s.id === form.signal_type);
  const selectedCity = CITIES.find(c => c.id === form.city);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-[#FFD700] mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase mb-2">Business Account Required</h2>
          <p className="text-white/60 mb-6">You need a verified business profile to create amplifications.</p>
          <Link to="/biz/onboarding">
            <Button variant="hot" size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black uppercase flex items-center gap-3">
            <Zap className="w-8 h-8 text-[#C8962C]" />
            Schedule Amplification
          </h1>
          <p className="text-white/60 mt-2">Boost your signal across the HOTMESS network</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 flex items-center justify-center border-2 font-bold ${
                step >= s ? 'bg-[#C8962C] border-[#C8962C] text-black' : 'border-white/20 text-white/40'
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-[#C8962C]' : 'bg-white/20'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Signal Type */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-black uppercase mb-6">What are you amplifying?</h2>
            <div className="grid grid-cols-2 gap-4">
              {SIGNAL_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = form.signal_type === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setForm(f => ({ ...f, signal_type: type.id }))}
                    className={`p-6 border-2 text-left transition-all ${
                      selected 
                        ? 'border-[#C8962C] bg-[#C8962C]/10' 
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <Icon className="w-8 h-8 mb-3" style={{ color: type.color }} />
                    <h3 className="font-black uppercase mb-1">{type.label}</h3>
                    <p className="text-sm text-white/60">{type.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex justify-end">
              <Button 
                variant="hot" 
                size="lg" 
                disabled={!form.signal_type}
                onClick={() => setStep(2)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Targeting */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-black uppercase mb-6">Where & When?</h2>
            
            <div className="space-y-6">
              {/* City */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/60 mb-3">Target City</label>
                <div className="grid grid-cols-4 gap-2">
                  {CITIES.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => setForm(f => ({ ...f, city: city.id }))}
                      className={`p-3 border text-center transition-all ${
                        form.city === city.id
                          ? 'border-[#C8962C] bg-[#C8962C]/10'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-xl">{city.emoji}</span>
                      <p className="text-xs font-bold mt-1">{city.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* DateTime */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    className="w-full bg-white/5 border border-white/20 p-3"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Duration</label>
                  <select
                    value={form.duration_hours}
                    onChange={(e) => setForm(f => ({ ...f, duration_hours: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/20 p-3"
                  >
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button 
                variant="hot" 
                size="lg" 
                disabled={!form.starts_at}
                onClick={() => setStep(3)}
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Budget & Review */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-xl font-black uppercase mb-6">Budget & Confirm</h2>
            
            <div className="space-y-6">
              {/* Budget Tiers */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/60 mb-3">Select Budget</label>
                <div className="grid grid-cols-4 gap-3">
                  {BUDGET_TIERS.map((tier) => (
                    <button
                      key={tier.credits}
                      onClick={() => setForm(f => ({ ...f, budget: tier.credits }))}
                      className={`p-4 border text-center transition-all relative ${
                        form.budget === tier.credits
                          ? 'border-[#FFD700] bg-[#FFD700]/10'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {tier.recommended && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-[#39FF14] text-black px-2 font-bold">
                          BEST VALUE
                        </span>
                      )}
                      <p className="text-2xl font-black text-[#FFD700]">{tier.credits}</p>
                      <p className="text-xs text-white/60">credits</p>
                      <p className="text-xs text-[#39FF14] mt-2">{tier.reach} reach</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 p-6">
                <h3 className="font-black uppercase mb-4">Amplification Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Signal Type</span>
                    <span className="font-bold capitalize">{selectedSignal?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">City</span>
                    <span className="font-bold">{selectedCity?.emoji} {selectedCity?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Start</span>
                    <span className="font-bold">{form.starts_at ? new Date(form.starts_at).toLocaleString() : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Duration</span>
                    <span className="font-bold">{form.duration_hours} hours</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-white/60">Total Cost</span>
                    <span className="font-black text-[#FFD700] text-lg">{form.budget} credits</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button 
                variant="hot" 
                size="lg" 
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Scheduling...' : 'Schedule Amplification'}
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BusinessAmplify;
