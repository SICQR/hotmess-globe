import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function BusinessSettings() {
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
            Business <span className="text-[#FF1493]">Settings</span>
          </h1>
          <p className="text-white/60">Manage your business account settings and preferences</p>
        </div>

        {/* Settings Content */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
          <div className="flex items-center justify-center flex-col py-12">
            <Settings className="w-16 h-16 text-[#FF1493] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Business Settings</h2>
            <p className="text-white/60 text-center mb-6 max-w-md">
              Configure your business profile, notifications, billing, and more.
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
