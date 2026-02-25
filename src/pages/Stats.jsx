import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { TrendingUp, MapPin, ShoppingBag, Trophy, Eye, Download, Share2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Stats() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: checkIns = [] } = useQuery({
    queryKey: ['my-checkins', currentUser?.email],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['my-purchases', currentUser?.email],
    queryFn: () => base44.entities.Order.filter({ buyer_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['my-achievements', currentUser?.email],
    queryFn: () => base44.entities.UserAchievement.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: profileViews = [] } = useQuery({
    queryKey: ['profile-views', currentUser?.email],
    queryFn: () => base44.entities.ProfileView.filter({ viewed_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['my-activities', currentUser?.email],
    queryFn: () => base44.entities.ActivityFeed.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  // Activity over time
  const activityOverTime = activities
    .slice(-30)
    .map(a => ({
      date: new Date(a.created_date).toLocaleDateString(),
      count: 1,
    }));

  // Check-ins by venue
  const venueCheckIns = checkIns.reduce((acc, ci) => {
    acc[ci.beacon_title] = (acc[ci.beacon_title] || 0) + 1;
    return acc;
  }, {});
  const topVenues = Object.entries(venueCheckIns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([venue, count]) => ({ venue, count }));

  // Activity types
  const activityTypes = activities.reduce((acc, a) => {
    acc[a.activity_type] = (acc[a.activity_type] || 0) + 1;
    return acc;
  }, {});
  const activityData = Object.entries(activityTypes).map(([type, count]) => ({
    name: type.replace('_', ' '),
    value: count,
  }));

  const COLORS = ['#C8962C', '#B026FF', '#00D9FF', '#FFEB3B', '#39FF14'];

  // Profile engagement radar
  const engagementData = [
    { subject: 'Views', A: profileViews.length, fullMark: 100 },
    { subject: 'Check-ins', A: checkIns.length, fullMark: 50 },
    { subject: 'Purchases', A: purchases.length * 5, fullMark: 50 },
    { subject: 'Achievements', A: achievements.length * 10, fullMark: 100 },
    { subject: 'Activities', A: Math.min(activities.length, 100), fullMark: 100 },
  ];

  // Daily activity heatmap (last 7 days)
  const dailyActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayActivities = activities.filter(a => {
      const actDate = new Date(a.created_date);
      return actDate.toDateString() === date.toDateString();
    });
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: dayActivities.length,
      xp: dayActivities.reduce((sum, a) => sum + (a.xp_earned || 0), 0),
    };
  });

  const handleExport = () => {
    const data = {
      checkIns: checkIns.length,
      purchases: purchases.length,
      achievements: achievements.length,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotmess-stats.json';
    a.click();
    toast.success('Stats exported!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My HOTMESS Stats',
        text: `I have ${achievements.length} achievements on HOTMESS!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`Check out my HOTMESS stats: ${achievements.length} achievements!`);
      toast.success('Copied to clipboard!');
    }
  };

  const stats = [
    { label: 'Check-ins', value: checkIns.length, icon: MapPin, color: '#00D9FF' },
    { label: 'Purchases', value: purchases.length, icon: ShoppingBag, color: '#C8962C' },
    { label: 'Achievements', value: achievements.length, icon: Trophy, color: '#C8962C' },
    { label: 'Profile Views', value: profileViews.length, icon: Eye, color: '#B026FF' },
    { label: 'Activities', value: activities.length, icon: TrendingUp, color: '#39FF14' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
              YOUR <span className="text-[#00D9FF]">STATS</span>
            </h1>
            <p className="text-white/60 uppercase text-sm tracking-wider">
              Performance analytics. Track your journey.
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm" onClick={handleExport} className="border-white/20">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="border-white/20">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </div>
        </motion.div>

        {/* Weekly Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[#C8962C]/20 to-[#B026FF]/20 border border-[#C8962C]/30 rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-white/60 uppercase text-sm mb-1">This Week</h3>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-[#C8962C]">{dailyActivity.reduce((sum, d) => sum + d.count, 0)} Activities</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-black text-[#00D9FF]">{dailyActivity.reduce((sum, d) => sum + d.count, 0)}</div>
                <div className="text-xs text-white/40">Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-[#C8962C]">{checkIns.filter(c => new Date(c.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</div>
                <div className="text-xs text-white/40">Check-ins</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 p-4 text-center"
            >
              <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
              <div className="text-2xl font-black mb-1" style={{ color: stat.color }}>
                {stat.value.toLocaleString()}
              </div>
              <div className="text-xs text-white/60 uppercase">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="venues">Venues</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Over Time */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Activity</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={activityOverTime}>
                    <defs>
                      <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C8962C" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#C8962C" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fff1" />
                    <XAxis dataKey="date" stroke="#fff4" style={{ fontSize: 10 }} />
                    <YAxis stroke="#fff4" style={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #C8962C' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#C8962C" fill="url(#activityGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Activity Distribution */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Activity Types</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={activityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #C8962C' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Activity */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Last 7 Days</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fff1" />
                    <XAxis dataKey="day" stroke="#fff4" style={{ fontSize: 10 }} />
                    <YAxis stroke="#fff4" style={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #C8962C' }}
                    />
                    <Bar dataKey="count" fill="#00D9FF" name="Activities" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Milestones */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Next Milestones</h3>
                <div className="space-y-4">
                  {[
                    { label: '10 Check-ins', target: 10, current: checkIns.length, icon: MapPin, color: '#00D9FF' },
                    { label: '5 Achievements', target: 5, current: achievements.length, icon: Trophy, color: '#C8962C' },
                    { label: '100 Profile Views', target: 100, current: profileViews.length, icon: Eye, color: '#B026FF' },
                  ].map((milestone) => {
                    const current = milestone.current ?? 0;
                    const progress = Math.min((current / milestone.target) * 100, 100);
                    return (
                      <div key={milestone.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <milestone.icon className="w-4 h-4" style={{ color: milestone.color }} />
                            {milestone.label}
                          </span>
                          <span className="text-white/60">{current}/{milestone.target}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: milestone.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="venues">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Top Venues</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topVenues} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#fff1" />
                    <XAxis type="number" stroke="#fff4" style={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="venue" stroke="#fff4" style={{ fontSize: 10 }} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #C8962C' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#00D9FF" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Recent Check-ins</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {checkIns.slice(0, 10).map((ci, idx) => (
                    <div key={ci.id || idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                      <MapPin className="w-5 h-5 text-[#00D9FF]" />
                      <div className="flex-1">
                        <p className="font-bold text-sm">{ci.beacon_title || 'Unknown Venue'}</p>
                        <p className="text-xs text-white/40">{new Date(ci.created_date).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="engagement">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Radar */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Engagement Profile</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={engagementData}>
                    <PolarGrid stroke="#fff2" />
                    <PolarAngleAxis dataKey="subject" stroke="#fff6" style={{ fontSize: 11 }} />
                    <Radar name="You" dataKey="A" stroke="#C8962C" fill="#C8962C" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #C8962C' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Profile Views Over Time */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">Who's Viewing You</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#B026FF]/20 to-transparent rounded-lg">
                    <div>
                      <p className="text-3xl font-black text-[#B026FF]">{profileViews.length}</p>
                      <p className="text-xs text-white/40">Total Profile Views</p>
                    </div>
                    <Eye className="w-10 h-10 text-[#B026FF]/50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-lg text-center">
                      <p className="text-xl font-black text-[#00D9FF]">
                        {profileViews.filter(v => new Date(v.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                      </p>
                      <p className="text-xs text-white/40">This Week</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg text-center">
                      <p className="text-xl font-black text-[#C8962C]">
                        {profileViews.filter(v => new Date(v.created_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                      </p>
                      <p className="text-xs text-white/40">This Month</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-3">
              {activities.slice(0, 20).map((activity, idx) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-white/5 border border-white/10 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm uppercase">{activity.activity_type.replace('_', ' ')}</p>
                      <p className="text-xs text-white/40">
                        {new Date(activity.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}