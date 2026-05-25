/**
 * GhostedRecentStories — Instagram-stories style row of recent chats.
 *
 * Renders a horizontal scrolling row of avatar circles across the top of the
 * Ghosted "Recent" grid. Each circle is one of the user's most recent chat
 * threads (chat_threads, ordered by last_message_at desc); a gold ring marks
 * threads with unread messages. Tapping a circle opens that conversation in
 * the chat sheet.
 *
 * Data model (see L2ChatSheet):
 *   chat_threads (id, participant_emails[], last_message_at, unread_count jsonb, active)
 *   profiles     (email, display_name, avatar_url)
 *
 * Renders nothing while loading or when the user has no threads, so the
 * discovery grid below always carries the page.
 */

import React from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

interface StoryThread {
  threadId: string;
  email: string;
  name: string;
  avatar: string | null;
  unread: boolean;
}

export function GhostedRecentStories({ currentUserEmail }: { currentUserEmail: string | null }) {
  const { openSheet } = useSheet();
  const [stories, setStories] = React.useState<StoryThread[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    if (!currentUserEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      try {
        const { data: threads, error } = await supabase
          .from('chat_threads')
          .select('id, participant_emails, last_message_at, unread_count')
          .contains('participant_emails', [currentUserEmail])
          .eq('active', true)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(15);
        if (error) throw error;

        const list = threads || [];
        const emailKey = currentUserEmail.toLowerCase();

        const others = [
          ...new Set(
            list
              .flatMap((t: any) => t.participant_emails || [])
              .filter((e: string) => e && e.toLowerCase() !== emailKey)
          ),
        ] as string[];

        const profileMap: Record<string, any> = {};
        if (others.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('email, display_name, avatar_url')
            .in('email', others);
          (profs || []).forEach((p: any) => {
            if (p?.email) profileMap[p.email.toLowerCase()] = p;
          });
        }

        const mapped: StoryThread[] = list
          .map((t: any) => {
            const other =
              (t.participant_emails || []).find(
                (e: string) => e && e.toLowerCase() !== emailKey
              ) || '';
            const prof = profileMap[other.toLowerCase()] || {};
            const unread = Number((t.unread_count || {})[emailKey] || 0) > 0;
            return {
              threadId: t.id,
              email: other,
              name: prof.display_name || (other ? other.split('@')[0] : 'Chat'),
              avatar: prof.avatar_url || null,
              unread,
            } as StoryThread;
          })
          .filter((s: StoryThread) => !!s.email);

        if (!cancelled) setStories(mapped);
      } catch (err) {
        console.error('[GhostedRecentStories] load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserEmail]);

  if (loading || stories.length === 0) return null;

  return (
    <div className="px-3 pt-1 pb-2">
      <style dangerouslySetInnerHTML={{ __html: `.gh-stories::-webkit-scrollbar{display:none}` }} />
      <div
        className="gh-stories flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {stories.map((s) => {
          const initial = (s.name || '?').charAt(0).toUpperCase();
          return (
            <button
              key={s.threadId}
              type="button"
              onClick={() => openSheet('chat', { thread: s.threadId, to: s.email, title: s.name })}
              aria-label={`Open chat with ${s.name}`}
              className="flex flex-col items-center gap-1 flex-shrink-0 w-16 focus:outline-none active:scale-95 transition-transform"
            >
              <span
                className="relative w-14 h-14 rounded-full p-[2px]"
                style={{
                  background: s.unread
                    ? 'linear-gradient(135deg, #C8962C, #E8C56A)'
                    : 'rgba(255,255,255,0.12)',
                }}
              >
                <span className="block w-full h-full rounded-full overflow-hidden bg-[#1C1C1E] border border-black">
                  {s.avatar ? (
                    <img src={s.avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[#C8962C] font-black text-lg">
                      {initial}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-[10px] text-white/60 truncate w-full text-center leading-tight">
                {s.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GhostedRecentStories;
