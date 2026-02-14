import React, { useCallback, useEffect, useState } from 'react';
import { Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';
import { useCurrentUser } from '@/components/utils/queryConfig';
import PageShell from '@/components/shell/PageShell';

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

      // Keep this canonical so copy/paste deep links are stable.
      // Avoid a navigate loop when nothing actually changed.
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

  // IMPORTANT: Hooks must be called unconditionally.
  // Keep the inbox query mounted and gate it via `enabled`.
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

  // Support deep-links like /social?tab=inbox so other pages can reliably send users back.
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
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Show profiles to everyone (discovery), but prompt login for messaging
  const showLoginPromptForInbox = !currentUser && activeTab === 'inbox';


  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="SOCIAL"
        title="Social"
        subtitle="Discover • Connect • Message"
        maxWidth="7xl"
      >
        <Tabs value={activeTab} onValueChange={(v) => setTabAndUrl(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-8">
            <TabsTrigger
              value="discover"
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black"
            >
              <Users className="w-4 h-4 mr-2" />
              DISCOVER
            </TabsTrigger>
            <TabsTrigger
              value="inbox"
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black relative"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              INBOX
              {threads.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-[#FF1493] text-black text-xs font-black rounded-full">
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
            {showLoginPromptForInbox ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-2xl font-black mb-2">SIGN IN TO MESSAGE</h3>
                <p className="text-white/60 mb-6">Create an account to chat with people</p>
                <Button
                  type="button"
                  variant="hot"
                  onClick={() => navigate(`/auth?next=${encodeURIComponent('/social?tab=inbox')}`)}
                  className="font-black uppercase"
                >
                  SIGN IN
                </Button>
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/40" />
                <h3 className="text-2xl font-black mb-2">NO MESSAGES YET</h3>
                <p className="text-white/60 mb-6">Start a conversation from Discover</p>
                <Button
                  type="button"
                  variant="cyan"
                  onClick={() => setTabAndUrl('discover')}
                  className="font-black uppercase"
                >
                  GO TO DISCOVER
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => {
                  const participants = Array.isArray(thread.participant_emails) ? thread.participant_emails : [];
                  const otherParticipant = participants.find((e) => e && e !== currentUser?.email) || currentUser?.email || 'Unknown';
                  const unreadCount =
                    typeof thread.unread_count === 'number'
                      ? thread.unread_count
                      : Number(thread.unread_count?.[currentUser?.email] || 0);

                  return (
                    <Link
                      key={thread.id}
                      to={`/social/t/${encodeURIComponent(String(thread.id))}`}
                      className="block"
                    >
                      <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 p-4 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                            <span className="text-lg font-black">
                              {otherParticipant[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-black uppercase">{otherParticipant}</p>
                            <p className="text-sm text-white/60 truncate">
                              {thread.last_message || 'Start a conversation...'}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <span className="px-3 py-1 bg-[#FF1493] text-black text-xs font-black rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            )}
          </TabsContent>
        </Tabs>
      </PageShell>
    </div>
  );
}