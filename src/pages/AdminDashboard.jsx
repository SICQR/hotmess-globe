import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Shield, Users, Flag, Calendar, TrendingUp, Lock, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '../components/admin/UserManagement';
import ContentModeration from '../components/admin/ContentModeration';
import EventManagement from '../components/admin/EventManagement';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import CurationQueue from '../components/admin/CurationQueue';
import UserVerification from '../components/admin/UserVerification';
import AdvancedAnalytics from '../components/analytics/AdvancedAnalytics';
import { ABTestResults } from '../components/analytics/ABTestingFramework';
import BulkUserInvite from '../components/admin/BulkUserInvite';
import EventScraperControl from '../components/admin/EventScraperControl';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        // Failed to fetch user - will show loading state
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Shield className="w-12 h-12 text-white/40 animate-pulse" />
      </div>
    );
  }

  // ⚠️ CRITICAL SECURITY WARNING ⚠️
  // This is a CLIENT-SIDE ONLY check. It provides NO security.
  // Backend MUST enforce role='admin' validation on ALL admin API endpoints.
  // Without backend validation, attackers can bypass this by manipulating browser state.
  // Base44 platform enforces User entity security rules, but custom admin operations need explicit checks.
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-32 h-32 bg-black border-2 border-red-500 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">ACCESS DENIED</h1>
          <p className="text-white/40 uppercase text-sm font-mono">ADMIN PRIVILEGES REQUIRED</p>
          <p className="text-xs text-red-500/60 mt-4 font-mono">⚠️ Unauthorized access attempts are logged</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 bg-red-600 border-2 border-white flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black uppercase tracking-tighter">ADMIN</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                SYSTEM CONTROL PANEL
              </p>
            </div>
          </div>
        </motion.div>

        {/* Admin Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-black border-2 border-white mb-8 h-auto">
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
            <TabsTrigger 
              value="curation" 
              className="data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Curation
            </TabsTrigger>
            <TabsTrigger 
              value="verification" 
              className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="moderation" 
              className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <Flag className="w-4 h-4 mr-2" />
              Moderation
            </TabsTrigger>
            <TabsTrigger 
              value="events" 
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="curation">
            <CurationQueue />
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-6">
              <BulkUserInvite />
              <UserManagement />
            </div>
          </TabsContent>

          <TabsContent value="moderation">
            <ContentModeration />
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-6">
              <EventScraperControl />
              <EventManagement />
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedAnalytics />
          </TabsContent>

          <TabsContent value="verification">
            <UserVerification />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}