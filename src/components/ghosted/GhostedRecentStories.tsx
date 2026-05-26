/**
 * GhostedRecentStories — Instagram/Grindr-style row of recent people.
 *
 * A horizontal avatar row that sits ABOVE the Ghosted grid (always visible,
 * no label). It merges two signals:
 *   1. Recent chat partners (chat_threads, ordered by last_message_at desc)
 *   2. People with an ACTIVE beacon (beacons where active=true & ends_at>now)
 *
 * Anyone with an active beacon gets a gold "story" ring — the signal that they
 * dropped a beacon for a reason. Tapping any avatar opens that user's profile
 * (where their current beacons are listed; from there you can find the beacon
 * or message them). Unread chats show a small dot.
 *
 * Schema (see L2ChatSheet / L2BeaconSheet):
 *   chat_threads (participant_emails[], last_message_at, unread_count jsonb, active)
 *   profiles     (id, email, display_name, avatar_url)
 *   beacons      (id, owner_id, title, beacon_category, ends_at, active)
 *
 * Renders nothing while loading or when there's nobody to show, so the grid
 * below always carries the page.
 */

import React from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

interface RowPerson {
  userId: string | null;
  email: string;
  name: string;
  avatar: string | null;
  hasBeacon: boolean;
  beaconId: string | null;
  unread: boolean;
  threadId: string | null;
}

