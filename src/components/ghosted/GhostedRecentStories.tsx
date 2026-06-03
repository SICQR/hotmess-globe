/**
 * GhostedRecentStories — Instagram/Grindr-style row of recent signals.
 *
 * A horizontal circle row that sits ABOVE the Ghosted grid (always visible,
 * no label). One row, three entity classes per D53 §4.1 (Story Rail Class Closure):
 *
 *   HOTMESS gold gradient (anchor) → HOTMESS RADIO operator entity.
 *                One slot, leftmost, permanent, never dismissable. Pulses when
 *                live. Tap → /radio.
 *   Cream ring (max 3) → a PLACE — curated care beacon on the ground tonight
 *                (Vauxhall, 56 Dean Street, Antidote, Royal Free, etc.).
 *                Tap → /pulse flyTo the beacon coord.
 *   Gold ring  → a PERSON with an active beacon (or recent chat partner).
 *                Tap → profile + active beacon module.
 *
 * Phil 2026-06-03 Samui — single-primitive rule (D53 §1.4). The previous
 * standalone CareOnTheGroundStrip duplicated this row's shape; both got
 * folded into one component. Care reads quieter (cream vs gold) so the
 * sexual/social signal still leads the room, but the surface is unified.
 *
 * Schema:
 *   chat_threads (participant_emails[], last_message_at, unread_count jsonb, active)
 *   profiles     (id, email, display_name, avatar_url)
 *   beacons      (id, owner_id, title, beacon_category, ends_at, active,
 *                 latitude, longitude)
 *
 * Renders nothing when there's nobody/nothing to show, so the grid below
 * always carries the page.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { safeName } from '@/lib/identity/safeName';
import { useRadio } from '@/contexts/RadioContext';

interface RowPerson {
  userId: string | null;
  email: string;
  name: string;
  avatar: string | null;
  hasBeacon: boolean;
  beaconId: string | null;
  // Phil 2026-06-03 — newest-first ordering rule. Beacon recency drives
  // position within the hasBeacon group: a beacon dropped 2 minutes ago
  // sits left of one dropped 4 hours ago. Older signals drift right.
  beaconStartsAt: string | null;
  unread: boolean;
  threadId: string | null;
}

/**
 * Phil 2026-06-03 — care circles. Curated care beacons (owner_id NULL,
 * beacon_category aftercare/care, still live). Render after people in
 * the same horizontal scroll plane, cream ring not gold. Tap flies to
 * the beacon coord on /pulse.
 */
interface RowCare {
  id: string;
  title: string;
  lat: number | null;
  lng: number | null;
}

