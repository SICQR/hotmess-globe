import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Calendar, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Store,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { createPageUrl } from '../../utils';

const BUSINESS_TYPES = [
  { id: 'venue', name: 'Venue / Club', icon: Building2, description: 'Bars, clubs, and event spaces' },
  { id: 'promoter', name: 'Promoter / Organizer', icon: Calendar, description: 'Event promotion and organization' },
  { id: 'artist', name: 'Artist / DJ', icon: Music, description: 'Musicians, DJs, and performers' },
  { id: 'brand', name: 'Brand / Sponsor', icon: Store, description: 'Brands looking to sponsor events' },
];

const STEPS = ['type', 'details', 'verify'];

export default function BusinessOnboarding() {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    website: '',
    instagram: '',
    city: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const currentUser = await base44.auth.me();
      
      // Update user with business status
      await supabase
        .from('User')
        .update({
          is_business: true,
          is_organizer: businessType === 'promoter',
          business_type: businessType,
          business_name: formData.businessName,
          business_description: formData.description,
          website_url: formData.website,
        })
        .eq('email', currentUser.email);

      toast.success('Business account created!');
      navigate(createPageUrl('BusinessDashboard'));
    } catch (error) {
      console.error('Failed to create business account:', error);
      toast.error('Failed to create business account');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!businessType;
      case 1:
        return formData.businessName && formData.city;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress */}
        <div className="flex justify-center mb-8">
          {STEPS.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold
                ${idx <= step ? 'bg-[#C8962C] text-black' : 'bg-white/10 text-white/40'}
              `}>
                {idx < step ? <Check className="w-5 h-5" /> : idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-16 h-1 mx-2 ${idx < step ? 'bg-[#C8962C]' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Business Type */}
          {step === 0 && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <h1 className="text-3xl font-black uppercase mb-2">What type of business?</h1>
              <p className="text-white/60 mb-8">Select the option that best describes you</p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBusinessType(type.id)}
                    className={`
                      p-6 rounded-xl border-2 text-left transition-all
                      ${businessType === type.id 
                        ? 'bg-[#C8962C]/20 border-[#C8962C]' 
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                      }
                    `}
                  >
                    <type.icon className={`w-8 h-8 mb-3 ${
                      businessType === type.id ? 'text-[#C8962C]' : 'text-white/60'
                    }`} />
                    <div className="font-bold mb-1">{type.name}</div>
                    <div className="text-sm text-white/60">{type.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Business Details */}
          {step === 1 && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="text-3xl font-black uppercase mb-2 text-center">Business Details</h1>
              <p className="text-white/60 mb-8 text-center">Tell us about your business</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 uppercase mb-2 block">
                    Business Name *
                  </label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Your business name"
                    className="bg-white/5 border-white/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does your business do?"
                    className="bg-white/5 border-white/20"
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/60 uppercase mb-2 block">
                      City *
                    </label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="London"
                      className="bg-white/5 border-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/60 uppercase mb-2 block">
                      Website
                    </label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase mb-2 block">
                    Instagram
                  </label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@yourbusiness"
                    className="bg-white/5 border-white/20"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Verification */}
          {step === 2 && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-[#39FF14]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#39FF14]" />
              </div>
              
              <h1 className="text-3xl font-black uppercase mb-2">Almost There!</h1>
              <p className="text-white/60 mb-8">
                Review your information and create your business account
              </p>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left mb-8">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-white/40 uppercase">Business Type</span>
                    <div className="font-semibold">
                      {BUSINESS_TYPES.find(t => t.id === businessType)?.name}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase">Business Name</span>
                    <div className="font-semibold">{formData.businessName}</div>
                  </div>
                  <div>
                    <span className="text-xs text-white/40 uppercase">City</span>
                    <div className="font-semibold">{formData.city}</div>
                  </div>
                  {formData.website && (
                    <div>
                      <span className="text-xs text-white/40 uppercase">Website</span>
                      <div className="font-semibold">{formData.website}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-lg p-4 mb-8">
                <p className="text-sm text-white/80">
                  By creating a business account, you agree to our Business Terms of Service 
                  and acknowledge that you're authorized to represent this business.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button
              onClick={prevStep}
              variant="outline"
              className="border-white/20 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black"
            >
              {submitting ? 'Creating...' : 'Create Business Account'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