export function GhostedRecentStories({
  currentUserEmail,
  currentUserId,
}: {
  currentUserEmail: string | null;
  currentUserId?: string | null;
}) {
  const { openSheet } = useSheet();
  const [people, setPeople] = React.useState<RowPerson[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const emailKey = (currentUserEmail || '').toLowerCase();

        // 1. Recent chat threads for this user (most recent first).
        const threadsP = currentUserEmail
          ? supabase
              .from('chat_threads')
              .select('id, participant_emails, last_message_at, unread_count')
              .contains('participant_emails', [currentUserEmail])
              .eq('active', true)
              .order('last_message_at', { ascending: false, nullsFirst: false })
              .limit(15)
          : Promise.resolve({ data: [] as any[] });

        // 2. Active beacons (anyone). Most recently started first.
        const beaconsP = supabase
          .from('beacons')
          .select('id, owner_id, starts_at, ends_at')
          .eq('active', true)
          .gt('ends_at', nowIso)
          .order('starts_at', { ascending: false })
          .limit(40);

        const [{ data: threads }, { data: beacons }] = await Promise.all([threadsP, beaconsP] as any);

        const threadList: any[] = threads || [];
        const beaconList: any[] = beacons || [];

        // Most-recent active beacon per owner (excluding self).
        const beaconByOwner = new Map<string, string>(); // owner_id -> beacon_id
        for (const b of beaconList) {
          if (!b.owner_id || b.owner_id === currentUserId) continue;
          if (!beaconByOwner.has(b.owner_id)) beaconByOwner.set(b.owner_id, b.id);
        }

        // Resolve profiles: by email (chat partners) + by id (beacon owners).
        const chatEmails = [
          ...new Set(
            threadList
              .flatMap((t) => t.participant_emails || [])
              .filter((e: string) => e && e.toLowerCase() !== emailKey)
          ),
        ] as string[];
        const beaconOwnerIds = [...beaconByOwner.keys()];

        const [profByEmailRes, profByIdRes] = await Promise.all([
          chatEmails.length
            ? supabase.from('profiles').select('id, email, display_name, avatar_url').in('email', chatEmails)
            : Promise.resolve({ data: [] as any[] }),
          beaconOwnerIds.length
            ? supabase.from('profiles').select('id, email, display_name, avatar_url').in('id', beaconOwnerIds)
            : Promise.resolve({ data: [] as any[] }),
        ] as any);

        const profByEmail = new Map<string, any>();
        const profById = new Map<string, any>();
        for (const p of (profByEmailRes.data || [])) {
          if (p.email) profByEmail.set(p.email.toLowerCase(), p);
          if (p.id) profById.set(p.id, p);
        }
        for (const p of (profByIdRes.data || [])) {
          if (p.id) profById.set(p.id, p);
          if (p.email) profByEmail.set(p.email.toLowerCase(), p);
        }

        const seen = new Set<string>(); // dedupe key (userId or email)
        const out: RowPerson[] = [];

        // a) Chat partners first (recency order).
        for (const t of threadList) {
          const other = (t.participant_emails || []).find(
            (e: string) => e && e.toLowerCase() !== emailKey
          );
          if (!other) continue;
          const prof = profByEmail.get(other.toLowerCase());
          const uid = prof?.id || null;
          const key = uid || other.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          const unread = Number((t.unread_count || {})[emailKey] || 0) > 0;
          out.push({
            userId: uid,
            email: other,
            name: prof?.display_name || other.split('@')[0],
            avatar: prof?.avatar_url || null,
            hasBeacon: uid ? beaconByOwner.has(uid) : false,
            beaconId: uid ? beaconByOwner.get(uid) || null : null,
            unread,
            threadId: t.id,
          });
        }

        // b) Beacon owners you haven't chatted with — appended, ringed.
        for (const ownerId of beaconOwnerIds) {
          if (seen.has(ownerId)) continue;
          const prof = profById.get(ownerId);
          if (!prof) continue;
          seen.add(ownerId);
          out.push({
            userId: ownerId,
            email: prof.email || '',
            name: prof.display_name || (prof.email ? prof.email.split('@')[0] : 'Signal'),
            avatar: prof.avatar_url || null,
            hasBeacon: true,
            beaconId: beaconByOwner.get(ownerId) || null,
            unread: false,
            threadId: null,
          });
        }

        // Beacon-havers float to the front so live signals lead the row.
        out.sort((a, b) => Number(b.hasBeacon) - Number(a.hasBeacon));

        if (!cancelled) setPeople(out);
      } catch (err) {
        console.error('[GhostedRecentStories] load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserEmail, currentUserId]);

  if (loading || people.length === 0) return null;

  const open = (p: RowPerson) => {
    if (p.userId) openSheet('profile', { uid: p.userId });
    else if (p.threadId) openSheet('chat', { thread: p.threadId, to: p.email, title: p.name });
  };

  return (
    <div className="px-3 pt-2 pb-2">
      <style dangerouslySetInnerHTML={{ __html: `.gh-stories::-webkit-scrollbar{display:none}` }} />
      <div
        className="gh-stories flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {people.map((p) => {
          const initial = (p.name || '?').charAt(0).toUpperCase();
          return (
            <button
              key={(p.userId || p.email) + (p.threadId || '')}
              type="button"
              onClick={() => open(p)}
              aria-label={
                p.hasBeacon ? `${p.name} — has an active beacon, open profile` : `Open ${p.name}`
              }
              className="flex flex-col items-center gap-1 flex-shrink-0 w-16 focus:outline-none active:scale-95 transition-transform"
            >
              <span
                className="relative w-14 h-14 rounded-full p-[2px]"
                style={{
                  background: p.hasBeacon
                    ? 'linear-gradient(135deg, #C8962C, #F5E6C8 55%, #FF2D78)'
                    : 'rgba(255,255,255,0.12)',
                }}
              >
                <span className="block w-full h-full rounded-full overflow-hidden bg-[#1C1C1E] border border-black">
                  {p.avatar ? (
                    <img src={p.avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[#C8962C] font-black text-lg">
                      {initial}
                    </span>
                  )}
                </span>
                {p.unread && (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#050507]"
                    style={{ background: '#FF3B30' }}
                  />
                )}
              </span>
              <span className="text-[10px] text-white/60 truncate w-full text-center leading-tight">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GhostedRecentStories;
