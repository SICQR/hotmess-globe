import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/components/utils/supabaseClient';
import { Shield, Users, Flag, Calendar, TrendingUp, Lock, CheckCircle, Settings as SettingsIcon, User, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import UserManagement from '../components/admin/UserManagement';
import EventManagement from '../components/admin/EventManagement';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import CurationQueue from '../components/admin/CurationQueue';
import UserVerification from '../components/admin/UserVerification';
import ShopifyManager from '../components/admin/ShopifyManager';
import AdvancedAnalytics from '../components/analytics/AdvancedAnalytics';
import BulkUserInvite from '../components/admin/BulkUserInvite';
import EventScraperControl from '../components/admin/EventScraperControl';
import EventCurationQueue from '../components/admin/EventCurationQueue';
import ModerationQueue from '../components/admin/ModerationQueue';
import SupportTicketManagement from '../components/admin/SupportTicketManagement';
import { createPageUrl } from '../utils';
import { supabase } from '@/components/utils/supabaseClient';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatchingOutbox, setDispatchingOutbox] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [dispatchError, setDispatchError] = useState(null);

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
              <div className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 text-white"
                  disabled={dispatchingOutbox}
                  onClick={async () => {
                    setDispatchError(null);
                    setDispatchResult(null);
                    setDispatchingOutbox(true);

                    try {
                      const {
                        data: { session },
                      } = await supabase.auth.getSession();

                      const token = session?.access_token;
                      if (!token) throw new Error('Not authenticated');

                      const res = await fetch('/api/admin/notifications/dispatch', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                      });

                      const payload = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        throw new Error(payload?.error || `Dispatch failed (${res.status})`);
                      }

                      setDispatchResult(payload);
                    } catch (err) {
                      setDispatchError(err?.message || 'Failed to dispatch outbox');
                    } finally {
                      setDispatchingOutbox(false);
                    }
                  }}
                >
                  <Shield className="w-4 h-4" />
                  {dispatchingOutbox ? 'Dispatching…' : 'Run Outbox Dispatch'}
                </Button>

                {(dispatchResult || dispatchError) && (
                  <div className="mt-2 text-[10px] font-mono uppercase tracking-widest">
                    {dispatchError ? (
                      <span className="text-red-400">{dispatchError}</span>
                    ) : (
                      <span className="text-white/60">
                        queued {dispatchResult?.queued ?? 0} • sent {dispatchResult?.sent ?? 0} • failed {dispatchResult?.failed ?? 0}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Link to={createPageUrl('Settings')} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white">
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </Button>
              </Link>
              <Link to={createPageUrl('EditProfile')} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto border-white/20 text-white">
                  <User className="w-4 h-4" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Admin Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-9 bg-black border-2 border-white mb-8 h-auto">
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-white font-black uppercase text-xs py-3"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
            <TabsTrigger 
              value="support" 
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Support
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
              className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-white font-black uppercase text-xs py-3"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger 
              value="shopify" 
              className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black font-black uppercase text-xs py-3"
            >
              <Shield className="w-4 h-4 mr-2" />
              Shopify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="support">
            <SupportTicketManagement />
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
            <ModerationQueue />
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-6">
              <EventScraperControl />
              <EventCurationQueue />
              <EventManagement />
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedAnalytics />
          </TabsContent>

          <TabsContent value="shopify">
            <ShopifyManager />
          </TabsContent>

          <TabsContent value="verification">
            <UserVerification />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}