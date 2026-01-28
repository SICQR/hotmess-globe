import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Megaphone,
  BarChart3,
  CreditCard,
  TrendingUp,
  Eye,
  MapPin,
  ChevronRight,
  Plus,
  Star,
  Target,
  Users,
  Building2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../../utils';
import AdvertisingPlans from '@/components/advertising/AdvertisingPlans';
import SponsoredPlacements from '@/components/advertising/SponsoredPlacements';
import BannerManager from '@/components/advertising/BannerManager';
import { logger } from '@/utils/logger';

/**
 * BusinessAdvertising - Dashboard for venues/nightclubs to purchase
 * featured placements on the HotMess Globe, banner advertising,
 * and event sponsorships.
 */
export default function BusinessAdvertising() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Redirect to onboarding if not a business account
        if (!currentUser.is_business && !currentUser.is_organizer) {
          navigate(createPageUrl('BusinessOnboarding'));
          return;
        }
      } catch (error) {
        logger.error('Failed to fetch user', { error: error?.message, context: 'BusinessAdvertising' });
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch active sponsorships
  const { data: sponsorships = [] } = useQuery({
    queryKey: ['business-sponsorships', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsored_placements')
        .select('*')
        .eq('business_email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  // Fetch advertising analytics
  const { data: analytics = {} } = useQuery({
    queryKey: ['advertising-analytics', user?.email],
    queryFn: async () => {
      // Calculate totals from sponsorships
      const activePlacements = sponsorships.filter(s => 
        new Date(s.end_date) > new Date() && s.status === 'active'
      );
      
      const totalImpressions = sponsorships.reduce((sum, s) => sum + (s.impressions || 0), 0);
      const totalClicks = sponsorships.reduce((sum, s) => sum + (s.clicks || 0), 0);
      const totalSpend = sponsorships.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
      
      return {
        activePlacements: activePlacements.length,
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
        totalSpend,
        pendingPlacements: sponsorships.filter(s => s.status === 'pending').length,
      };
    },
    enabled: sponsorships.length > 0,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#E62020] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#E62020] to-[#B026FF] rounded-xl flex items-center justify-center">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                    Advertising
                  </h1>
                  <p className="text-white/60 text-sm">Get featured on the HotMess Globe</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to={createPageUrl('BusinessDashboard')}>
                <Button variant="outline" className="border-white/20 text-white">
                  <Building2 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Button 
                onClick={() => setActiveTab('plans')}
                className="bg-[#E62020] hover:bg-[#E62020]/90 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#39FF14]/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-white/60 text-sm">Active Placements</span>
                </div>
                <div className="text-3xl font-black">{analytics.activePlacements || 0}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#00D9FF]/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[#00D9FF]" />
                  </div>
                  <span className="text-white/60 text-sm">Impressions</span>
                </div>
                <div className="text-3xl font-black">{(analytics.totalImpressions || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#E62020]/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-[#E62020]" />
                  </div>
                  <span className="text-white/60 text-sm">Click Rate</span>
                </div>
                <div className="text-3xl font-black">{analytics.ctr || 0}%</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#FFEB3B]/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#FFEB3B]" />
                  </div>
                  <span className="text-white/60 text-sm">Total Spend</span>
                </div>
                <div className="text-3xl font-black">£{((analytics.totalSpend || 0) / 100).toLocaleString()}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="placements">Globe Placements</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="plans">
              <Sparkles className="w-4 h-4 mr-1" />
              Plans & Pricing
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-lg uppercase tracking-wider">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#E62020]/20 to-[#B026FF]/20 border border-[#E62020]/30 rounded-lg hover:border-[#E62020]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-[#E62020]" />
                      <div className="text-left">
                        <div className="font-bold">Featured on Globe</div>
                        <div className="text-xs text-white/60">Get a permanent pin on the map</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </button>

                  <button
                    onClick={() => setActiveTab('banners')}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-5 h-5 text-[#00D9FF]" />
                      <div className="text-left">
                        <div className="font-bold">Banner Ads</div>
                        <div className="text-xs text-white/60">Display banners across the app</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </button>

                  <button
                    onClick={() => setActiveTab('placements')}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-[#FFEB3B]" />
                      <div className="text-left">
                        <div className="font-bold">Sponsor Events</div>
                        <div className="text-xs text-white/60">Partner with event organizers</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </button>
                </CardContent>
              </Card>

              {/* Active Campaigns */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg uppercase tracking-wider">Active Campaigns</CardTitle>
                  <Badge className="bg-[#39FF14]/20 text-[#39FF14]">
                    {sponsorships.filter(s => s.status === 'active').length} Active
                  </Badge>
                </CardHeader>
                <CardContent>
                  {sponsorships.filter(s => s.status === 'active').length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No active campaigns</p>
                      <Button
                        onClick={() => setActiveTab('plans')}
                        variant="outline"
                        className="border-[#E62020] text-[#E62020]"
                      >
                        Create Your First Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sponsorships
                        .filter(s => s.status === 'active')
                        .slice(0, 3)
                        .map((campaign) => (
                          <div
                            key={campaign.id}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                campaign.placement_type === 'globe_pin' ? 'bg-[#E62020]' :
                                campaign.placement_type === 'banner' ? 'bg-[#00D9FF]' :
                                'bg-[#FFEB3B]'
                              }`} />
                              <div>
                                <div className="font-semibold text-sm">{campaign.name || campaign.placement_type}</div>
                                <div className="text-xs text-white/60">
                                  {campaign.impressions?.toLocaleString() || 0} impressions
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-white/40">
                              {new Date(campaign.end_date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Why Advertise Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <Card className="bg-gradient-to-br from-[#E62020]/10 to-[#B026FF]/10 border-[#E62020]/30">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-black uppercase mb-6">Why Advertise on HotMess?</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#E62020]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-[#E62020]" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">Targeted Audience</h4>
                        <p className="text-sm text-white/60">
                          Reach thousands of active nightlife enthusiasts in your area
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#00D9FF]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-[#00D9FF]" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">Location-Based</h4>
                        <p className="text-sm text-white/60">
                          Your venue appears on the Globe to users nearby
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[#39FF14]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-[#39FF14]" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">Real-Time Analytics</h4>
                        <p className="text-sm text-white/60">
                          Track impressions, clicks, and conversions in real-time
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Globe Placements Tab */}
          <TabsContent value="placements">
            <SponsoredPlacements 
              businessEmail={user?.email} 
              sponsorships={sponsorships.filter(s => s.placement_type === 'globe_pin')}
            />
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners">
            <BannerManager 
              businessEmail={user?.email}
              banners={sponsorships.filter(s => s.placement_type === 'banner')}
            />
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <AdvertisingPlans 
              businessEmail={user?.email}
              businessName={user?.business_name}
              onPurchase={() => {
                queryClient.invalidateQueries(['business-sponsorships']);
                setActiveTab('placements');
              }}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg uppercase tracking-wider">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {sponsorships.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 mb-4">No campaigns to analyze yet</p>
                    <Button
                      onClick={() => setActiveTab('plans')}
                      className="bg-[#E62020] hover:bg-[#E62020]/90 text-black"
                    >
                      Start Your First Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Performance Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-black/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#00D9FF]">
                          {(analytics.totalImpressions || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-white/40 uppercase">Total Impressions</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#39FF14]">
                          {(analytics.totalClicks || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-white/40 uppercase">Total Clicks</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#E62020]">
                          {analytics.ctr || 0}%
                        </div>
                        <div className="text-xs text-white/40 uppercase">Click-Through Rate</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#FFEB3B]">
                          £{((analytics.totalSpend || 0) / 100).toFixed(0)}
                        </div>
                        <div className="text-xs text-white/40 uppercase">Total Investment</div>
                      </div>
                    </div>

                    {/* Campaign List */}
                    <div className="space-y-3">
                      <h4 className="text-sm uppercase tracking-wider text-white/40">All Campaigns</h4>
                      {sponsorships.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${
                              campaign.status === 'active' ? 'bg-[#39FF14]' :
                              campaign.status === 'pending' ? 'bg-[#FFEB3B]' :
                              'bg-white/30'
                            }`} />
                            <div>
                              <div className="font-semibold">{campaign.name || `${campaign.placement_type} Campaign`}</div>
                              <div className="text-xs text-white/60">
                                {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <div className="font-bold">{(campaign.impressions || 0).toLocaleString()}</div>
                              <div className="text-xs text-white/40">Views</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold">{(campaign.clicks || 0).toLocaleString()}</div>
                              <div className="text-xs text-white/40">Clicks</div>
                            </div>
                            <Badge className={
                              campaign.status === 'active' ? 'bg-[#39FF14]/20 text-[#39FF14]' :
                              campaign.status === 'pending' ? 'bg-[#FFEB3B]/20 text-[#FFEB3B]' :
                              'bg-white/10 text-white/60'
                            }>
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
