import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MapPin, ShoppingBag, Trophy, Zap, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

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

  // XP over time
  const xpOverTime = activities
    .filter(a => a.xp_earned)
    .slice(-30)
    .map(a => ({
      date: new Date(a.created_date).toLocaleDateString(),
      xp: a.xp_earned,
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

  const COLORS = ['#FF1493', '#B026FF', '#00D9FF', '#FFEB3B', '#39FF14'];

  const stats = [
    { label: 'Total XP', value: currentUser?.xp || 0, icon: Zap, color: '#FFEB3B' },
    { label: 'Check-ins', value: checkIns.length, icon: MapPin, color: '#00D9FF' },
    { label: 'Purchases', value: purchases.length, icon: ShoppingBag, color: '#FF1493' },
    { label: 'Achievements', value: achievements.length, icon: Trophy, color: '#FFEB3B' },
    { label: 'Profile Views', value: profileViews.length, icon: Eye, color: '#B026FF' },
    { label: 'Activities', value: activities.length, icon: TrendingUp, color: '#39FF14' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            YOUR <span className="text-[#00D9FF]">STATS</span>
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Performance analytics. Track your journey.
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {stats.map((stat, idx) => (
            <AnimatedCard
              key={stat.label}
              delay={idx * 0.05}
              hover={true}
              className="bg-white/5 border border-white/10 p-4 text-center"
            >
              <motion.div
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -5, 5, 0],
                  transition: { duration: 0.3 }
                }}
              >
                <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
              </motion.div>
              <div className="text-2xl font-black mb-1" style={{ color: stat.color }}>
                {stat.value.toLocaleString()}
              </div>
              <div className="text-xs text-white/60 uppercase">{stat.label}</div>
            </AnimatedCard>
          ))}
        </div>

        <Tabs defaultValue="overview" className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="venues">Venues</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* XP Over Time */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-black uppercase mb-4">XP Growth</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={xpOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fff1" />
                    <XAxis dataKey="date" stroke="#fff4" style={{ fontSize: 10 }} />
                    <YAxis stroke="#fff4" style={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #FF1493' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="xp" stroke="#FFEB3B" strokeWidth={2} />
                  </LineChart>
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
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #FF1493' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="venues">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-black uppercase mb-4">Top Venues</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topVenues}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fff1" />
                  <XAxis dataKey="venue" stroke="#fff4" style={{ fontSize: 10 }} />
                  <YAxis stroke="#fff4" style={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #FF1493' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#00D9FF" />
                </BarChart>
              </ResponsiveContainer>
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
                    {activity.xp_earned && (
                      <div className="text-[#FFEB3B] font-black">+{activity.xp_earned} XP</div>
                    )}
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