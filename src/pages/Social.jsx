import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ghost, MessageCircle, Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';
import { useCurrentUser } from '@/components/utils/queryConfig';

export default function Social() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discover');
  const location = useLocation();

  const setTabAndUrl = useCallback(
    (nextTab, { replace = false } = {}) => {
      const normalized = String(nextTab || '').toLowerCase() === 'inbox' ? 'inbox' : 'discover';
      setActiveTab(normalized);

      const params = new URLSearchParams(location.search || '');
      params.set('tab', normalized);
      const nextSearch = `?${params.toString()}`;

      if (location.pathname === '/social' && location.search === nextSearch) return;

      navigate(
        {
          pathname: '/social',
          search: nextSearch,
        },
        { replace }
      );
    },
    [location.pathname, location.search, navigate]
  );
  
  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();

  const { data: threads = [] } = useQuery({
    queryKey: ['message-threads', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allThreads = await base44.entities.ChatThread.filter({ active: true }, '-updated_date');
      return allThreads.filter(
        (t) => Array.isArray(t.participant_emails) && t.participant_emails.includes(currentUser.email)
      );
    },
    enabled: !!currentUser?.email,
  });

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const tab = String(params.get('tab') || '').toLowerCase();
      if (tab === 'discover' || tab === 'inbox') setActiveTab(tab);
    } catch {
      // ignore
    }
  }, [location.search]);

  if (currentUserLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Hero for non-logged in users */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="/images/ghosted-cover.jpg" 
              alt="Ghosted" 
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-pink-950/80 via-black/60 to-black" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 text-center px-6 max-w-3xl"
          >
            <Ghost className="w-20 h-20 mx-auto mb-8 text-pink-500" />
            <h1 className="text-[15vw] md:text-[10vw] font-black italic leading-[0.85] tracking-tighter mb-6">
              GHOSTED<span className="text-pink-500">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 mb-6">
              Who's out right now. Your pace.
            </p>
            <p className="text-base text-white/50 mb-12 max-w-lg mx-auto">
              Opt-in discovery. No pressure. No unread counts. Presence over performance.
            </p>
            <Button
              onClick={() => navigate(`/auth?next=${encodeURIComponent('/social')}`)}
              className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-12 py-7 text-xl"
            >
              SIGN IN TO DISCOVER
            </Button>
          </motion.div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/ghosted-cover.jpg" 
            alt="Ghosted" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-pink-950/80 via-black/80 to-black" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-7xl mx-auto px-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-pink-400 mb-4">DISCOVERY</p>
              <h1 className="text-5xl md:text-7xl font-black italic mb-4">
                GHOSTED<span className="text-pink-500">.</span>
              </h1>
              <p className="text-xl text-white/60 max-w-xl">
                Opt-in. Contextual. Your pace. Find people without the pressure.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
              >
                <Eye className="w-5 h-5 mr-2" />
                VISIBLE
              </Button>
              <Link to="/care">
                <Button
                  variant="outline"
                  className="border-2 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white font-black uppercase"
                >
                  <EyeOff className="w-5 h-5 mr-2" />
                  PAUSE
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. TABS & CONTENT */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={(v) => setTabAndUrl(v)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/5 mb-8">
              <TabsTrigger
                value="discover"
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-black font-black uppercase py-4"
              >
                <Ghost className="w-5 h-5 mr-2" />
                DISCOVER
              </TabsTrigger>
              <TabsTrigger
                value="inbox"
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black relative font-black uppercase py-4"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                INBOX
                {threads.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-pink-500 text-white text-xs font-black rounded-full">
                    {threads.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover">
              <ProfilesGrid
                showHeader={false}
                showTelegramFeedButton
                containerClassName="mx-0 max-w-none p-0"
                onNavigateUrl={(url) => navigate(url)}
                onOpenProfile={(profile) => {
                  const email = profile?.email;
                  const uid = profile?.authUserId;
                  if (uid) {
                    navigate(`/social/u/${encodeURIComponent(uid)}`);
                    return;
                  }
                  if (email) {
                    navigate(createPageUrl(`Profile?email=${encodeURIComponent(email)}`));
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="inbox">
              {threads.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 bg-white/5 rounded-2xl border border-white/10"
                >
                  <MessageCircle className="w-20 h-20 mx-auto mb-6 text-white/20" />
                  <h3 className="text-2xl font-black mb-2">NO MESSAGES YET</h3>
                  <p className="text-white/60 mb-8">Start a conversation from Discover</p>
                  <Button
                    onClick={() => setTabAndUrl('discover')}
                    className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-8 py-4"
                  >
                    <Ghost className="w-5 h-5 mr-2" />
                    GO TO DISCOVER
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {threads.map((thread, idx) => {
                    const participants = Array.isArray(thread.participant_emails) ? thread.participant_emails : [];
                    const otherParticipant = participants.find((e) => e && e !== currentUser?.email) || currentUser?.email || 'Unknown';
                    const unreadCount =
                      typeof thread.unread_count === 'number'
                        ? thread.unread_count
                        : Number(thread.unread_count?.[currentUser?.email] || 0);

                    return (
                      <motion.div
                        key={thread.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          to={`/social/t/${encodeURIComponent(String(thread.id))}`}
                          className="block"
                        >
                          <div className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/50 rounded-xl p-5 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                                <span className="text-xl font-black">
                                  {otherParticipant[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black uppercase text-lg group-hover:text-pink-400 transition-colors">
                                  {otherParticipant}
                                </p>
                                <p className="text-sm text-white/50 truncate">
                                  {thread.last_message || 'Start a conversation...'}
                                </p>
                              </div>
                              {unreadCount > 0 && (
                                <span className="px-3 py-1 bg-pink-500 text-white text-sm font-black rounded-full">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* 3. PRINCIPLES */}
      <section className="py-20 px-6 bg-gradient-to-b from-black to-pink-950/10 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black italic mb-4">
              HOW GHOSTED WORKS
            </h2>
            <p className="text-white/60">Presence over performance. Always.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Eye, title: 'OPT-IN', desc: 'You choose when to be visible. Pause anytime.' },
              { icon: Ghost, title: 'NO PRESSURE', desc: 'No unread counts. No notification shame. Your pace.' },
              { icon: Users, title: 'CONTEXTUAL', desc: 'Connection based on where you are, not algorithms.' },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-8 text-center"
              >
                <item.icon className="w-12 h-12 mx-auto mb-4 text-pink-500" />
                <h3 className="text-xl font-black uppercase mb-2">{item.title}</h3>
                <p className="text-white/60">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
