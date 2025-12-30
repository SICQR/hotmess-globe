import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Trophy, Zap, MapPin, MessageCircle, Calendar, Star, ArrowRight, Globe, Smartphone, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MOCKUPS = [
  {
    id: 1,
    title: 'New User Discovery',
    tagline: 'From Download to First Scan',
    color: '#FF1493',
    icon: Sparkles,
    steps: [
      {
        title: 'Download & Onboard',
        description: 'User discovers HOTMESS, creates account, sees welcome tutorial',
        screen: 'Welcome screen with animated globe, "Start Exploring" CTA',
        actions: ['Sign up with email', 'Choose interests (techno, house, drag)', 'Enable location'],
        metrics: '30s avg time'
      },
      {
        title: 'Explore Globe',
        description: 'Interactive 3D globe shows nearby beacons pulsing with activity',
        screen: 'Globe view with London beacons glowing, user can spin & zoom',
        actions: ['See 47 active beacons nearby', 'Filter by "Late Night"', 'Click FOLD beacon'],
        metrics: '2min avg session'
      },
      {
        title: 'Beacon Detail',
        description: 'Rich event info: lineup, capacity, vibe meter, user photos',
        screen: 'Full-screen beacon card with immersive media, comments, map',
        actions: ['Bookmark event', 'See 230 people interested', 'Check XP reward: +150'],
        metrics: '85% bookmark rate'
      },
      {
        title: 'First Scan',
        description: 'User arrives at venue, scans QR/NFC beacon, earns XP',
        screen: 'Camera scanner with haptic feedback, confetti animation',
        actions: ['Scan beacon', 'Earn +150 XP', 'Level up to LVL 2', 'Unlock "Night Owl" badge'],
        metrics: '+150 XP, Badge unlocked'
      },
      {
        title: 'Post-Scan Engagement',
        description: 'Share experience, connect with others who scanned',
        screen: 'Check-in confirmation, upload photo, see 18 others here now',
        actions: ['Upload venue photo', 'See nearby users', 'Join venue chat', 'Follow 3 new people'],
        metrics: '40% share rate'
      }
    ]
  },
  {
    id: 2,
    title: 'Social Connection Flow',
    tagline: 'AI Match to Anonymous Chat',
    color: '#B026FF',
    icon: Users,
    steps: [
      {
        title: 'AI Discovers Match',
        description: 'System analyzes intent, location, XP history to find compatible users',
        screen: 'Network tab showing "6 New Matches" with AI confidence scores',
        actions: ['Open Network page', 'See AI Matches tab glowing', 'View match cards'],
        metrics: '92% match accuracy'
      },
      {
        title: 'Match Profile',
        description: 'See shared interests, mutual beacons, compatibility breakdown',
        screen: 'Match card: Alex, 89% match, shared vibes: techno + late_night',
        actions: ['See "Both at FOLD last weekend"', 'Check XP similarity', 'View highlights'],
        metrics: '89% compatibility'
      },
      {
        title: 'Handshake Initiation',
        description: 'User hits CONNECT, generates secure 16-char token',
        screen: 'CONNECT button → generating token animation',
        actions: ['Tap CONNECT', 'Token created: Kx7pLm2N9qRt4wVj', 'Expires in 24h'],
        metrics: '<1s token gen'
      },
      {
        title: 'Telegram Deep-Link',
        description: 'Opens Telegram bot with pre-filled handshake context',
        screen: 'Telegram app opens to @hotmess_london_bot with /start Kx7pLm2N9qRt4wVj',
        actions: ['Telegram launches', 'Bot confirms handshake', 'Anonymous chat begins'],
        metrics: '95% completion'
      },
      {
        title: 'Anonymous Conversation',
        description: 'Users chat without revealing identity until ready',
        screen: 'Telegram chat: "User_7492" talking about FOLD, music taste',
        actions: ['Send messages', 'Share beacon links', 'Optionally reveal identity later'],
        metrics: '15min avg chat'
      }
    ]
  },
  {
    id: 3,
    title: 'Organizer Journey',
    tagline: 'Event Creation to Analytics',
    color: '#FFEB3B',
    icon: Calendar,
    steps: [
      {
        title: 'Create Event',
        description: 'Organizer uses multi-step wizard to launch beacon',
        screen: 'CreateBeacon page: 4-step form with progress bar',
        actions: ['Enter event details', 'Upload promo video', 'Set capacity: 500', 'Choose XP reward'],
        metrics: '3min avg creation'
      },
      {
        title: 'Event Goes Live',
        description: 'Beacon instantly appears on globe, map, calendar, feeds',
        screen: 'Real-time propagation: Globe pins it, push notifications sent',
        actions: ['Publish event', 'See it on globe immediately', 'Notifications to 1,200 users'],
        metrics: 'Live in <2s'
      },
      {
        title: 'User Discovery',
        description: 'Users find event via globe, search, AI recommendations',
        screen: 'Multiple discovery paths: globe click, search "techno", AI suggests',
        actions: ['47 bookmarks in first hour', '230 views', '18 shares'],
        metrics: '47 bookmarks/hr'
      },
      {
        title: 'Event Night',
        description: 'Real-time tracking: check-ins, scans, photos, chat activity',
        screen: 'Organizer dashboard: live metrics, heatmap of attendees',
        actions: ['312 scans', '89 photo uploads', 'Peak: 11:30pm', 'Avg rating: 4.8'],
        metrics: '312 scans'
      },
      {
        title: 'Post-Event Analytics',
        description: 'Comprehensive report: engagement, demographics, ROI',
        screen: 'OrganizerDashboard: charts, export data, user feedback',
        actions: ['View full analytics', 'Export attendee emails', 'Plan next event'],
        metrics: '4.8★ rating'
      }
    ]
  },
  {
    id: 4,
    title: 'Squad Formation',
    tagline: 'Group Discovery & Coordination',
    color: '#00D9FF',
    icon: Users,
    steps: [
      {
        title: 'Create Squad',
        description: 'User forms interest-based group for coordinated exploration',
        screen: 'Squad creation form: name, interest (techno), color picker',
        actions: ['Name: "Warehouse Warriors"', 'Interest: techno', 'Color: #FF073A'],
        metrics: 'Squad created'
      },
      {
        title: 'Invite Members',
        description: 'Add friends, AI suggests compatible users',
        screen: 'Member invite: search users, AI suggests 8 matches',
        actions: ['Invite 4 friends', 'AI suggests 3 similar users', '7/7 accept'],
        metrics: '7 members'
      },
      {
        title: 'Squad Intent',
        description: 'Members set "Right Now" mood, visible as mood blob on globe',
        screen: 'Squad members all set "exploring" → forms large purple blob',
        actions: ['Set intent: exploring', 'See squad blob on globe', 'Fuzzy GPS: ~500m radius'],
        metrics: 'Mood blob active'
      },
      {
        title: 'Coordinate Meetup',
        description: 'Squad chat, shared beacon bookmarks, live location sharing',
        screen: 'Squad feed: "Warehouse Warriors going to FOLD at 11pm"',
        actions: ['Squad chat active', '4 bookmarked same beacon', 'Set meetup time'],
        metrics: '4/7 attending'
      },
      {
        title: 'Group Experience',
        description: 'All check in together, earn bonus squad XP',
        screen: 'Group check-in: +150 XP each + 50 bonus squad XP',
        actions: ['Scan together', 'Squad XP bonus', 'Upload group photo', 'Climb squad leaderboard'],
        metrics: '+200 XP total'
      }
    ]
  },
  {
    id: 5,
    title: 'Power User Arc',
    tagline: 'Casual to Influencer',
    color: '#39FF14',
    icon: Trophy,
    steps: [
      {
        title: 'Early Engagement',
        description: 'User starts attending events regularly, scanning beacons',
        screen: 'Profile: 12 check-ins, 1,450 XP, LVL 3',
        actions: ['Attend 12 events', 'Earn badges', 'Follow 20 users', '8 followers'],
        metrics: '1,450 XP, LVL 3'
      },
      {
        title: 'Achievement Hunter',
        description: 'Unlocks rare badges, appears on leaderboard',
        screen: 'Leaderboard: #47 globally, badges: 8/50, streaks: 7 days',
        actions: ['Unlock "Early Bird"', 'Hit 7-day streak', 'Enter top 50', '28 followers now'],
        metrics: '#47 globally'
      },
      {
        title: 'Content Creator',
        description: 'Posts quality check-in photos, writes reviews, curates',
        screen: 'Profile highlights: 45 check-ins with photos, 89% helpful votes',
        actions: ['Upload 45 photos', 'Write detailed reviews', '230 photo likes', '67 followers'],
        metrics: '230 likes'
      },
      {
        title: 'Community Leader',
        description: 'Creates popular squad, organizes events, mentors new users',
        screen: 'Squad admin of 34-member "Techno Tribe", hosted 3 events',
        actions: ['Squad grows to 34', 'Host unofficial meetup', 'Guide 12 new users'],
        metrics: '34-member squad'
      },
      {
        title: 'Influencer Status',
        description: 'Top 10 leaderboard, sponsored by venues, exclusive access',
        screen: 'Profile: LVL 15, 15,000 XP, #8 globally, verified badge',
        actions: ['Reach top 10', 'Get verified', 'Sponsored by 2 venues', '450 followers'],
        metrics: '#8 globally, 450 followers'
      }
    ]
  }
];

