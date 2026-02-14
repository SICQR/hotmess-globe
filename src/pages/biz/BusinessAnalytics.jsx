import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  Users,
  Eye,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../../utils';
import logger from '@/utils/logger';

export default function BusinessAnalytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Calculate date range
        const days = parseInt(dateRange) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch events
        const { data: events } = await supabase
          .from('Beacon')
          .select('*')
          .eq('created_by', currentUser.email)
          .gte('created_at', startDate.toISOString());

        // Fetch RSVPs
        const eventIds = events?.map(e => e.id) || [];
        const { data: rsvps } = await supabase
          .from('EventRSVP')
          .select('*')
          .in('beacon_id', eventIds);

        // Calculate analytics
        const totalViews = events?.reduce((sum, e) => sum + (e.view_count || 0), 0) || 0;
        const totalRSVPs = rsvps?.length || 0;
        const conversionRate = totalViews > 0 ? ((totalRSVPs / totalViews) * 100).toFixed(1) : 0;

        // Group RSVPs by day for chart
        const rsvpsByDay = {};
        rsvps?.forEach(rsvp => {
          const day = new Date(rsvp.created_at).toLocaleDateString();
          rsvpsByDay[day] = (rsvpsByDay[day] || 0) + 1;
        });

        setAnalytics({
          totalEvents: events?.length || 0,
          totalViews,
          totalRSVPs,
          conversionRate,
          avgRSVPsPerEvent: events?.length ? Math.round(totalRSVPs / events.length) : 0,
          rsvpsByDay: Object.entries(rsvpsByDay).map(([date, count]) => ({ date, count })),
          topEvents: events?.sort((a, b) => (b.rsvp_count || 0) - (a.rsvp_count || 0)).slice(0, 5) || [],
        });
      } catch (error) {
        logger.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Events', analytics.totalEvents],
      ['Total Views', analytics.totalViews],
      ['Total RSVPs', analytics.totalRSVPs],
      ['Conversion Rate', `${analytics.conversionRate}%`],
      ['Avg RSVPs per Event', analytics.avgRSVPsPerEvent],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotmess-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#FF1493] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('BusinessDashboard')} 
            className="inline-flex items-center text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">Analytics</h1>
              <p className="text-white/60">Track your event performance</p>
            </div>

            <div className="flex gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="365d">Last year</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={exportData}
                variant="outline"
                className="border-white/20 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[#FF1493]" />
              <span className="text-xs text-white/60">Events</span>
            </div>
            <div className="text-2xl font-black">{analytics?.totalEvents || 0}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-xs text-white/60">Views</span>
            </div>
            <div className="text-2xl font-black">{analytics?.totalViews || 0}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#39FF14]" />
              <span className="text-xs text-white/60">RSVPs</span>
            </div>
            <div className="text-2xl font-black">{analytics?.totalRSVPs || 0}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#B026FF]" />
              <span className="text-xs text-white/60">Conversion</span>
            </div>
            <div className="text-2xl font-black">{analytics?.conversionRate || 0}%</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-white/60">Avg RSVPs</span>
            </div>
            <div className="text-2xl font-black">{analytics?.avgRSVPsPerEvent || 0}</div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* RSVPs Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h3 className="font-bold uppercase tracking-wider mb-4">RSVPs Over Time</h3>
            <div className="h-48 flex items-end gap-1">
              {analytics?.rsvpsByDay?.length > 0 ? (
                analytics.rsvpsByDay.slice(-14).map((day, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#FF1493] rounded-t"
                    style={{
                      height: `${Math.max(10, (day.count / Math.max(...analytics.rsvpsByDay.map(d => d.count))) * 100)}%`
                    }}
                    title={`${day.date}: ${day.count} RSVPs`}
                  />
                ))
              ) : (
                <div className="w-full text-center text-white/40">No data available</div>
              )}
            </div>
          </motion.div>

          {/* Top Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <h3 className="font-bold uppercase tracking-wider mb-4">Top Events</h3>
            <div className="space-y-3">
              {analytics?.topEvents?.length > 0 ? (
                analytics.topEvents.map((event, idx) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white/40 w-6">{idx + 1}</span>
                    <div className="flex-1">
                      <div className="font-semibold truncate">{event.title}</div>
                      <div className="text-xs text-white/60">{event.rsvp_count || 0} RSVPs</div>
                    </div>
                    <div className="h-2 w-20 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#39FF14]"
                        style={{
                          width: `${((event.rsvp_count || 0) / Math.max(...analytics.topEvents.map(e => e.rsvp_count || 0))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-white/40 py-8">No events yet</div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
