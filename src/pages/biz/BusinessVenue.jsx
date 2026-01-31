import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function BusinessVenue() {
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
            Venue <span className="text-[#FF1493]">Management</span>
          </h1>
          <p className="text-white/60">Manage your venue details and settings</p>
        </div>

        {/* Venue Content */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
          <div className="flex items-center justify-center flex-col py-12">
            <Building2 className="w-16 h-16 text-[#FF1493] mb-4" />
            <h2 className="text-2xl font-bold mb-2">Venue Management</h2>
            <p className="text-white/60 text-center mb-6 max-w-md">
              Update venue information, hours of operation, capacity, and amenities.
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
