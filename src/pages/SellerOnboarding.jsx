import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function SellerOnboarding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(createPageUrl('Marketplace'))}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
          <h1 className="text-4xl font-black uppercase mb-2">
            Become a <span className="text-[#FF1493]">Seller</span>
          </h1>
          <p className="text-white/60">Start selling your products on HOTMESS Marketplace</p>
        </div>

        {/* Onboarding Content */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
          <div className="flex items-center justify-center flex-col py-12">
            <ShoppingBag className="w-16 h-16 text-[#FF1493] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Seller Onboarding</h2>
            <p className="text-white/60 text-center mb-6 max-w-md">
              This feature is coming soon. Set up your seller profile, add products, and start earning.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => navigate(createPageUrl('SellerDashboard'))}
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
              >
                Go to Seller Dashboard
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('Marketplace'))}
                variant="outline"
                className="border-white/20 text-white"
              >
                Back to Marketplace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
