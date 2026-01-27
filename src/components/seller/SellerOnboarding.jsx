import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  CreditCard, 
  Package, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  Shield,
  DollarSign,
  FileText,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Store },
  { id: 'profile', title: 'Shop Profile', icon: FileText },
  { id: 'payments', title: 'Payments', icon: CreditCard },
  { id: 'policies', title: 'Policies', icon: Shield },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 },
];

const SELLER_CATEGORIES = [
  { id: 'fashion', label: 'Fashion & Apparel', emoji: '👕' },
  { id: 'art', label: 'Art & Collectibles', emoji: '🎨' },
  { id: 'digital', label: 'Digital Products', emoji: '💾' },
  { id: 'tickets', label: 'Event Tickets', emoji: '🎫' },
  { id: 'services', label: 'Services', emoji: '🛠️' },
  { id: 'music', label: 'Music & Audio', emoji: '🎵' },
  { id: 'other', label: 'Other', emoji: '📦' },
];

export default function SellerOnboarding({ currentUser, onComplete }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    shopName: currentUser?.full_name ? `${currentUser.full_name}'s Shop` : '',
    sellerTagline: '',
    sellerBio: '',
    shopBannerUrl: '',
    categories: [],
    shippingPolicy: 'standard',
    returnPolicy: 'no_returns',
    processingTime: '3-5 days',
    acceptTerms: false,
    stripeConnected: false,
  });
  const [uploading, setUploading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId].slice(0, 3)
    }));
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateField('shopBannerUrl', file_url);
      toast.success('Banner uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const connectStripe = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: currentUser.email,
          return_url: `${window.location.origin}/seller-onboarding?step=payments&connected=true`,
          refresh_url: `${window.location.origin}/seller-onboarding?step=payments&refresh=true`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create Stripe onboarding link');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to connect Stripe');
    } finally {
      setConnecting(false);
    }
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        profile_type: 'seller',
        seller_tagline: formData.sellerTagline,
        seller_bio: formData.sellerBio,
        shop_banner_url: formData.shopBannerUrl,
        seller_categories: formData.categories,
        shipping_policy: formData.shippingPolicy,
        return_policy: formData.returnPolicy,
        processing_time: formData.processingTime,
        seller_onboarded: true,
        seller_onboarded_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('🎉 Your shop is ready!');
      if (onComplete) {
        onComplete();
      } else {
        navigate(createPageUrl('SellerDashboard'));
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete setup');
    },
  });

  const canProceed = () => {
    switch (currentStep.id) {
      case 'welcome':
        return true;
      case 'profile':
        return formData.sellerTagline.length >= 10 && formData.categories.length > 0;
      case 'payments':
        return true; // Stripe is optional for now (can use XP-only)
      case 'policies':
        return formData.acceptTerms;
      case 'complete':
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      completeMutation.mutate();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  // Check for Stripe callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      updateField('stripeConnected', true);
      toast.success('Stripe account connected!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <motion.div 
          className="h-full bg-gradient-to-r from-[#E62020] to-[#00D9FF]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step Indicators */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex gap-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === step;
            const isComplete = idx < step;
            return (
              <div
                key={s.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-[#E62020] text-black' 
                    : isComplete 
                      ? 'bg-[#39FF14] text-black'
                      : 'bg-white/10 text-white/40'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Welcome Step */}
            {currentStep.id === 'welcome' && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-[#E62020] to-[#B026FF] rounded-2xl flex items-center justify-center"
                >
                  <Store className="w-12 h-12 text-white" />
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-black uppercase mb-4">
                  Welcome to<br />
                  <span className="bg-gradient-to-r from-[#E62020] to-[#00D9FF] bg-clip-text text-transparent">
                    MessMarket
                  </span>
                </h1>

                <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
                  Set up your seller account in just a few minutes and start selling to the hotmess community.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-12">
                  {[
                    { icon: Package, label: 'List Products', desc: 'Physical or digital' },
                    { icon: DollarSign, label: 'Accept XP & GBP', desc: 'Multiple payment methods' },
                    { icon: Shield, label: 'Secure Escrow', desc: 'Protected transactions' },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <item.icon className="w-8 h-8 text-[#00D9FF] mx-auto mb-2" />
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-xs text-white/40">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Step */}
            {currentStep.id === 'profile' && (
              <div>
                <h2 className="text-3xl font-black uppercase mb-2">Shop Profile</h2>
                <p className="text-white/60 mb-8">Tell buyers about your shop</p>

                <div className="space-y-6">
                  {/* Banner Upload */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      Shop Banner (optional)
                    </Label>
                    <div 
                      className="relative h-40 bg-white/5 border-2 border-dashed border-white/20 rounded-xl overflow-hidden cursor-pointer hover:border-white/40 transition-colors"
                      onClick={() => document.getElementById('banner-upload').click()}
                    >
                      {formData.shopBannerUrl ? (
                        <img 
                          src={formData.shopBannerUrl} 
                          alt="Shop banner" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Upload className="w-8 h-8 text-white/40 mb-2" />
                          <p className="text-sm text-white/40">Click to upload banner</p>
                          <p className="text-xs text-white/20">1200x400 recommended</p>
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      Shop Tagline *
                    </Label>
                    <Input
                      value={formData.sellerTagline}
                      onChange={(e) => updateField('sellerTagline', e.target.value)}
                      placeholder="Premium streetwear & club gear"
                      maxLength={60}
                      className="bg-white/5 border-white/20 text-white"
                    />
                    <p className="text-xs text-white/40 mt-1">{formData.sellerTagline.length}/60</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      Shop Description
                    </Label>
                    <Textarea
                      value={formData.sellerBio}
                      onChange={(e) => updateField('sellerBio', e.target.value)}
                      placeholder="Tell buyers about your shop, what you sell, and what makes you unique..."
                      rows={4}
                      maxLength={500}
                      className="bg-white/5 border-white/20 text-white"
                    />
                    <p className="text-xs text-white/40 mt-1">{formData.sellerBio.length}/500</p>
                  </div>

                  {/* Categories */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      What do you sell? * (up to 3)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SELLER_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          disabled={!formData.categories.includes(cat.id) && formData.categories.length >= 3}
                          className={`p-3 text-left border-2 transition-all ${
                            formData.categories.includes(cat.id)
                              ? 'bg-[#E62020] border-[#E62020] text-black'
                              : 'bg-white/5 border-white/20 text-white hover:border-white/40 disabled:opacity-40'
                          }`}
                        >
                          <span className="text-xl mr-2">{cat.emoji}</span>
                          <span className="text-sm font-bold">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Step */}
            {currentStep.id === 'payments' && (
              <div>
                <h2 className="text-3xl font-black uppercase mb-2">Payment Setup</h2>
                <p className="text-white/60 mb-8">Choose how you want to get paid</p>

                <div className="space-y-4">
                  {/* XP Payments - Always enabled */}
                  <div className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#FF6B35]/10 border-2 border-[#FFEB3B] rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#FFEB3B] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-black" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-black">XP Payments</h3>
                          <span className="px-2 py-1 bg-[#39FF14] text-black text-xs font-bold rounded">ENABLED</span>
                        </div>
                        <p className="text-white/60 text-sm mb-3">
                          Accept XP from the hotmess community. Great for building reputation and community engagement.
                        </p>
                        <ul className="text-xs text-white/40 space-y-1">
                          <li>• Instant transactions</li>
                          <li>• No processing fees</li>
                          <li>• 10% platform fee on P2P sales</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Stripe Connect */}
                  <div className={`border-2 rounded-xl p-6 ${
                    formData.stripeConnected 
                      ? 'bg-gradient-to-br from-[#00D9FF]/10 to-[#39FF14]/10 border-[#39FF14]'
                      : 'bg-white/5 border-white/20'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        formData.stripeConnected ? 'bg-[#39FF14]' : 'bg-white/10'
                      }`}>
                        <CreditCard className={`w-6 h-6 ${formData.stripeConnected ? 'text-black' : 'text-white'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-black">Stripe Connect</h3>
                          {formData.stripeConnected && (
                            <span className="px-2 py-1 bg-[#39FF14] text-black text-xs font-bold rounded">CONNECTED</span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm mb-3">
                          Accept card payments, Apple Pay, Google Pay. Funds deposited directly to your bank.
                        </p>
                        
                        {!formData.stripeConnected ? (
                          <>
                            <ul className="text-xs text-white/40 space-y-1 mb-4">
                              <li>• Accept cards worldwide</li>
                              <li>• Weekly automatic payouts</li>
                              <li>• 2.9% + 30p per transaction</li>
                            </ul>
                            <Button
                              onClick={connectStripe}
                              disabled={connecting}
                              className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-bold"
                            >
                              {connecting ? 'Connecting...' : 'Connect Stripe Account'}
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-[#39FF14]">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-bold">Ready to accept card payments</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-center text-white/40 text-sm">
                    You can set up Stripe later from your seller dashboard
                  </p>
                </div>
              </div>
            )}

            {/* Policies Step */}
            {currentStep.id === 'policies' && (
              <div>
                <h2 className="text-3xl font-black uppercase mb-2">Shop Policies</h2>
                <p className="text-white/60 mb-8">Set expectations for your buyers</p>

                <div className="space-y-6">
                  {/* Processing Time */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      Processing Time
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: '1-2 days', label: '1-2 Days' },
                        { value: '3-5 days', label: '3-5 Days' },
                        { value: '1-2 weeks', label: '1-2 Weeks' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('processingTime', opt.value)}
                          className={`p-3 text-sm font-bold border-2 transition-all ${
                            formData.processingTime === opt.value
                              ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                              : 'bg-white/5 border-white/20 text-white hover:border-white/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Policy */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      Shipping
                    </Label>
                    <div className="space-y-2">
                      {[
                        { value: 'standard', label: 'Standard Shipping', desc: 'Regular mail, tracking optional' },
                        { value: 'tracked', label: 'Tracked Shipping', desc: 'Always includes tracking' },
                        { value: 'local_only', label: 'Local Pickup Only', desc: 'Collection in person' },
                        { value: 'digital', label: 'Digital Delivery', desc: 'Instant download/delivery' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('shippingPolicy', opt.value)}
                          className={`w-full p-4 text-left border-2 transition-all ${
                            formData.shippingPolicy === opt.value
                              ? 'bg-[#E62020]/20 border-[#E62020]'
                              : 'bg-white/5 border-white/20 hover:border-white/40'
                          }`}
                        >
                          <span className="font-bold block">{opt.label}</span>
                          <span className="text-xs text-white/60">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Return Policy */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                      Returns
                    </Label>
                    <div className="space-y-2">
                      {[
                        { value: 'no_returns', label: 'No Returns', desc: 'All sales final' },
                        { value: '7_days', label: '7 Day Returns', desc: 'Buyer pays return shipping' },
                        { value: '30_days', label: '30 Day Returns', desc: 'Full refund policy' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('returnPolicy', opt.value)}
                          className={`w-full p-4 text-left border-2 transition-all ${
                            formData.returnPolicy === opt.value
                              ? 'bg-[#E62020]/20 border-[#E62020]'
                              : 'bg-white/5 border-white/20 hover:border-white/40'
                          }`}
                        >
                          <span className="font-bold block">{opt.label}</span>
                          <span className="text-xs text-white/60">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptTerms}
                        onChange={(e) => updateField('acceptTerms', e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-white/30"
                      />
                      <div>
                        <span className="font-bold block mb-1">I agree to the Seller Terms</span>
                        <span className="text-xs text-white/60">
                          I understand that hotmess takes a 10% platform fee on P2P XP sales, 
                          and I will handle shipping and customer service for my products.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Step */}
            {currentStep.id === 'complete' && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-[#39FF14] to-[#00D9FF] rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-black" />
                </motion.div>

                <h1 className="text-4xl font-black uppercase mb-4">
                  You're All Set!
                </h1>

                <p className="text-white/60 text-lg mb-8 max-w-md mx-auto">
                  Your seller account is ready. Start listing products and reach the hotmess community.
                </p>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
                  <h3 className="font-bold mb-4">Your Shop Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Tagline</span>
                      <span className="font-bold">{formData.sellerTagline || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Categories</span>
                      <span className="font-bold">
                        {formData.categories.map(c => 
                          SELLER_CATEGORIES.find(cat => cat.id === c)?.emoji
                        ).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Processing Time</span>
                      <span className="font-bold">{formData.processingTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Stripe Payments</span>
                      <span className={`font-bold ${formData.stripeConnected ? 'text-[#39FF14]' : 'text-white/40'}`}>
                        {formData.stripeConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <Package className="w-8 h-8 text-[#E62020] mx-auto mb-2" />
                    <p className="text-sm font-bold">List Your First Product</p>
                    <p className="text-xs text-white/40">Start selling today</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <Shield className="w-8 h-8 text-[#00D9FF] mx-auto mb-2" />
                    <p className="text-sm font-bold">Get Verified</p>
                    <p className="text-xs text-white/40">Build buyer trust</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Button
            onClick={handleBack}
            variant="ghost"
            disabled={step === 0}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || completeMutation.isPending}
            className={`font-bold ${
              step === STEPS.length - 1
                ? 'bg-[#39FF14] hover:bg-[#39FF14]/90 text-black'
                : 'bg-[#E62020] hover:bg-[#E62020]/90 text-black'
            }`}
          >
            {completeMutation.isPending ? (
              'Setting up...'
            ) : step === STEPS.length - 1 ? (
              <>
                Open Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
