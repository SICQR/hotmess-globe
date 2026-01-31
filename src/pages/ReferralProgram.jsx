import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gift } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ReferralProgram() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-black uppercase mb-2">
            Referral <span className="text-[#FF1493]">Program</span>
          </h1>
          <p className="text-white/60">Earn rewards by inviting friends to HOTMESS</p>
        </div>

        {/* Referral Content */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
          <div className="flex items-center justify-center flex-col py-12">
            <Gift className="w-16 h-16 text-[#FF1493] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Referral Program</h2>
            <p className="text-white/60 text-center mb-6 max-w-md">
              Invite friends and earn exclusive rewards, perks, and benefits.
              Track your referrals and see your rewards grow.
              This feature is coming soon.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('More'))}
              className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
            >
              Explore More Features
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
