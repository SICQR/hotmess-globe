import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function BusinessBilling() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(createPageUrl('BusinessDashboard'))}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Business Dashboard
          </Button>
          <h1 className="text-4xl font-black uppercase mb-2">
            Billing & <span className="text-[#FF1493]">Payments</span>
          </h1>
          <p className="text-white/60">Manage your subscription and payment methods</p>
        </div>

        {/* Billing Content */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
          <div className="flex items-center justify-center flex-col py-12">
            <CreditCard className="w-16 h-16 text-[#FF1493] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Billing & Payments</h2>
            <p className="text-white/60 text-center mb-6 max-w-md">
              View invoices, update payment methods, and manage your subscription.
              This feature is coming soon.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('BusinessDashboard'))}
              className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