export function GhostedRecentStories({
  currentUserEmail,
  currentUserId,
}: {
  currentUserEmail: string | null;
  currentUserId?: string | null;
}) {
  const { openSheet } = useSheet();

  const { isPlaying: radioIsPlaying, currentShowName: radioShowName } = useRadio();
  const navigate = useNavigate();
  const [people, setPeople] = React.useState<RowPerson[]>([]);
  const [careCircles, setCareCircles] = React.useState<RowCare[]>([]);
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

        // 2. Active person-beacons (anyone with owner_id set). Most recently
        // started first — Phil 2026-06-03 newest-first rule. Older drift right.
        const beaconsP = supabase
          .from('beacons')
          .select('id, owner_id, starts_at, ends_at, beacon_category')
          .not('owner_id', 'is', null)
          .eq('active', true)
          .gt('ends_at', nowIso)
          .order('starts_at', { ascending: false })
          .limit(40);

        // 3. Curated CARE beacons (owner_id NULL, aftercare/care category).
        // Phil 2026-06-03 — folded in from the now-deleted CareOnTheGroundStrip.
        // Single primitive (D53 §1.4). Render in same row, cream ring not gold.
        // Newest-first via created_at desc so a freshly-seeded care beacon
        // sits left of a long-standing one.
        const careP = supabase
          .from('beacons')
          .select('id, title, latitude, longitude, created_at')
          .is('owner_id', null)
          .eq('active', true)
          .gt('ends_at', nowIso)
          .in('beacon_category', ['aftercare', 'care'])
          .order('created_at', { ascending: false })
          .limit(12);

        const [{ data: threads }, { data: beacons }, { data: careRows }] = await Promise.all([
          threadsP, beaconsP, careP,
        ] as any);

        const threadList: any[] = threads || [];
        const beaconList: any[] = beacons || [];
        const careList: any[] = careRows || [];

        // Most-recent active beacon per owner. Phil 2026-06-01 — INCLUDE
        // self so the user can see confirmation that their own beacon is
        // live. Instagram-pattern: own story leads the carousel. Without
        // this the user gets no in-row feedback that their drop landed.
        // Phil 2026-06-03 — also carry starts_at for newest-first sort
        // within the hasBeacon group.
        const beaconByOwner = new Map<string, string>(); // owner_id -> beacon_id
        const beaconStartsByOwner = new Map<string, string>(); // owner_id -> starts_at
        for (const b of beaconList) {
          if (!b.owner_id) continue;
          if (!beaconByOwner.has(b.owner_id)) {
            beaconByOwner.set(b.owner_id, b.id);
            if (b.starts_at) beaconStartsByOwner.set(b.owner_id, b.starts_at);
          }
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

        // DOCTRINE (Phil 2026-05-26): the carousel above the Ghosted grid
        // is the BEACON SURFACE. Only people with an active beacon belong
        // here. Recent chat partners have been removed from this row —
        // they belong in the dedicated chat surface, not stamped onto a
        // beacon list. Per docs/doctrine/beacon-doctrine.md §11 (single-
        // source rendering) the globe layer and this carousel both derive
        // from the same active beacon set.
        //
        // a) Beacon owners only.
        for (const ownerId of beaconOwnerIds) {
          if (seen.has(ownerId)) continue;
          const prof = profById.get(ownerId);
          if (!prof) continue;
          seen.add(ownerId);
          out.push({
            userId: ownerId,
            email: prof.email || '',
            // P0 2026-05-28: no email-username fallback. safeName returns 'Member' when display_name missing.
            name: safeName(prof, 'Signal'),
            avatar: prof.avatar_url || null,
            hasBeacon: true,
            beaconId: beaconByOwner.get(ownerId) || null,
            beaconStartsAt: beaconStartsByOwner.get(ownerId) || null,
            unread: false,
            threadId: null,
          });
        }

        // Phil 2026-06-01 — self-first ordering. The user's own avatar
        // leads the row when they have an active beacon (Instagram pattern:
        // own story comes first).
        // Phil 2026-06-03 — within hasBeacon group, newest-first by
        // starts_at. Older signals drift right as fresh ones come in.
        out.sort((a, b) => {
          // Self with beacon — always leftmost.
          if (a.userId === currentUserId && a.hasBeacon) return -1;
          if (b.userId === currentUserId && b.hasBeacon) return 1;
          // Beacon-havers before no-beacon (carryover legacy ordering).
          const bd = Number(b.hasBeacon) - Number(a.hasBeacon);
          if (bd !== 0) return bd;
          // Within beacon-havers, newest-first.
          if (a.hasBeacon && b.hasBeacon) {
            const ta = a.beaconStartsAt ? Date.parse(a.beaconStartsAt) : 0;
            const tb = b.beaconStartsAt ? Date.parse(b.beaconStartsAt) : 0;
            return tb - ta;
          }
          return 0;
        });

        // Care circles — care list arrives newest-first from the query already
        // (order created_at desc), so we just map to the row shape.
        const careOut: RowCare[] = careList.map((c) => ({
          id: c.id,
          title: c.title || 'Care',
          lat: typeof c.latitude === 'number' ? c.latitude : null,
          lng: typeof c.longitude === 'number' ? c.longitude : null,
        }));

        if (!cancelled) {
          setPeople(out);
          setCareCircles(careOut);
        }
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

  // Phil 2026-06-03 — render the row whenever EITHER list has content.
  // Empty-and-empty stays silent so the grid carries the page.
  // Phil 2026-06-03 — D53 §4.1: RADIO is permanent. Row renders even when both other classes are empty.
  if (loading) return null;

  const open = (p: RowPerson) => {
    // Doctrine: globe tap AND carousel tap both resolve to the creator's
    // canonical profile with the beacon id in the query string. The profile
    // page renders ActiveBeaconModule when ?beacon= is present.
    if (p.userId) {
      const url = p.beaconId
        ? `/profile/${p.userId}?beacon=${p.beaconId}`
        : `/profile/${p.userId}`;
      navigate(url);
      return;
    }
    if (p.threadId) openSheet('chat', { thread: p.threadId, to: p.email, title: p.name });
  };

  // Phil 2026-06-03 — care circle tap. D14 routing as continuity: never
  // open external maps. Fly /pulse to the beacon coord with the beacon id
  // pre-focused so the user can land on the beacon card directly.
  const openCare = (c: RowCare) => {
    if (c.lat == null || c.lng == null) return;
    navigate('/pulse', {
      state: {
        flyTo: { lat: c.lat, lng: c.lng, zoom: 15 },
        focusBeaconId: c.id,
      },
    });
  };

  return (
    <div className="px-3 pt-2 pb-2">
      <style dangerouslySetInnerHTML={{ __html: `.gh-stories::-webkit-scrollbar{display:none}` }} />
      <div
        className="gh-stories flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain', touchAction: 'pan-x' }}
      >
        {/* D53 §4.1 — HOTMESS RADIO operator entity anchor.
            Permanent, leftmost, never dismissable. Pulses when isPlaying.
            Tap → /radio. See doctrine docs/doctrine/53-surface-continuity-substrate.md §4.1. */}
        <button
          key="hotmess-radio-anchor"
          type="button"
          onClick={() => navigate('/radio')}
          aria-label={radioIsPlaying ? `HOTMESS RADIO — ${radioShowName || 'live'} playing` : 'HOTMESS RADIO'}
          className="flex flex-col items-center gap-1 flex-shrink-0 w-16 focus:outline-none active:scale-95 transition-transform"
        >
          <span
            className="relative w-[58px] h-[58px] rounded-full p-[2px]"
            style={{
              // HOTMESS gold ring — distinct from gold-pink person ring + cream care ring.
              // Slightly larger than the 56px person/care circles so the operator entity
              // reads as the room's tone-setter, not a peer.
              background: 'linear-gradient(135deg, #C8962C 0%, #D4A84B 50%, #B8821A 100%)',
              boxShadow: radioIsPlaying
                ? '0 0 14px rgba(200,150,44,0.55), 0 0 28px rgba(200,150,44,0.22)'
                : '0 0 6px rgba(200,150,44,0.22)',
              transition: 'box-shadow 280ms ease',
            }}
          >
            <span className="block w-full h-full rounded-full overflow-hidden bg-[#0C0C0E] border border-black flex items-center justify-center relative">
              {/* Waveform glyph — three bars, animate height only when live broadcasting.
                  Static when isPlaying=false so we don't lie about live state (D35). */}
              <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
                {[3, 8, 13, 18].map((x, i) => (
                  <rect
                    key={x}
                    x={x - 1}
                    y={radioIsPlaying ? 1 : 5}
                    width="2"
                    height={radioIsPlaying ? 12 : 4}
                    rx="1"
                    fill="#C8962C"
                    style={
                      radioIsPlaying
                        ? {
                            animation: `radioBar 900ms ease-in-out ${i * 120}ms infinite alternate`,
                            transformOrigin: 'center',
                          }
                        : undefined
                    }
                  />
                ))}
              </svg>
              <style>{`
                @keyframes radioBar {
                  0%   { transform: scaleY(0.45); }
                  100% { transform: scaleY(1); }
                }
              `}</style>
            </span>
          </span>
          <span
            className="text-[10px] uppercase tracking-wider truncate w-full text-center leading-tight"
            style={{ color: radioIsPlaying ? '#C8962C' : 'rgba(245,238,220,0.78)' }}
          >
            Radio
          </span>
        </button>

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

        {/* Care circles — folded in from the deprecated CareOnTheGroundStrip.
            Same circle vocabulary as people above, but cream ring (not gold→
            pink gradient) so care reads quieter than the sexual/social signal.
            Folded into the same row per Phil's single-primitive rule. The
            ringed circles already establish "things on the ground tonight";
            no separate header label needed. */}
        {/* D53 §4.1 — care class capped at 3, newest-first already ordered upstream */}
        {careCircles.slice(0, 3).map((c) => {
          const tappable = c.lat != null && c.lng != null;
          return (
            <button
              key={`care-${c.id}`}
              type="button"
              onClick={() => openCare(c)}
              disabled={!tappable}
              aria-label={`${c.title} — tap to find on the map`}
              className="flex flex-col items-center gap-1 flex-shrink-0 w-16 focus:outline-none active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
            >
              <span
                className="relative w-14 h-14 rounded-full p-[2px]"
                style={{
                  // Cream rule — never gold. Care reads quieter than people.
                  background: 'rgba(245,238,220,0.28)',
                }}
              >
                <span className="block w-full h-full rounded-full overflow-hidden bg-[#0C0C0E] border border-black flex items-center justify-center">
                  <MapPin
                    className="w-5 h-5"
                    style={{ color: 'rgba(245,238,220,0.78)' }}
                    strokeWidth={1.6}
                  />
                </span>
              </span>
              <span
                className="text-[10px] truncate w-full text-center leading-tight"
                style={{ color: 'rgba(245,238,220,0.62)' }}
              >
                {c.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GhostedRecentStories;
