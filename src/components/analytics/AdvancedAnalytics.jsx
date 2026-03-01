import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, ShoppingBag, MapPin, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#C8962C', '#00D9FF', '#C8962C', '#FFEB3B', '#39FF14', '#FF6B35'];

export default function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  const { data: users = [] } = useQuery({
    queryKey: ['users-analytics'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-analytics'],
    queryFn: () => base44.entities.UserActivity.list()
  });

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons-analytics'],
    queryFn: () => base44.entities.Beacon.list()
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-analytics'],
    queryFn: () => base44.entities.Order.list()
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['posts-analytics'],
    queryFn: () => base44.entities.CommunityPost.list()
  });

  // User Growth Over Time
  const userGrowthData = users
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .reduce((acc, user) => {
      const date = new Date(user.created_date).toLocaleDateString();
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.users++;
      } else {
        acc.push({ date, users: 1 });
      }
      return acc;
    }, [])
    .slice(-30); // Last 30 days

  // Cumulative users
  let cumulative = 0;
  const cumulativeData = userGrowthData.map(d => {
    cumulative += d.users;
    return { ...d, total: cumulative };
  });

  // Activity by Type
  const activityByType = activities.reduce((acc, activity) => {
    const type = activity.activity_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const activityData = Object.entries(activityByType).map(([name, value]) => ({ name, value }));

  // Beacon Activity by City
  const beaconsByCity = beacons.reduce((acc, beacon) => {
    const city = beacon.city || 'Unknown';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});

  const cityData = Object.entries(beaconsByCity)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Engagement Metrics
  const totalCheckIns = activities.filter(a => a.activity_type === 'check_in').length;
  const totalScans = activities.filter(a => a.activity_type === 'scan').length;
  const totalMessages = activities.filter(a => a.activity_type === 'message').length;
  const activeUsers = users.filter(u => u.activity_status && u.activity_status !== 'offline').length;

  // Content Moderation Stats
  const pendingPosts = posts.filter(p => p.moderation_status === 'pending').length;
  const flaggedPosts = posts.filter(p => p.moderation_status === 'flagged').length;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#C8962C]/20 to-[#C8962C]/20 border-2 border-[#C8962C] p-6">
          <Users className="w-6 h-6 text-[#C8962C] mb-2" />
          <div className="text-3xl font-black">{users.length}</div>
          <div className="text-xs text-white/60 uppercase">Total Users</div>
        </div>
        <div className="bg-gradient-to-br from-[#00D9FF]/20 to-[#C8962C]/20 border-2 border-[#00D9FF] p-6">
          <Zap className="w-6 h-6 text-[#00D9FF] mb-2" />
          <div className="text-3xl font-black">{activeUsers}</div>
          <div className="text-xs text-white/60 uppercase">Active Users</div>
        </div>
        <div className="bg-gradient-to-br from-[#C8962C]/20 to-[#FF6B35]/20 border-2 border-[#C8962C] p-6">
          <MapPin className="w-6 h-6 text-[#C8962C] mb-2" />
          <div className="text-3xl font-black">{beacons.length}</div>
          <div className="text-xs text-white/60 uppercase">Beacons</div>
        </div>
        <div className="bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 border-2 border-[#39FF14] p-6">
          <ShoppingBag className="w-6 h-6 text-[#39FF14] mb-2" />
          <div className="text-3xl font-black">{orders.length}</div>
          <div className="text-xs text-white/60 uppercase">Orders</div>
        </div>
      </div>

      {/* User Growth Chart */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-black uppercase mb-4">User Growth</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fff2" />
            <XAxis dataKey="date" stroke="#fff6" />
            <YAxis stroke="#fff6" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #fff3' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#C8962C" strokeWidth={3} name="Total Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Types */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-black uppercase mb-4">Activity Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={activityData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {activityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #fff3' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>


      {/* Top Cities */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-black uppercase mb-4">Top Cities by Beacons</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={cityData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#fff2" />
            <XAxis type="number" stroke="#fff6" />
            <YAxis dataKey="name" type="category" stroke="#fff6" width={100} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #fff3' }}
            />
            <Bar dataKey="value" fill="#00D9FF" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-white/40 uppercase mb-2">Check-ins</div>
          <div className="text-3xl font-black">{totalCheckIns}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-white/40 uppercase mb-2">Scans</div>
          <div className="text-3xl font-black">{totalScans}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-white/40 uppercase mb-2">Messages</div>
          <div className="text-3xl font-black">{totalMessages}</div>
        </div>
      </div>

      {/* Moderation Alerts */}
      {(pendingPosts > 0 || flaggedPosts > 0) && (
        <div className="bg-red-600/20 border-2 border-red-600 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4">Moderation Alerts</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-white/60">Pending Posts</div>
              <div className="text-2xl font-black">{pendingPosts}</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Flagged Posts</div>
              <div className="text-2xl font-black">{flaggedPosts}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
