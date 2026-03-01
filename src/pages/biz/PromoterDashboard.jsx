/**
 * Promoter Dashboard
 * 
 * For clubs, event promoters, and ticket sellers to:
 * - Create event beacons on the globe
 * - Track analytics
 * - Manage RSVPs
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Eye, 
  MousePointer, 
  Users,
  Plus,
  Calendar,
  TrendingUp,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Tier display info
const TIER_COLORS = {
  'basic_3h': '#FFFFFF',
  'standard_6h': '#00D9FF',
  'premium_9h': '#C8962C',
  'featured_12h': '#C8962C',
  'spotlight_24h': '#C8962C'
};

export default function PromoterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [beacons, setBeacons] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch promoter data
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    async function fetchData() {

      // Fetch beacons
      const { data: beaconsData, error: beaconsError } = await supabase
        .from('beacons')
        .select('*, event_rsvps(count)')
        .eq('promoter_id', user.id)
        .eq('kind', 'event')
        .order('created_date', { ascending: false });

      if (beaconsError) {
        console.error('Error fetching beacons:', beaconsError);
      }

      // Fetch tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('beacon_tiers')
        .select('*')
        .order('price_cents', { ascending: true });

      if (tiersError) {
        console.error('Error fetching tiers:', tiersError);
      }

      // Process beacons to flattened structure
      const processedBeacons = (beaconsData || []).map(beacon => ({
        ...beacon,
        // Use exact count from relation if available, otherwise fallback to column or 0
        rsvp_count: beacon.event_rsvps?.[0]?.count ?? beacon.rsvp_count ?? 0
      }));

      // Calculate aggregate stats
      const aggregateStats = {
        totalViews: processedBeacons.reduce((sum, b) => sum + (b.view_count || 0), 0),
        totalClicks: processedBeacons.reduce((sum, b) => sum + (b.click_count || 0), 0),
        totalRsvps: processedBeacons.reduce((sum, b) => sum + (b.rsvp_count || 0), 0),
        activeBeacons: processedBeacons.filter(b => 
          b.beacon_expires_at && new Date(b.beacon_expires_at) > new Date()
        ).length
      };

      setBeacons(processedBeacons);
      setTiers(tiersData || []);
      setStats(aggregateStats);
      setLoading(false);
    }

    fetchData();
  }, [user?.id]);

  // Format time remaining
  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  // Calculate CTR
  const getCtr = (clicks, views) => {
    if (!views || views === 0) return '0%';
    return `${((clicks / views) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8962C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase">Promoter Dashboard</h1>
            <p className="text-white/60 text-sm">Drop beacons on the globe</p>
          </div>
          <Button
            onClick={() => navigate('/biz/create-beacon')}
            className="bg-[#C8962C] hover:bg-[#C8962C]/80 font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Beacon
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={MapPin} 
            label="Active Beacons" 
            value={stats?.activeBeacons || 0}
            color="#C8962C"
          />
          <StatCard 
            icon={Eye} 
            label="Total Views" 
            value={stats?.totalViews || 0}
            color="#00D9FF"
          />
          <StatCard 
            icon={MousePointer} 
            label="Total Clicks" 
            value={stats?.totalClicks || 0}
            color="#39FF14"
          />
          <StatCard 
            icon={Users} 
            label="RSVPs" 
            value={stats?.totalRsvps || 0}
            color="#C8962C"
          />
        </div>

        {/* Active Beacons */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C8962C]" />
            Your Beacons
          </h2>

          {beacons.length === 0 ? (
            <div className="border border-white/10 p-8 text-center">
              <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No beacons yet</p>
              <Button
                onClick={() => navigate('/biz/create-beacon')}
                variant="outline"
              >
                Create Your First Beacon
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {beacons.map((beacon) => {
                const isActive = beacon.beacon_expires_at && 
                  new Date(beacon.beacon_expires_at) > new Date();
                const tierColor = TIER_COLORS[beacon.tier_id] || '#FFFFFF';

                return (
                  <motion.div
                    key={beacon.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      border p-4 transition-colors cursor-pointer
                      ${isActive 
                        ? 'border-white/20 hover:border-white/40' 
                        : 'border-white/10 bg-white/5 opacity-60'
                      }
                    `}
                    onClick={() => navigate(`/biz/beacon/${beacon.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-white">
                            {beacon.event_title || 'Untitled Event'}
                          </h3>
                          {isActive && (
                            <span 
                              className="px-2 py-0.5 text-[10px] uppercase font-bold"
                              style={{ 
                                backgroundColor: `${tierColor}20`,
                                color: tierColor 
                              }}
                            >
                              {getTimeRemaining(beacon.beacon_expires_at)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-white/50 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {beacon.venue_name || 'Location TBD'}
                          </span>
                          {beacon.event_start && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(beacon.event_start).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Mini stats */}
                        <div className="flex gap-4 text-xs">
                          <span className="text-white/60">
                            <Eye className="w-3 h-3 inline mr-1" />
                            {beacon.view_count || 0} views
                          </span>
                          <span className="text-white/60">
                            <MousePointer className="w-3 h-3 inline mr-1" />
                            {beacon.click_count || 0} clicks
                          </span>
                          <span className="text-white/60">
                            <Users className="w-3 h-3 inline mr-1" />
                            {beacon.rsvp_count || 0} RSVPs
                          </span>
                          <span className="text-[#39FF14]">
                            CTR: {getCtr(beacon.click_count, beacon.view_count)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-white/30" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tier Selection Preview */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C8962C]" />
            Beacon Tiers
          </h2>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="border border-white/10 p-4 hover:border-white/30 transition-colors"
                style={{ borderColor: `${TIER_COLORS[tier.id]}40` }}
              >
                <h4 
                  className="font-bold text-sm mb-1"
                  style={{ color: TIER_COLORS[tier.id] }}
                >
                  {tier.name}
                </h4>
                <p className="text-2xl font-black text-white mb-2">
                  £{(tier.price_cents / 100).toFixed(0)}
                </p>
                <p className="text-xs text-white/50">
                  {tier.duration_hours}hr • {tier.max_radius_km}km reach
                </p>
                {tier.features?.pulse && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-white/10 text-[10px] text-white/60">
                    Pulse animation
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// Stat card component
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="border border-white/10 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-8 h-8 flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-white/60 uppercase">{label}</span>
      </div>
      <p className="text-3xl font-black text-white">{value.toLocaleString()}</p>
    </div>
  );
}
