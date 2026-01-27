import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle,
  Clock,
  MapPin,
  Sparkles,
  ChevronDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';

const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

const StatCard = ({ icon: Icon, label, value, subValue, trend, color = 'white' }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
    <div className="flex items-start justify-between">
      <div>
        <Icon className={`w-5 h-5 mb-2 text-${color === 'white' ? 'white/60' : `[${color}]`}`} />
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs text-white/40 uppercase mt-1">{label}</div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    {subValue && (
      <div className="text-xs text-white/40 mt-2">{subValue}</div>
    )}
  </div>
);

const SimpleBarChart = ({ data, maxValue, color = '#39FF14', label }) => (
  <div className="space-y-2">
    {data.map((item, idx) => (
      <div key={idx} className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-white/60 truncate max-w-[60%]">{item.label}</span>
          <span className="text-white font-medium">{item.value}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(item.value / maxValue) * 100}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

const TimelineChart = ({ data, color = '#00D9FF' }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const height = 120;

  return (
    <div className="relative h-[120px] w-full">
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={`
            M 0 ${height}
            ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = height - (d.value / maxValue) * height;
              return `L ${x}% ${y}`;
            }).join(' ')}
            L 100% ${height}
            Z
          `}
          fill="url(#chartGradient)"
        />
        
        {/* Line */}
        <path
          d={`
            M 0 ${height - (data[0]?.value / maxValue) * height}
            ${data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = height - (d.value / maxValue) * height;
              return `L ${x}% ${y}`;
            }).join(' ')}
          `}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-white/40 -mb-5">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
};

export default function OrganizerAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [eventFilter, setEventFilter] = useState('all');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Calculate date bounds
  const dateBounds = useMemo(() => {
    if (dateRange === 'all') {
      return { start: new Date(2020, 0, 1), end: new Date() };
    }
    const days = parseInt(dateRange) || 30;
    return {
      start: startOfDay(subDays(new Date(), days)),
      end: endOfDay(new Date()),
    };
  }, [dateRange]);

  // Fetch all events
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['organizer-events', currentUser?.email, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('Beacon')
        .select('*')
        .or(`organizer_email.eq.${currentUser.email},created_by.eq.${currentUser.email}`)
        .order('created_at', { ascending: false });

      if (dateRange !== 'all') {
        query = query.gte('created_at', dateBounds.start.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.email,
  });

  // Fetch RSVPs
  const eventIds = events.map(e => e.id);
  const { data: rsvps = [] } = useQuery({
    queryKey: ['organizer-rsvps', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from('EventRSVP')
        .select('*')
        .in('beacon_id', eventIds);
      if (error) throw error;
      return data || [];
    },
    enabled: eventIds.length > 0,
  });

  // Fetch check-ins
  const { data: checkIns = [] } = useQuery({
    queryKey: ['organizer-checkins', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from('beacon_checkins')
        .select('*')
        .in('beacon_id', eventIds);
      if (error) throw error;
      return data || [];
    },
    enabled: eventIds.length > 0,
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalViews = events.reduce((sum, e) => sum + (e.view_count || 0), 0);
    const totalRSVPs = rsvps.length;
    const totalCheckIns = checkIns.length;
    const uniqueAttendees = new Set(checkIns.map(c => c.user_email)).size;
    const conversionRate = totalViews > 0 ? ((totalRSVPs / totalViews) * 100) : 0;
    const attendanceRate = totalRSVPs > 0 ? ((totalCheckIns / totalRSVPs) * 100) : 0;

    // Group by date for timeline
    const days = eachDayOfInterval({ start: dateBounds.start, end: dateBounds.end });
    const rsvpsByDay = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = rsvps.filter(r => format(parseISO(r.created_at), 'yyyy-MM-dd') === dayStr).length;
      return { label: format(day, 'MMM d'), value: count };
    });

    const checkInsByDay = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = checkIns.filter(c => format(parseISO(c.created_at), 'yyyy-MM-dd') === dayStr).length;
      return { label: format(day, 'MMM d'), value: count };
    });

    // Category breakdown
    const categoryMap = {};
    events.forEach(e => {
      const cat = e.category || e.event_type || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categories = Object.entries(categoryMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Top events by RSVPs
    const rsvpCountByEvent = {};
    rsvps.forEach(r => {
      rsvpCountByEvent[r.beacon_id] = (rsvpCountByEvent[r.beacon_id] || 0) + 1;
    });
    const topEvents = events
      .map(e => ({
        ...e,
        rsvpCount: rsvpCountByEvent[e.id] || 0,
      }))
      .sort((a, b) => b.rsvpCount - a.rsvpCount)
      .slice(0, 5);

    // Venue stats
    const venueMap = {};
    events.forEach(e => {
      const venue = e.venue_name || e.venue || 'Unknown';
      if (!venueMap[venue]) {
        venueMap[venue] = { events: 0, rsvps: 0 };
      }
      venueMap[venue].events++;
      venueMap[venue].rsvps += rsvpCountByEvent[e.id] || 0;
    });
    const topVenues = Object.entries(venueMap)
      .map(([name, stats]) => ({ label: name, value: stats.rsvps }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Hourly distribution (based on check-in times)
    const hourlyMap = Array(24).fill(0);
    checkIns.forEach(c => {
      const hour = new Date(c.created_at).getHours();
      hourlyMap[hour]++;
    });
    const peakHour = hourlyMap.indexOf(Math.max(...hourlyMap));

    return {
      totalEvents: events.length,
      upcomingEvents: events.filter(e => new Date(e.start_date || e.event_date) > new Date()).length,
      pastEvents: events.filter(e => new Date(e.start_date || e.event_date) <= new Date()).length,
      totalViews,
      totalRSVPs,
      totalCheckIns,
      uniqueAttendees,
      conversionRate: conversionRate.toFixed(1),
      attendanceRate: attendanceRate.toFixed(1),
      avgRSVPsPerEvent: events.length > 0 ? Math.round(totalRSVPs / events.length) : 0,
      rsvpsByDay,
      checkInsByDay,
      categories,
      topEvents,
      topVenues,
      peakHour,
    };
  }, [events, rsvps, checkIns, dateBounds]);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Events', analytics.totalEvents],
      ['Upcoming Events', analytics.upcomingEvents],
      ['Past Events', analytics.pastEvents],
      ['Total Views', analytics.totalViews],
      ['Total RSVPs', analytics.totalRSVPs],
      ['Total Check-ins', analytics.totalCheckIns],
      ['Unique Attendees', analytics.uniqueAttendees],
      ['Conversion Rate', `${analytics.conversionRate}%`],
      ['Attendance Rate', `${analytics.attendanceRate}%`],
      ['Avg RSVPs/Event', analytics.avgRSVPsPerEvent],
      ['Peak Hour', `${analytics.peakHour}:00`],
      [''],
      ['Top Events'],
      ...analytics.topEvents.map(e => [e.title, e.rsvpCount]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organizer-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = eventsLoading;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black">Analytics Dashboard</h1>
                <p className="text-xs text-white/40">Organizer Performance Insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px] bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchEvents()}
                className="border-white/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={exportCSV}
                className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-[#39FF14] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <StatCard
                icon={Calendar}
                label="Total Events"
                value={analytics.totalEvents}
                subValue={`${analytics.upcomingEvents} upcoming`}
                color="#00D9FF"
              />
              <StatCard
                icon={Eye}
                label="Total Views"
                value={analytics.totalViews.toLocaleString()}
                color="#FFD700"
              />
              <StatCard
                icon={Users}
                label="Total RSVPs"
                value={analytics.totalRSVPs.toLocaleString()}
                subValue={`${analytics.avgRSVPsPerEvent} avg/event`}
                color="#E62020"
              />
              <StatCard
                icon={CheckCircle}
                label="Check-ins"
                value={analytics.totalCheckIns.toLocaleString()}
                subValue={`${analytics.uniqueAttendees} unique`}
                color="#39FF14"
              />
              <StatCard
                icon={TrendingUp}
                label="Conversion"
                value={`${analytics.conversionRate}%`}
                subValue={`${analytics.attendanceRate}% attendance`}
                color="#B026FF"
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* RSVPs Over Time */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  RSVPs Over Time
                </h3>
                <TimelineChart data={analytics.rsvpsByDay} color="#E62020" />
              </div>

              {/* Check-ins Over Time */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Check-ins Over Time
                </h3>
                <TimelineChart data={analytics.checkInsByDay} color="#39FF14" />
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Top Events */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Top Events
                </h3>
                {analytics.topEvents.length > 0 ? (
                  <SimpleBarChart
                    data={analytics.topEvents.map(e => ({
                      label: e.title,
                      value: e.rsvpCount,
                    }))}
                    maxValue={Math.max(...analytics.topEvents.map(e => e.rsvpCount), 1)}
                    color="#00D9FF"
                  />
                ) : (
                  <p className="text-white/40 text-sm">No events yet</p>
                )}
              </div>

              {/* Top Venues */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Top Venues
                </h3>
                {analytics.topVenues.length > 0 ? (
                  <SimpleBarChart
                    data={analytics.topVenues}
                    maxValue={Math.max(...analytics.topVenues.map(v => v.value), 1)}
                    color="#FFD700"
                  />
                ) : (
                  <p className="text-white/40 text-sm">No venue data</p>
                )}
              </div>

              {/* Event Categories */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Categories
                </h3>
                {analytics.categories.length > 0 ? (
                  <SimpleBarChart
                    data={analytics.categories.slice(0, 5)}
                    maxValue={Math.max(...analytics.categories.map(c => c.value), 1)}
                    color="#B026FF"
                  />
                ) : (
                  <p className="text-white/40 text-sm">No category data</p>
                )}
              </div>
            </div>

            {/* Peak Activity */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity Insights
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#00D9FF]">
                    {analytics.peakHour}:00
                  </div>
                  <div className="text-xs text-white/40 uppercase mt-1">Peak Hour</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#39FF14]">
                    {analytics.attendanceRate}%
                  </div>
                  <div className="text-xs text-white/40 uppercase mt-1">Show Rate</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#FFD700]">
                    {analytics.avgRSVPsPerEvent}
                  </div>
                  <div className="text-xs text-white/40 uppercase mt-1">Avg RSVPs</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-black text-[#E62020]">
                    {analytics.uniqueAttendees}
                  </div>
                  <div className="text-xs text-white/40 uppercase mt-1">Unique Fans</div>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-wider text-white/40">All Events</h3>
                <span className="text-xs text-white/40">{events.length} events</span>
              </div>
              <div className="divide-y divide-white/5">
                {events.slice(0, 10).map(event => {
                  const rsvpCount = rsvps.filter(r => r.beacon_id === event.id).length;
                  const checkInCount = checkIns.filter(c => c.beacon_id === event.id).length;
                  const isPast = new Date(event.start_date || event.event_date) <= new Date();

                  return (
                    <Link
                      key={event.id}
                      to={`/beacons/${event.id}`}
                      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{event.title}</h4>
                          {!isPast && (
                            <span className="px-2 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] text-xs rounded-full">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">
                          {event.venue_name || event.venue || 'No venue'} • {format(new Date(event.start_date || event.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold">{event.view_count || 0}</div>
                          <div className="text-xs text-white/40">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-[#E62020]">{rsvpCount}</div>
                          <div className="text-xs text-white/40">RSVPs</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-[#39FF14]">{checkInCount}</div>
                          <div className="text-xs text-white/40">Check-ins</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {events.length > 10 && (
                <div className="p-4 border-t border-white/10 text-center">
                  <Button variant="ghost" className="text-white/60 hover:text-white">
                    View All Events
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
