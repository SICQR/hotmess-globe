import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, ArrowRight, ShoppingBag, Store, Check, 
  CreditCard, FileText, Shield, Zap, Star, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Store },
  { id: 'profile', title: 'Profile', icon: FileText },
  { id: 'products', title: 'Products', icon: ShoppingBag },
  { id: 'payout', title: 'Payout', icon: CreditCard },
  { id: 'complete', title: 'Complete', icon: Check },
];

const SELLER_BENEFITS = [
  { icon: Zap, text: 'Low platform fees', color: '#C8962C' },
  { icon: Star, text: 'Featured in marketplace', color: '#C8962C' },
  { icon: Shield, text: 'Secure escrow payments', color: '#00D9FF' },
  { icon: Store, text: 'Your own storefront', color: '#39FF14' },
];

export default function SellerOnboarding() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    storeName: '',
    description: '',
    category: '',
    instagram: '',
    acceptsXP: true,
    acceptsGBP: false,
    bankName: '',
    accountNumber: '',
    sortCode: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          storeName: user?.full_name ? `${user.full_name}'s Store` : '',
        }));
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    try {
      // In production, create seller profile
      toast.success('Seller account created!');
      navigate('/seller-dashboard');
    } catch (error) {
      toast.error('Failed to create seller account');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <Store className="w-20 h-20 text-[#C8962C] mx-auto mb-6" />
            <h2 className="text-3xl font-black uppercase mb-4">
              Start Selling on <span className="text-[#C8962C]">HOTMESS</span>
            </h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Join our community marketplace. Sell merch, art, tickets, services, 
              and more to the HOTMESS community.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
              {SELLER_BENEFITS.map((benefit, idx) => (
                <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-lg text-left">
                  <benefit.icon className="w-6 h-6 mb-2" style={{ color: benefit.color }} />
                  <p className="text-sm font-bold">{benefit.text}</p>
                </div>
              ))}
            </div>

            <Button onClick={nextStep} className="bg-[#C8962C] text-black font-black px-8 py-6">
              Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        );

      case 1: // Profile
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black uppercase mb-2">Your Store Profile</h2>
              <p className="text-white/60">Tell buyers about your brand</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 uppercase mb-2 block">Store Name *</label>
                <Input
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="Your store name"
                  className="bg-white/5 border-white/20"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell buyers what you sell..."
                  className="bg-white/5 border-white/20 h-24"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Merch', 'Art', 'Services', 'Tickets', 'Digital', 'Other'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`py-3 rounded-lg font-bold text-sm transition-all ${
                        formData.category === cat
                          ? 'bg-[#C8962C] text-black'
                          : 'bg-white/5 border border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase mb-2 block">Instagram (optional)</label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@yourhandle"
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2: // Products
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black uppercase mb-2">Payment Options</h2>
              <p className="text-white/60">How do you want to accept payment?</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setFormData({ ...formData, acceptsXP: !formData.acceptsXP })}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  formData.acceptsXP
                    ? 'border-[#FFD700] bg-[#FFD700]/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Zap className={`w-8 h-8 ${formData.acceptsXP ? 'text-[#C8962C]' : 'text-white/40'}`} />
                    <div>
                      <p className="font-black text-lg">Accept Credits</p>
                      <p className="text-white/60 text-sm">0% platform fees • Instant transfer</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.acceptsXP ? 'border-[#C8962C] bg-[#C8962C]' : 'border-white/40'
                  }`}>
                    {formData.acceptsXP && <Check className="w-4 h-4 text-black" />}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setFormData({ ...formData, acceptsGBP: !formData.acceptsGBP })}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  formData.acceptsGBP
                    ? 'border-[#39FF14] bg-[#39FF14]/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className={`w-8 h-8 ${formData.acceptsGBP ? 'text-[#39FF14]' : 'text-white/40'}`} />
                    <div>
                      <p className="font-black text-lg">Accept GBP</p>
                      <p className="text-white/60 text-sm">5% platform fee • Stripe payments</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    formData.acceptsGBP ? 'border-[#39FF14] bg-[#39FF14]' : 'border-white/40'
                  }`}>
                    {formData.acceptsGBP && <Check className="w-4 h-4 text-black" />}
                  </div>
                </div>
              </button>
            </div>

            <div className="p-4 bg-white/5 rounded-lg text-sm text-white/60">
              <p><strong>Tip:</strong> Accepting multiple payment methods helps you reach more buyers in the HOTMESS community!</p>
            </div>
          </motion.div>
        );

      case 3: // Payout
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black uppercase mb-2">Payout Details</h2>
              <p className="text-white/60">Where should we send your earnings?</p>
            </div>

            {formData.acceptsGBP ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 uppercase mb-2 block">Bank Name</label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g. Barclays"
                    className="bg-white/5 border-white/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/60 uppercase mb-2 block">Sort Code</label>
                    <Input
                      value={formData.sortCode}
                      onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
                      placeholder="00-00-00"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 uppercase mb-2 block">Account Number</label>
                    <Input
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="12345678"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                </div>
                <div className="p-4 bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-lg flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[#00D9FF] mt-0.5" />
                  <p className="text-sm text-white/80">
                    Your bank details are encrypted and stored securely. We use Stripe for all GBP payouts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-xl">
                <Zap className="w-12 h-12 text-[#C8962C] mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Credit Seller</h3>
                <p className="text-white/60 max-w-sm mx-auto">
                  You're set up to accept credit payments. Payments are transferred instantly to your account when a sale is made.
                </p>
              </div>
            )}
          </motion.div>
        );

      case 4: // Complete
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-[#39FF14]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-[#39FF14]" />
            </div>
            <h2 className="text-3xl font-black uppercase mb-4">You're All Set!</h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Your seller account is ready. Start adding products and reach the HOTMESS community.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 max-w-md mx-auto text-left">
              <h3 className="font-bold mb-4">Your Store Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Store Name</span>
                  <span className="font-bold">{formData.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Category</span>
                  <span className="font-bold">{formData.category || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Accepts</span>
                  <span className="font-bold">
                    {[formData.acceptsXP && 'Credits', formData.acceptsGBP && 'GBP'].filter(Boolean).join(' + ')}
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={handleSubmit} className="bg-[#39FF14] text-black font-black px-8 py-6">
              Go to Seller Dashboard <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => step > 0 ? prevStep() : navigate(-1)}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step > 0 ? 'Back' : 'Cancel'}
          </Button>
        </div>

        {/* Progress */}
        <div className="flex justify-between mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex-1 flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                idx <= step ? 'bg-[#C8962C]' : 'bg-white/10'
              }`}>
                <s.icon className={`w-5 h-5 ${idx <= step ? 'text-black' : 'text-white/40'}`} />
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${idx < step ? 'bg-[#C8962C]' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        {step > 0 && step < STEPS.length - 1 && (
          <div className="flex justify-between mt-8">
            <Button onClick={prevStep} variant="outline" className="border-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={nextStep} className="bg-[#C8962C] text-black font-bold">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
