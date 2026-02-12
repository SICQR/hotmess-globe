/**
 * Creator Dashboard
 * 
 * For content creators to manage:
 * - Content uploads
 * - Subscription settings
 * - Earnings & payouts
 * - Custom requests
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Eye, 
  Heart,
  Plus,
  Settings,
  Image,
  Video,
  FileText,
  Loader2,
  ChevronRight,
  MessageSquare,
  Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [content, setContent] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch creator data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      setLoading(true);

      // Get or create creator profile
      let { data: creatorProfile, error } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create profile if doesn't exist
        const { data: newProfile } = await supabase
          .from('creator_profiles')
          .insert({ user_id: user.id })
          .select()
          .single();
        creatorProfile = newProfile;
      }

      // Get content
      const { data: contentData } = await supabase
        .from('creator_content')
        .select('*')
        .eq('creator_id', creatorProfile?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get custom requests
      const { data: requestsData } = await supabase
        .from('custom_content_requests')
        .select('*, User:requester_id(display_name)')
        .eq('creator_id', creatorProfile?.id)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false });

      // Calculate earnings (simplified - should use RPC in production)
      const earningsData = {
        total: creatorProfile?.total_earnings_cents || 0,
        subscribers: creatorProfile?.subscriber_count || 0,
        thisMonth: 0, // Would calculate from transactions
        pending: 0
      };

      setProfile(creatorProfile);
      setContent(contentData || []);
      setRequests(requestsData || []);
      setEarnings(earningsData);
      setLoading(false);
    }

    fetchData();
  }, [user?.id]);

  // Format currency
  const formatCurrency = (cents) => {
    return `£${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF1493]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Failed to load creator profile</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase">Creator Studio</h1>
            <p className="text-white/60 text-sm">Manage your content & earnings</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/profile/${user?.id || ''}`)}
              className="border-white/20"
            >
              <User className="w-4 h-4 mr-2" />
              View Public Profile
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/creator/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => navigate('/creator/upload')}
              className="bg-[#FF1493] hover:bg-[#FF1493]/80 font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={DollarSign} 
            label="Total Earnings" 
            value={formatCurrency(earnings.total)}
            color="#39FF14"
          />
          <StatCard 
            icon={Users} 
            label="Subscribers" 
            value={earnings.subscribers}
            color="#FF1493"
          />
          <StatCard 
            icon={Eye} 
            label="Content Views" 
            value={content.reduce((sum, c) => sum + (c.view_count || 0), 0)}
            color="#00D9FF"
          />
          <StatCard 
            icon={MessageSquare} 
            label="Pending Requests" 
            value={requests.filter(r => r.status === 'pending').length}
            color="#FFB800"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Content */}
              <div className="border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Recent Content</h3>
                  <button 
                    onClick={() => setActiveTab('content')}
                    className="text-xs text-[#FF1493] hover:underline"
                  >
                    View all
                  </button>
                </div>
                
                {content.slice(0, 5).map((item) => (
                  <ContentRow key={item.id} content={item} />
                ))}

                {content.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-white/40 mb-3">No content yet</p>
                    <Button 
                      size="sm"
                      onClick={() => navigate('/creator/upload')}
                    >
                      Create Your First Post
                    </Button>
                  </div>
                )}
              </div>

              {/* Pending Requests */}
              <div className="border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#FFB800]" />
                    Custom Requests
                  </h3>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className="text-xs text-[#FF1493] hover:underline"
                  >
                    View all
                  </button>
                </div>

                {requests.slice(0, 5).map((request) => (
                  <RequestRow key={request.id} request={request} />
                ))}

                {requests.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-white/40">No pending requests</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <QuickAction 
                icon={Image}
                label="Upload Photo"
                onClick={() => navigate('/creator/upload?type=photo')}
              />
              <QuickAction 
                icon={Video}
                label="Upload Video"
                onClick={() => navigate('/creator/upload?type=video')}
              />
              <QuickAction 
                icon={FileText}
                label="Write Post"
                onClick={() => navigate('/creator/upload?type=post')}
              />
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="border border-white/10">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-white">All Content</h3>
                <span className="text-sm text-white/60">{content.length} posts</span>
              </div>
              
              <div className="divide-y divide-white/10">
                {content.map((item) => (
                  <ContentRow key={item.id} content={item} expanded />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <div className="border border-white/10">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-bold text-white">Custom Content Requests</h3>
              </div>
              
              {requests.length === 0 ? (
                <div className="p-8 text-center">
                  <Gift className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No custom requests yet</p>
                  <p className="text-sm text-white/40 mt-2">
                    Enable custom content in settings to receive requests
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {requests.map((request) => (
                    <RequestRow key={request.id} request={request} expanded />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-white/10 p-6">
                <h3 className="font-bold text-white mb-4">Earnings Breakdown</h3>
                
                <div className="space-y-4">
                  <EarningsRow label="Subscriptions" amount={earnings.total * 0.6} />
                  <EarningsRow label="PPV Content" amount={earnings.total * 0.25} />
                  <EarningsRow label="Tips" amount={earnings.total * 0.1} />
                  <EarningsRow label="Custom Content" amount={earnings.total * 0.05} />
                  
                  <div className="pt-4 border-t border-white/10">
                    <EarningsRow 
                      label="Platform Fee (20%)" 
                      amount={earnings.total * 0.2} 
                      isDeduction 
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Net Earnings</span>
                      <span className="text-2xl font-black text-[#39FF14]">
                        {formatCurrency(earnings.total * 0.8)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 p-6">
                <h3 className="font-bold text-white mb-4">Payout Settings</h3>
                
                <div className="p-4 bg-white/5 border border-white/10 mb-4">
                  <p className="text-sm text-white/60">Current Balance</p>
                  <p className="text-3xl font-black text-white">
                    {formatCurrency(earnings.pending || 0)}
                  </p>
                </div>

                <p className="text-sm text-white/60 mb-4">
                  Payouts are processed weekly. Minimum £50.
                </p>

                <Button 
                  className="w-full"
                  disabled={earnings.pending < 5000}
                  onClick={() => navigate('/creator/payout')}
                >
                  Request Payout
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Stat Card Component
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
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
}

// Content Row Component
function ContentRow({ content, expanded = false }) {
  const navigate = useNavigate();
  const TypeIcon = content.content_type === 'video' ? Video : 
                   content.content_type === 'photo' ? Image : FileText;

  return (
    <div 
      className="p-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={() => navigate(`/creator/content/${content.id}`)}
    >
      <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
        <TypeIcon className="w-5 h-5 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {content.title || 'Untitled'}
        </p>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {content.view_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {content.like_count || 0}
          </span>
          {content.is_ppv && (
            <span className="text-[#FFB800]">PPV</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-white/30" />
    </div>
  );
}

// Request Row Component
function RequestRow({ request, expanded = false }) {
  const statusColors = {
    pending: '#FFB800',
    accepted: '#00D9FF',
    in_progress: '#B026FF',
    delivered: '#39FF14'
  };

  return (
    <div className="p-3 flex items-center gap-3">
      <div className="w-10 h-10 bg-[#FFB800]/20 flex items-center justify-center flex-shrink-0">
        <Gift className="w-5 h-5 text-[#FFB800]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {request.User?.display_name || 'User'}
        </p>
        <p className="text-xs text-white/50 truncate">
          {request.request_description}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-white">£{(request.price_cents / 100).toFixed(0)}</p>
        <span 
          className="text-[10px] uppercase"
          style={{ color: statusColors[request.status] }}
        >
          {request.status}
        </span>
      </div>
    </div>
  );
}

// Quick Action Component
function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 border border-white/10 hover:border-[#FF1493] transition-colors flex flex-col items-center gap-2"
    >
      <Icon className="w-6 h-6 text-[#FF1493]" />
      <span className="text-sm text-white/80">{label}</span>
    </button>
  );
}

// Earnings Row Component
function EarningsRow({ label, amount, isDeduction = false }) {
  return (
    <div className="flex justify-between items-center">
      <span className={isDeduction ? 'text-white/50' : 'text-white/80'}>{label}</span>
      <span className={isDeduction ? 'text-red-400' : 'text-white'}>
        {isDeduction ? '-' : ''}£{(amount / 100).toFixed(2)}
      </span>
    </div>
  );
}
