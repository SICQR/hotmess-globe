import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { TrendingUp, Users, ShoppingBag, Zap, MapPin, MessageCircle, Crown, UserMinus, DollarSign } from 'lucide-react';

export default function AnalyticsDashboard() {
  const { data: users = [] } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: beacons = [] } = useQuery({
    queryKey: ['analytics-beacons'],
    queryFn: () => base44.entities.Beacon.list(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['analytics-orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['analytics-posts'],
    queryFn: () => base44.entities.CommunityPost.list(),
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ['analytics-checkins'],
    queryFn: () => base44.entities.BeaconCheckIn.list(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['analytics-messages'],
    queryFn: () => base44.entities.Message.list(),
  });

  const { data: supportTickets = [] } = useQuery({
    queryKey: ['analytics-support-tickets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Calculate metrics
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_gbp || 0), 0);

  const totalXP = users.reduce((sum, u) => sum + (u.xp || 0), 0);
  const avgXP = users.length > 0 ? Math.round(totalXP / users.length) : 0;

  const activeUsers = users.filter(u => u.activity_status && u.activity_status !== 'offline').length;
  const activeBeacons = beacons.filter(b => b.active).length;

  // Subscription metrics
  const plusSubscribers = users.filter(u => u.membership_tier === 'plus' && u.subscription_status === 'active').length;
  const chromeSubscribers = users.filter(u => u.membership_tier === 'pro' && u.subscription_status === 'active').length;
  const totalSubscribers = plusSubscribers + chromeSubscribers;
  
  // Monthly Recurring Revenue (MRR) estimate
  const PLUS_PRICE = 9.99;
  const CHROME_PRICE = 19.99;
  const estimatedMRR = (plusSubscribers * PLUS_PRICE) + (chromeSubscribers * CHROME_PRICE);
  
  // Average Revenue Per User (ARPU) - only counting paying users
  const arpu = totalSubscribers > 0 ? (estimatedMRR / totalSubscribers).toFixed(2) : 0;
  
  // Subscription conversion rate
  const conversionRate = users.length > 0 ? ((totalSubscribers / users.length) * 100).toFixed(1) : 0;
  
  // Churn - users with canceling or canceled status
  const churningUsers = users.filter(u => 
    u.subscription_status === 'canceling' || u.subscription_status === 'canceled'
  ).length;
  
  // Churn rate (as percentage of total subscribers)
  const churnRate = totalSubscribers > 0 ? ((churningUsers / totalSubscribers) * 100).toFixed(1) : 0;
  
  // Support metrics
  const openTickets = supportTickets.filter(t => t.status === 'open').length;
  const urgentTickets = supportTickets.filter(t => t.priority === 'urgent').length;
  const inProgressTickets = supportTickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = supportTickets.filter(t => t.status === 'resolved').length;
  
  // Average resolution time (simplified - would need timestamps)
  const avgResolutionTime = supportTickets.length > 0 ? '24h' : 'N/A'; // Placeholder

  // Top events by check-ins
  const eventCheckIns = checkIns.reduce((acc, ci) => {
    acc[ci.beacon_id] = (acc[ci.beacon_id] || 0) + 1;
    return acc;
  }, {});

  const topEvents = beacons
    .filter(b => b.kind === 'event')
    .map(b => ({ ...b, checkInCount: eventCheckIns[b.id] || 0 }))
    .sort((a, b) => b.checkInCount - a.checkInCount)
    .slice(0, 5);

  // Engagement metrics
  const totalEngagement = posts.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black border-2 border-[#FF1493] p-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-[#FF1493] border-2 border-white flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">TOTAL REVENUE</p>
              <p className="text-4xl font-black text-[#FF1493]">£{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-white/60 uppercase font-mono">{orders.length} ORDERS TOTAL</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black border-2 border-[#00D9FF] p-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-[#00D9FF] border-2 border-white flex items-center justify-center">
              <Users className="w-8 h-8 text-black" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">ACTIVE USERS</p>
              <p className="text-4xl font-black text-[#00D9FF]">{activeUsers}</p>
            </div>
          </div>
          <p className="text-xs text-white/60 uppercase font-mono">{users.length} TOTAL USERS</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black border-2 border-[#FFEB3B] p-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-[#FFEB3B] border-2 border-white flex items-center justify-center">
              <Zap className="w-8 h-8 text-black" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">AVERAGE XP</p>
              <p className="text-4xl font-black text-[#FFEB3B]">{avgXP}</p>
            </div>
          </div>
          <p className="text-xs text-white/60 uppercase font-mono">{totalXP.toLocaleString()} TOTAL XP</p>
        </motion.div>
      </div>

      {/* Subscription & Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black border-2 border-[#B026FF] p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-[#B026FF]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">EST. MRR</p>
          </div>
          <p className="text-3xl font-black text-[#B026FF]">£{estimatedMRR.toFixed(2)}</p>
          <p className="text-xs text-white/60 uppercase font-mono">{totalSubscribers} SUBSCRIBERS</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33 }}
          className="bg-black border-2 border-[#00D9FF] p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-[#00D9FF]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">ARPU</p>
          </div>
          <p className="text-3xl font-black text-[#00D9FF]">£{arpu}</p>
          <p className="text-xs text-white/60 uppercase font-mono">AVG REV / USER</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-black border-2 border-[#39FF14] p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-5 h-5 text-[#39FF14]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">CONVERSION</p>
          </div>
          <p className="text-3xl font-black text-[#39FF14]">{conversionRate}%</p>
          <p className="text-xs text-white/60 uppercase font-mono">FREE → PAID</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black border-2 border-[#FF6B35] p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <UserMinus className="w-5 h-5 text-[#FF6B35]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">CHURN RATE</p>
          </div>
          <p className="text-3xl font-black text-[#FF6B35]">{churnRate}%</p>
          <p className="text-xs text-white/60 uppercase font-mono">{churningUsers} CHURNING</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-black border-2 border-red-500 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-5 h-5 text-red-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">SUPPORT</p>
          </div>
          <p className="text-3xl font-black text-red-400">{openTickets}</p>
          <p className="text-xs text-white/60 uppercase font-mono">{urgentTickets} URGENT</p>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black border-2 border-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-[#B026FF]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">BEACONS</p>
          </div>
          <p className="text-3xl font-black">{beacons.length}</p>
          <p className="text-xs text-white/60 uppercase font-mono">{activeBeacons} ACTIVE</p>
        </div>

        <div className="bg-black border-2 border-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-5 h-5 text-[#FF6B35]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">ORDERS</p>
          </div>
          <p className="text-3xl font-black">{orders.length}</p>
          <p className="text-xs text-white/60 uppercase font-mono">
            {orders.filter(o => o.status === 'delivered').length} DELIVERED
          </p>
        </div>

        <div className="bg-black border-2 border-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-5 h-5 text-[#39FF14]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">POSTS</p>
          </div>
          <p className="text-3xl font-black">{posts.length}</p>
          <p className="text-xs text-white/60 uppercase font-mono">{totalEngagement} ENGAGEMENTS</p>
        </div>

        <div className="bg-black border-2 border-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-[#FF1493]" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">CHECK-INS</p>
          </div>
          <p className="text-3xl font-black">{checkIns.length}</p>
        </div>
      </div>

      {/* Top Events */}
      <div className="bg-black border-2 border-white p-6">
        <h3 className="text-xl font-black uppercase tracking-tighter mb-6">TOP EVENTS BY CHECK-INS</h3>
        <div className="space-y-3">
          {topEvents.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-4 bg-white/5 border-2 border-white/10 p-4"
            >
              <div className="w-12 h-12 bg-[#B026FF] border-2 border-white flex items-center justify-center font-black text-xl">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-black uppercase">{event.title}</p>
                <p className="text-xs text-white/60">{event.city}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#00D9FF]">{event.checkInCount}</p>
                <p className="text-xs text-white/40 uppercase">CHECK-INS</p>
              </div>
            </motion.div>
          ))}
          {topEvents.length === 0 && (
            <p className="text-center text-white/40 py-8 uppercase text-sm">NO EVENT DATA YET</p>
          )}
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-black border-2 border-white p-6">
        <h3 className="text-xl font-black uppercase tracking-tighter mb-6">SUBSCRIPTION BREAKDOWN</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 border-2 border-white/10 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 bg-white/40 rounded-full" />
              <span className="text-sm font-bold uppercase">BASIC (Free)</span>
            </div>
            <p className="text-3xl font-black">{users.filter(u => !u.membership_tier || u.membership_tier === 'basic' || u.membership_tier === 'free').length}</p>
            <p className="text-xs text-white/40 mt-1">Free tier users</p>
          </div>
          <div className="bg-[#FF1493]/10 border-2 border-[#FF1493]/40 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 bg-[#FF1493] rounded-full" />
              <span className="text-sm font-bold uppercase text-[#FF1493]">PLUS</span>
            </div>
            <p className="text-3xl font-black text-[#FF1493]">{plusSubscribers}</p>
            <p className="text-xs text-white/40 mt-1">£9.99/month • £{(plusSubscribers * PLUS_PRICE).toFixed(2)}/mo</p>
          </div>
          <div className="bg-[#00D9FF]/10 border-2 border-[#00D9FF]/40 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 bg-[#00D9FF] rounded-full" />
              <span className="text-sm font-bold uppercase text-[#00D9FF]">CHROME</span>
            </div>
            <p className="text-3xl font-black text-[#00D9FF]">{chromeSubscribers}</p>
            <p className="text-xs text-white/40 mt-1">£19.99/month • £{(chromeSubscribers * CHROME_PRICE).toFixed(2)}/mo</p>
          </div>
        </div>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black border-2 border-white p-6">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-4">SUPPORT TICKETS</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">Open</span>
              <span className="font-black text-blue-400">{openTickets}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">In Progress</span>
              <span className="font-black text-yellow-400">{inProgressTickets}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">Resolved</span>
              <span className="font-black text-green-400">{resolvedTickets}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">Urgent Priority</span>
              <span className="font-black text-red-400">{urgentTickets}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 uppercase text-xs font-mono">Avg Resolution</span>
              <span className="font-black">{avgResolutionTime}</span>
            </div>
          </div>
        </div>

        <div className="bg-black border-2 border-white p-6">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-4">USER ACTIVITY</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">Online</span>
              <span className="font-black text-[#00D9FF]">
                {users.filter(u => u.activity_status === 'online').length}
              </span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">Looking for Collabs</span>
              <span className="font-black text-[#39FF14]">
                {users.filter(u => u.activity_status === 'looking_for_collabs').length}
              </span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
              <span className="text-white/60 uppercase text-xs font-mono">At Event</span>
              <span className="font-black text-[#FF1493]">
                {users.filter(u => u.activity_status === 'at_event').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 uppercase text-xs font-mono">Busy</span>
              <span className="font-black text-[#FF6B35]">
                {users.filter(u => u.activity_status === 'busy').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Categories Breakdown */}
      <div className="bg-black border-2 border-white p-6">
        <h3 className="text-xl font-black uppercase tracking-tighter mb-6">SUPPORT TICKET CATEGORIES</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['general', 'technical', 'billing', 'safety'].map(category => {
            const count = supportTickets.filter(t => t.category === category).length;
            const openCount = supportTickets.filter(t => t.category === category && t.status === 'open').length;
            return (
              <div key={category} className="bg-white/5 border-2 border-white/10 p-4">
                <p className="text-sm font-bold uppercase text-white/80 mb-2">{category}</p>
                <p className="text-3xl font-black">{count}</p>
                <p className="text-xs text-white/40 mt-1">{openCount} open</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Health - moved down */}
      <div className="bg-black border-2 border-white p-6">
        <h3 className="text-lg font-black uppercase tracking-tighter mb-4">PLATFORM HEALTH</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
            <span className="text-white/60 uppercase text-xs font-mono">Total Messages</span>
            <span className="font-black">{messages.length}</span>
          </div>
          <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
            <span className="text-white/60 uppercase text-xs font-mono">Community Posts</span>
            <span className="font-black">{posts.length}</span>
          </div>
          <div className="flex justify-between items-center border-b-2 border-white/10 pb-2">
            <span className="text-white/60 uppercase text-xs font-mono">Check-ins Today</span>
            <span className="font-black">{checkIns.filter(c => {
              const today = new Date();
              const ciDate = new Date(c.created_date);
              return ciDate.toDateString() === today.toDateString();
            }).length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/60 uppercase text-xs font-mono">Active Beacons</span>
            <span className="font-black">{activeBeacons}</span>
          </div>
        </div>
      </div>
    </div>
  );
}