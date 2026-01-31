import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, CreditCard, Download, CheckCircle, AlertCircle,
  Calendar, Receipt, Sparkles, Crown, Building2, Zap
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { supabase } from '@/components/utils/supabaseClient';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    color: '#00D9FF',
    icon: Building2,
    features: ['1 Event listing/month', 'Basic analytics', 'Email support']
  },
  {
    id: 'pro',
    name: 'Venue Pro',
    price: 149,
    color: '#FF1493',
    icon: Sparkles,
    popular: true,
    features: ['Unlimited listings', 'QR check-in', 'Priority support', 'Featured placement']
  },
  {
    id: 'enterprise',
    name: 'Network',
    price: 499,
    color: '#FFD700',
    icon: Crown,
    features: ['Multi-venue', 'Sponsor inventory', 'Custom integrations', 'Dedicated manager']
  }
];

export default function BusinessBilling() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('starter');

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) { setLoading(false); return; }
    
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('owner_id', user.user.id)
      .single();
    
    setBusiness(biz);
    setCurrentPlan(biz?.subscription_tier || 'starter');
    
    // Mock invoices for now
    setInvoices([
      { id: 1, date: '2026-01-01', amount: 149, status: 'paid', description: 'Venue Pro - January 2026' },
      { id: 2, date: '2025-12-01', amount: 149, status: 'paid', description: 'Venue Pro - December 2025' },
      { id: 3, date: '2025-11-01', amount: 149, status: 'paid', description: 'Venue Pro - November 2025' },
    ]);
    setLoading(false);
  };

  const selectedPlan = PLANS.find(p => p.id === currentPlan);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => navigate(createPageUrl('BusinessDashboard'))}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-black uppercase">
            Billing & <span className="text-[#FF1493]">Payments</span>
          </h1>
          <p className="text-white/60 mt-2">Manage your subscription and payment methods</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border-2 border-[#FF1493] p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedPlan && (
                <div 
                  className="w-12 h-12 flex items-center justify-center border-2"
                  style={{ borderColor: selectedPlan.color, backgroundColor: `${selectedPlan.color}20` }}
                >
                  <selectedPlan.icon className="w-6 h-6" style={{ color: selectedPlan.color }} />
                </div>
              )}
              <div>
                <p className="text-xs text-white/60 uppercase tracking-wider">Current Plan</p>
                <h2 className="text-2xl font-black">{selectedPlan?.name || 'Starter'}</h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#FF1493]">£{selectedPlan?.price || 49}</p>
              <p className="text-xs text-white/60">per month</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Calendar className="w-4 h-4" />
              Next billing: February 1, 2026
            </div>
            <Button variant="outline" size="sm" className="border-white/20">
              Change Plan
            </Button>
          </div>
        </motion.div>

        {/* Plans Grid */}
        <h3 className="text-xl font-black uppercase mb-4">Available Plans</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isActive = plan.id === currentPlan;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative p-6 border-2 transition-all ${
                  isActive ? 'border-[#FF1493] bg-[#FF1493]/10' : 'border-white/10 hover:border-white/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#39FF14] text-black text-xs font-black px-3 py-1">
                    MOST POPULAR
                  </div>
                )}
                <div 
                  className="w-10 h-10 flex items-center justify-center border mb-4"
                  style={{ borderColor: plan.color, backgroundColor: `${plan.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: plan.color }} />
                </div>
                <h4 className="font-black uppercase mb-1">{plan.name}</h4>
                <p className="text-2xl font-black mb-4" style={{ color: plan.color }}>
                  £{plan.price}<span className="text-sm text-white/60">/mo</span>
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="w-4 h-4" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  variant={isActive ? 'outline' : 'hot'} 
                  className="w-full"
                  disabled={isActive}
                >
                  {isActive ? 'Current Plan' : 'Upgrade'}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Payment Method */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 p-6">
            <h3 className="font-black uppercase mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00D9FF]" />
              Payment Method
            </h3>
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                  VISA
                </div>
                <div>
                  <p className="font-bold">•••• •••• •••• 4242</p>
                  <p className="text-xs text-white/60">Expires 12/27</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6">
            <h3 className="font-black uppercase mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#FFD700]" />
              Amplification Credits
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-[#FFD700]">1,250</p>
                <p className="text-xs text-white/60">Available credits</p>
              </div>
              <Button variant="outline" className="border-[#FFD700] text-[#FFD700]">
                Buy More
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black uppercase flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#B026FF]" />
              Invoice History
            </h3>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
          
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div 
                key={invoice.id}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#39FF14]/20 border border-[#39FF14] flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <div>
                    <p className="font-bold">{invoice.description}</p>
                    <p className="text-xs text-white/60">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold">£{invoice.amount}</p>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
