import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  TrendingUp,
  Settings,
  Plus,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../../utils';
import logger from '@/utils/logger';

export default function BusinessDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check if user has business account
        if (!currentUser.is_business && !currentUser.is_organizer) {
          navigate(createPageUrl('BusinessOnboarding'));
          return;
        }

        // Fetch business stats
        const { data: events } = await supabase
          .from('Beacon')
          .select('*')
          .eq('created_by', currentUser.email);

        const { data: rsvps } = await supabase
          .from('EventRSVP')
          .select('*')
          .in('beacon_id', events?.map(e => e.id) || []);

        // Calculate stats
        const totalEvents = events?.length || 0;
        const totalRSVPs = rsvps?.length || 0;
        const upcomingEvents = events?.filter(e => 
          new Date(e.start_time) > new Date()
        ).length || 0;

        setStats({
          totalEvents,
          totalRSVPs,
          upcomingEvents,
          avgAttendance: totalEvents > 0 ? Math.round(totalRSVPs / totalEvents) : 0,
          revenue: 0, // Would come from marketplace orders
          views: 0, // Would come from analytics
        });

        setRecentEvents(events?.slice(0, 5) || []);
      } catch (error) {
        logger.error('Failed to fetch dashboard data', { error: error?.message, context: 'BusinessDashboard' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#FF1493] rounded-full animate-spin" />
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
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              Business Dashboard
            </h1>
            <p className="text-white/60">Welcome back, {user?.full_name}</p>
          </div>

          <div className="flex gap-3">
            <Link to={createPageUrl('CreateBeacon')}>
              <Button className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
            <Link to={createPageUrl('BusinessSettings')}>
              <Button variant="outline" className="border-white/20 text-white">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#FF1493]/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-[#FF1493]" />
                  </div>
                  <span className="text-white/60 text-sm">Total Events</span>
                </div>
                <div className="text-3xl font-black">{stats?.totalEvents || 0}</div>
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
                    <Users className="w-5 h-5 text-[#00D9FF]" />
                  </div>
                  <span className="text-white/60 text-sm">Total RSVPs</span>
                </div>
                <div className="text-3xl font-black">{stats?.totalRSVPs || 0}</div>
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
                  <div className="w-10 h-10 bg-[#39FF14]/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#39FF14]" />
                  </div>
                  <span className="text-white/60 text-sm">Upcoming</span>
                </div>
                <div className="text-3xl font-black">{stats?.upcomingEvents || 0}</div>
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
                  <div className="w-10 h-10 bg-[#B026FF]/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#B026FF]" />
                  </div>
                  <span className="text-white/60 text-sm">Avg Attendance</span>
                </div>
                <div className="text-3xl font-black">{stats?.avgAttendance || 0}</div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-1"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg uppercase tracking-wider">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl('CreateBeacon')}>
                  <div className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <Plus className="w-5 h-5 text-[#FF1493]" />
                      <span>Create Event</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                </Link>

                <Link to={createPageUrl('BusinessVenue')}>
                  <div className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-[#00D9FF]" />
                      <span>Manage Venues</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                </Link>

                <Link to={createPageUrl('BusinessAnalytics')}>
                  <div className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-[#39FF14]" />
                      <span>View Analytics</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                </Link>

                <Link to={createPageUrl('BusinessBilling')}>
                  <div className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-[#B026FF]" />
                      <span>Billing & Payouts</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="md:col-span-2"
          >
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg uppercase tracking-wider">Recent Events</CardTitle>
                <Link to={createPageUrl('Beacons')} className="text-sm text-[#FF1493] hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent>
                {recentEvents.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events yet</p>
                    <Link to={createPageUrl('CreateBeacon')}>
                      <Button className="mt-4 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
                        Create Your First Event
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <Link 
                        key={event.id}
                        to={`${createPageUrl('BeaconDetail')}?id=${event.id}`}
                      >
                        <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] rounded-lg flex items-center justify-center">
                              {event.image_url ? (
                                <img src={event.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Calendar className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold">{event.title}</div>
                              <div className="text-sm text-white/60">
                                {event.city} • {new Date(event.start_time).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{event.rsvp_count || 0} RSVPs</div>
                            <div className="text-xs text-white/40">
                              {new Date(event.start_time) > new Date() ? 'Upcoming' : 'Past'}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card className="bg-[#00D9FF]/10 border-[#00D9FF]/40">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#00D9FF]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-[#00D9FF]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#00D9FF] mb-2">Pro Tips</h3>
                  <ul className="text-sm text-white/80 space-y-2">
                    <li>• Add high-quality images to your events to increase engagement by 3x</li>
                    <li>• Events with detailed descriptions get 40% more RSVPs</li>
                    <li>• Post events at least 2 weeks in advance for best results</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