export default function ExperienceMockups() {
  const [selectedMockup, setSelectedMockup] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">
            End-to-End <span className="text-[#FF1493]">Experience</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            5 complete user journeys from first touch to power user
          </p>
        </motion.div>

        {/* Mockup Selection Grid */}
        {!selectedMockup && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCKUPS.map((mockup, idx) => {
              const Icon = mockup.icon;
              return (
                <motion.button
                  key={mockup.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => {
                    setSelectedMockup(mockup);
                    setActiveStep(0);
                  }}
                  className="group relative bg-white/5 border-2 border-white/10 hover:border-white/30 rounded-2xl p-8 text-left transition-all hover:scale-105"
                  style={{
                    borderColor: mockup.color,
                    background: `linear-gradient(135deg, ${mockup.color}10, transparent)`
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${mockup.color}20`, border: `2px solid ${mockup.color}` }}
                    >
                      <Icon className="w-8 h-8" style={{ color: mockup.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: mockup.color }}>
                        Journey {mockup.id}
                      </div>
                      <h3 className="text-2xl font-black mb-2">{mockup.title}</h3>
                      <p className="text-sm text-white/60">{mockup.tagline}</p>
                    </div>
                  </div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">
                    {mockup.steps.length} Steps • Click to Explore
                  </div>
                  <ArrowRight className="absolute bottom-8 right-8 w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Detailed Journey View */}
        <AnimatePresence mode="wait">
          {selectedMockup && (
            <motion.div
              key={selectedMockup.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Journey Header */}
              <div className="mb-8">
                <Button
                  onClick={() => setSelectedMockup(null)}
                  variant="ghost"
                  className="mb-4 text-white/60 hover:text-white"
                >
                  ← Back to All Journeys
                </Button>
                <div className="flex items-center gap-4 mb-6">
                  {React.createElement(selectedMockup.icon, {
                    className: "w-12 h-12",
                    style: { color: selectedMockup.color }
                  })}
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: selectedMockup.color }}>
                      Journey {selectedMockup.id}
                    </div>
                    <h2 className="text-4xl font-black">{selectedMockup.title}</h2>
                    <p className="text-white/60">{selectedMockup.tagline}</p>
                  </div>
                </div>

                {/* Step Progress */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4">
                  {selectedMockup.steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveStep(idx)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                        activeStep === idx
                          ? 'text-black'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                      style={{
                        backgroundColor: activeStep === idx ? selectedMockup.color : undefined
                      }}
                    >
                      Step {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Step Detail */}
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Left: Step Info */}
                <div className="space-y-6">
                  <div className="bg-white/5 border-2 rounded-2xl p-8" style={{ borderColor: selectedMockup.color }}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: selectedMockup.color }}>
                      Step {activeStep + 1} of {selectedMockup.steps.length}
                    </div>
                    <h3 className="text-3xl font-black mb-4">{selectedMockup.steps[activeStep].title}</h3>
                    <p className="text-lg text-white/80 mb-6">{selectedMockup.steps[activeStep].description}</p>
                    
                    <div className="mb-6">
                      <div className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">User Actions</div>
                      <div className="space-y-2">
                        {selectedMockup.steps[activeStep].actions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: `${selectedMockup.color}20`, border: `1px solid ${selectedMockup.color}` }}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMockup.color }} />
                            </div>
                            <p className="text-sm text-white/80">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <div className="text-sm font-bold uppercase tracking-wider text-white/40 mb-2">Metrics</div>
                      <div className="text-2xl font-black" style={{ color: selectedMockup.color }}>
                        {selectedMockup.steps[activeStep].metrics}
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                      disabled={activeStep === 0}
                      variant="outline"
                      className="flex-1 border-white/20 text-white"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setActiveStep(Math.min(selectedMockup.steps.length - 1, activeStep + 1))}
                      disabled={activeStep === selectedMockup.steps.length - 1}
                      className="flex-1 text-black"
                      style={{ backgroundColor: selectedMockup.color }}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>

                {/* Right: Screen Mockup */}
                <div>
                  <div className="bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/20 rounded-3xl p-8">
                    <div className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4">Screen Preview</div>
                    <div className="bg-black border-4 rounded-2xl aspect-[9/16] max-w-sm mx-auto flex items-center justify-center p-8 relative overflow-hidden"
                      style={{ borderColor: selectedMockup.color }}
                    >
                      {/* Phone notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-10" />
                      
                      {/* Screen content */}
                      <div className="text-center space-y-4 w-full">
                        <Smartphone className="w-12 h-12 mx-auto" style={{ color: selectedMockup.color }} />
                        <p className="text-sm text-white/80 leading-relaxed px-4">
                          {selectedMockup.steps[activeStep].screen}
                        </p>
                        
                        {/* Visual indicators */}
                        <div className="flex justify-center gap-3 mt-6">
                          <Eye className="w-8 h-8 text-white/20" />
                          <Heart className="w-8 h-8 text-white/20" />
                          <Zap className="w-8 h-8" style={{ color: selectedMockup.color }} />
                        </div>
                      </div>

                      {/* Ambient glow */}
                      <div 
                        className="absolute inset-0 opacity-20 blur-3xl"
                        style={{ background: `radial-gradient(circle at center, ${selectedMockup.color}, transparent)` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}