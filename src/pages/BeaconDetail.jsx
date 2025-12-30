import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { MapPin, Zap, Clock, ArrowLeft, Users, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import CommentsSection from '../components/beacon/CommentsSection';
import BeaconActions from '../components/beacon/BeaconActions';
import EventRSVP from '../components/events/EventRSVP';

export default function BeaconDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const beaconId = searchParams.get('id');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.list(),
  });

  const beacon = beacons.find(b => b.id === beaconId);

  if (!beacon) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Beacon not found</p>
          <Button onClick={() => navigate(-1)} variant="ghost">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const BEACON_COLORS = {
    event: '#FF1493',
    venue: '#FF1493',
    hookup: '#FF073A',
    drop: '#FF6B35',
    popup: '#B026FF',
    private: '#00D9FF',
  };

  const handleScan = async () => {
    try {
      const user = await base44.auth.me();
      const newXp = (user.xp || 0) + (beacon.xp_scan || 0);
      await base44.auth.updateMe({ xp: newXp });
      
      // Track interaction
      await base44.entities.UserInteraction.create({
        user_email: user.email,
        interaction_type: 'scan',
        beacon_id: beacon.id,
        beacon_kind: beacon.kind,
        beacon_mode: beacon.mode
      });
      
      alert(`Scanned! +${beacon.xp_scan} XP earned`);
    } catch (error) {
      console.error('Failed to scan:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative h-64 bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border-b border-white/10">
        <div className="absolute inset-0 flex items-end">
          <div className="w-full p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('Beacons'))}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                All Beacons
              </Button>
            </div>
            <span
              className="inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-3"
              style={{
                backgroundColor: BEACON_COLORS[beacon.kind] || '#FF1493',
                color: '#000'
              }}
            >
              {beacon.kind}
            </span>
            <h1 className="text-3xl md:text-5xl font-black mb-2">{beacon.title}</h1>
            <BeaconActions beacon={beacon} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {beacon.description && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-sm uppercase tracking-wider text-white/40 mb-3">Description</h2>
                <p className="text-white/80 leading-relaxed">{beacon.description}</p>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#FF1493]" />
                  <div>
                    <div className="text-xs text-white/40">Location</div>
                    <div className="font-semibold">{beacon.city}</div>
                  </div>
                </div>
                {beacon.created_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#FF1493]" />
                    <div>
                      <div className="text-xs text-white/40">Created</div>
                      <div className="font-semibold">
                        {format(new Date(beacon.created_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                )}
                {beacon.mode && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#FF1493]" />
                    <div>
                      <div className="text-xs text-white/40">Mode</div>
                      <div className="font-semibold uppercase">{beacon.mode}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Event RSVP */}
            {beacon.kind === 'event' && currentUser && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Event RSVP</h3>
                <EventRSVP event={beacon} currentUser={currentUser} />
              </div>
            )}

            {beacon.xp_scan && (
              <div className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border border-[#FFEB3B]/40 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-[#FFEB3B]" />
                  <span className="text-sm uppercase tracking-wider text-white/60">XP Reward</span>
                </div>
                <div className="text-3xl font-black text-[#FFEB3B] mb-4">
                  +{beacon.xp_scan} XP
                </div>
                <Button
                  onClick={handleScan}
                  className="w-full bg-[#FFEB3B] hover:bg-[#FFEB3B]/90 text-black font-bold"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Scan Beacon
                </Button>
              </div>
            )}

            {beacon.intensity && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider text-white/40">Intensity</span>
                  <span className="text-lg font-bold">{Math.round(beacon.intensity * 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF1493]"
                    style={{ width: `${beacon.intensity * 100}%` }}
                  />
                </div>
              </div>
            )}

            {beacon.sponsored && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-white/40">Sponsored</div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <CommentsSection beaconId={beaconId} />
      </div>
    </div>
  );
}