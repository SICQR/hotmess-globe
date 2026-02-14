import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { SmartTravelSelector } from '@/components/travel/SmartTravelSelector';
import { SmartProfileCard } from '@/features/profilesGrid/SmartProfileCard';
import { BentoGrid } from '@/features/profilesGrid/BentoGrid';
import { SmartBadge, MatchScoreBadge, ProximityBadge } from '@/features/profilesGrid/components/SmartBadge';
import { Heart, Zap, Star } from 'lucide-react';
import logger from '@/utils/logger';

/**
 * SmartUIDemo - Showcase page for Smart Dynamic UI System components
 */
export default function SmartUIDemo() {
  const [selectedTravel, setSelectedTravel] = useState(null);

  // Mock profile data
  const mockProfile = {
    id: '1',
    email: 'demo@example.com',
    full_name: 'Alex Thompson',
    avatar_url: 'https://ui-avatars.com/api/?name=Alex+Thompson&size=400&background=FF1493&color=ffffff',
    profile_type: 'premium',
    bio: 'Music lover, night owl, and adventure seeker. Always up for spontaneous plans!',
    city: 'London',
    age: 28,
    is_verified: true,
    is_online: true,
    is_right_now: true,
    tags: ['Music', 'Art', 'Nightlife'],
  };

  const mockProfile2 = {
    id: '2',
    email: 'creator@example.com',
    full_name: 'Jamie Cruz',
    avatar_url: 'https://ui-avatars.com/api/?name=Jamie+Cruz&size=400&background=00D9FF&color=000000',
    profile_type: 'creator',
    bio: 'Content creator and DJ. Hosting events every weekend.',
    city: 'London',
    age: 25,
    is_verified: true,
    is_online: true,
  };

  // Mock travel options
  const travelOptions = [
    { mode: 'walk', durationMinutes: 12, distanceKm: 0.9, label: 'Walk' },
    { mode: 'bike', durationMinutes: 6, distanceKm: 0.9, label: 'Bike' },
    { mode: 'drive', durationMinutes: 8, distanceKm: 0.9, label: 'Drive' },
    { mode: 'uber', durationMinutes: 8, distanceKm: 0.9, price: { min: 12, max: 15, currency: 'GBP' }, label: 'Uber' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black bg-gradient-to-r from-[#FF1493] via-[#00D9FF] to-[#FFD700] bg-clip-text text-transparent">
            Smart Dynamic UI System
          </h1>
          <p className="text-white/60 text-lg">
            Modern, context-aware components with micro-interactions
          </p>
        </div>

        {/* Button System v2 */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Button System v2</h2>
            <p className="text-white/60">New gradient, glow, and ghost variants</p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">Gradient Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="hotGradient">Hot Gradient</Button>
                <Button variant="cyanGradient">Cyan Gradient</Button>
                <Button variant="premium">Premium</Button>
                <Button variant="purpleGradient">Purple Gradient</Button>
                <Button variant="greenGradient">Green Gradient</Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">Glow Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="hotGlow">Hot Glow</Button>
                <Button variant="cyanGlow">Cyan Glow</Button>
                <Button variant="goldGlow">Gold Glow</Button>
                <Button variant="greenGlow">Green Glow</Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">Ghost & Outline</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="ghostGradient">Ghost Gradient</Button>
                <Button variant="outlineHot">Outline Hot</Button>
                <Button variant="outlineCyan">Outline Cyan</Button>
                <Button variant="outlineGold">Outline Gold</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Magnetic Buttons */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Magnetic Buttons</h2>
            <p className="text-white/60">Buttons that follow your cursor with magnetic pull</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <MagneticButton className="bg-[#FF1493] text-white px-6 py-3 rounded-lg font-bold">
              Hover Me!
            </MagneticButton>
            <MagneticButton className="bg-gradient-to-r from-[#00D9FF] to-[#3B82F6] text-white px-6 py-3 rounded-lg font-bold">
              I Follow You
            </MagneticButton>
            <MagneticButton className="bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black px-6 py-3 rounded-lg font-bold">
              Magnetic Effect
            </MagneticButton>
          </div>
        </section>

        {/* Smart Badges */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Smart Badge System</h2>
            <p className="text-white/60">Context-aware badges that prioritize the most relevant information</p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">Standard Badges</h3>
              <div className="flex flex-wrap gap-3">
                <SmartBadge type="live" />
                <SmartBadge type="match" value="95%" />
                <SmartBadge type="nearby" value="2min" />
                <SmartBadge type="premium" />
                <SmartBadge type="verified" />
                <SmartBadge type="new" />
                <SmartBadge type="mutual" />
              </div>
            </div>

            <div>
              <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">Specialized Badges</h3>
              <div className="flex flex-wrap gap-3">
                <MatchScoreBadge score={95} />
                <MatchScoreBadge score={82} />
                <MatchScoreBadge score={73} />
                <ProximityBadge minutes={2} />
                <ProximityBadge minutes={15} />
                <ProximityBadge minutes={45} />
              </div>
            </div>
          </div>
        </section>

        {/* Smart Profile Cards */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Smart Profile Cards</h2>
            <p className="text-white/60">Context-aware cards with dynamic styling and sizing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SmartProfileCard
              profile={mockProfile}
              matchScore={92}
              distanceMinutes={5}
              viewerContext={{
                location: { lat: 51.5074, lng: -0.1278 },
                interests: ['Music', 'Art'],
              }}
              onClick={(p) => logger.debug('Clicked profile:', p.full_name)}
              onMessage={(p) => logger.debug('Message:', p.full_name)}
            />

            <SmartProfileCard
              profile={mockProfile2}
              matchScore={78}
              distanceMinutes={15}
              viewerContext={{
                location: { lat: 51.5074, lng: -0.1278 },
                interests: ['Music'],
              }}
              onClick={(p) => logger.debug('Clicked profile:', p.full_name)}
            />

            <div className="flex items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-lg">
              <p className="text-white/40 text-center">
                More profile cards<br/>would appear here
              </p>
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Bento Grid Layout</h2>
            <p className="text-white/60">Variable-sized grid that adapts to content priority</p>
          </div>

          <BentoGrid
            columns={4}
            gap="md"
            items={[
              {
                id: '1',
                size: '2x2',
                content: (
                  <div className="h-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] rounded-lg p-6 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-white" />
                      <span className="text-sm font-bold text-white uppercase">Featured</span>
                    </div>
                    <h3 className="text-2xl font-black text-white">
                      Spotlight Content
                    </h3>
                    <p className="text-white/80 text-sm mt-2">
                      High priority content gets 2x2 space
                    </p>
                  </div>
                ),
              },
              {
                id: '2',
                size: '1x1',
                content: (
                  <div className="h-full bg-gradient-to-br from-[#00D9FF] to-[#3B82F6] rounded-lg p-4 flex items-center justify-center">
                    <div className="text-center">
                      <Heart className="w-8 h-8 text-white mx-auto mb-2" />
                      <p className="text-white font-bold">Standard</p>
                    </div>
                  </div>
                ),
              },
              {
                id: '3',
                size: '1x1',
                content: (
                  <div className="h-full bg-gradient-to-br from-[#FFD700] to-[#FF6B35] rounded-lg p-4 flex items-center justify-center">
                    <div className="text-center">
                      <Zap className="w-8 h-8 text-black mx-auto mb-2" />
                      <p className="text-black font-bold">Standard</p>
                    </div>
                  </div>
                ),
              },
              {
                id: '4',
                size: '1x2',
                content: (
                  <div className="h-full bg-gradient-to-br from-[#B026FF] to-[#FF1493] rounded-lg p-4 flex flex-col justify-center">
                    <h4 className="text-white font-bold mb-2">Tall Card</h4>
                    <p className="text-white/60 text-sm">Featured items get 1x2 space</p>
                  </div>
                ),
              },
            ]}
          />
        </section>

        {/* Smart Travel Selector */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Smart Travel Selector</h2>
            <p className="text-white/60">Intelligent travel mode recommendations based on context</p>
          </div>

          <div className="max-w-md">
            <SmartTravelSelector
              options={travelOptions}
              destination={{
                name: 'The Vault',
                address: '123 Club Street, London',
                lat: 51.5074,
                lng: -0.1278,
              }}
              onSelect={setSelectedTravel}
              onLaunchDirections={(mode) => logger.debug('Launch directions:', mode)}
              onRequestRide={() => logger.debug('Request Uber')}
              timeOfDay="night"
              weather={{ isGood: true }}
            />
            {selectedTravel && (
              <p className="mt-4 text-white/60 text-sm">
                Selected: <span className="text-[#00D9FF] font-bold">{selectedTravel}</span>
              </p>
            )}
          </div>
        </section>

        {/* Cursor Glow Demo */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-black mb-2">Cursor Glow Effects</h2>
            <p className="text-white/60">Cards that respond to your cursor with a glowing spotlight</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="cursor-glow h-48 bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center">
              <p className="text-white font-bold text-center">
                Hover to see<br/>cursor glow
              </p>
            </div>
            <div className="cursor-glow-cyan h-48 bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center">
              <p className="text-white font-bold text-center">
                Cyan glow<br/>variant
              </p>
            </div>
            <div className="cursor-glow-gold h-48 bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center">
              <p className="text-white font-bold text-center">
                Gold glow<br/>variant
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-12 border-t border-white/10">
          <p className="text-white/40 text-sm">
            Smart Dynamic UI System • HOTMESS Globe
          </p>
        </div>
      </div>
    </div>
  );
}
