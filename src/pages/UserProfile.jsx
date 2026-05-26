/**
 * UserProfile — public viewer-facing profile route.
 *
 * Route: `/profile/:userId` (entity-aware destination for the beacon doctrine).
 * Optional query: `?beacon=:beaconId` — when present and the beacon is
 * `status='active' AND ends_at > now()`, renders <ActiveBeaconModule />
 * at the top so the tap from globe / Ghosted carousel lands on a live
 * beacon context, not a generic profile shell.
 *
 * This is intentionally a thin shell: identity (avatar, name, verified
 * badge, location label) + active-beacon module + ProfileBeaconsSection
 * for the inverse flow (profile → globe flyTo). The personal-settings
 * surface lives at `/settings` (see App.jsx — `/profile` redirects there).
 *
 * Doctrine: docs/doctrine/beacon-doctrine.md §12.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, BadgeCheck, MapPin, User as UserIcon } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import ActiveBeaconModule from '@/components/profile/ActiveBeaconModule';
import ProfileBeaconsSection from '@/components/profile/ProfileBeaconsSection';
import { useBeaconById } from '@/hooks/useBeaconById';

const AMBER = '#C8962C';
const ROOT_BG = '#050507';
const CARD_BG = '#1C1C1E';

function Shell({ children }) {
  return (
    <div
      className="min-h-screen w-full overflow-y-auto pb-36"
      style={{ background: ROOT_BG, color: '#fff' }}
    >
      {children}
    </div>
  );
}

function TopBar() {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3" style={{ background: ROOT_BG }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ml-1 p-1.5 rounded-full active:scale-95 transition-transform"
        aria-label="Back"
      >
        <ChevronLeft size={22} />
      </button>
      <span className="text-[15px] font-semibold tracking-tight">Profile</span>
    </div>
  );
}

function Skeleton() {
  return (
    <Shell>
      <TopBar />
      <div className="px-6 pt-6 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-white/[0.06] animate-pulse" />
        <div className="w-32 h-4 rounded bg-white/[0.06] animate-pulse" />
        <div className="w-24 h-3 rounded bg-white/[0.06] animate-pulse" />
      </div>
    </Shell>
  );
}

function NotFound({ userId }) {
  return (
    <Shell>
      <TopBar />
      <div className="px-6 pt-10 flex flex-col items-center gap-3 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: CARD_BG }}
        >
          <UserIcon size={28} className="text-white/40" />
        </div>
        <h1 className="text-[16px] font-semibold">Profile not found</h1>
        <p className="text-[13px] text-white/55 max-w-[280px]">
          This profile may have been removed or is not visible to you.
        </p>
        {userId && (
          <p className="text-[11px] text-white/30 font-mono mt-2 break-all">{userId}</p>
        )}
        <Link
          to="/pulse"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: AMBER, color: '#000' }}
        >
          Back to pulse
        </Link>
      </div>
    </Shell>
  );
}

function ProfileHero({ profile }) {
  const name =
    profile.display_name ||
    profile.username ||
    profile.full_name ||
    'HOTMESS member';
  const verified = Boolean(profile.is_verified);
  const location = profile.location_name || profile.city || profile.location_area || null;

  return (
    <div
      className="pt-6 pb-6 flex flex-col items-center gap-3 px-6"
      style={{ background: CARD_BG }}
    >
      <div className="relative">
        {profile.avatar_url ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={profile.avatar_url}
            alt={`${name} avatar`}
            className="w-20 h-20 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${AMBER}66` }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: '#2A2A2C' }}
          >
            <UserIcon size={28} className="text-white/40" />
          </div>
        )}
        {verified && (
          <div
            className="absolute -bottom-1 -right-1 rounded-full p-0.5"
            style={{ background: ROOT_BG }}
            title="Verified"
            aria-label="Verified"
          >
            <BadgeCheck size={18} color={AMBER} fill={AMBER} stroke={ROOT_BG} />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <h1 className="text-[18px] font-semibold leading-tight flex items-center gap-1.5">
          <span>{name}</span>
        </h1>
        {profile.username && profile.display_name && (
          <span className="text-[12px] text-white/45">@{profile.username}</span>
        )}
      </div>
      {location && (
        <div className="flex items-center gap-1 text-[12px] text-white/55">
          <MapPin size={12} aria-hidden />
          <span>{location}</span>
        </div>
      )}
      {profile.bio && (
        <p className="mt-1 text-[13px] text-white/70 text-center max-w-[300px] leading-snug">
          {profile.bio}
        </p>
      )}
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const beaconId = searchParams.get('beacon');

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { beacon: activeBeacon } = useBeaconById(beaconId);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      setNotFound(true);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        // Try by primary id first.
        let { data, error } = await supabase
          .from('profiles')
          .select(
            'id, display_name, username, full_name, avatar_url, bio, is_verified, city, location_name, location_area, auth_user_id'
          )
          .eq('id', userId)
          .maybeSingle();

        // Fall back to auth_user_id mapping for older deep links.
        if (!data && !error) {
          const fallback = await supabase
            .from('profiles')
            .select(
              'id, display_name, username, full_name, avatar_url, bio, is_verified, city, location_name, location_area, auth_user_id'
            )
            .eq('auth_user_id', userId)
            .maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (cancelled) return;
        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      } catch (_e) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <Skeleton />;
  if (notFound || !profile) return <NotFound userId={userId} />;

  const ownerName =
    profile.display_name ||
    profile.username ||
    profile.full_name ||
    null;

  return (
    <Shell>
      <TopBar />
      <ProfileHero profile={profile} />

      {/* Entity-aware beacon module — the doctrine destination. */}
      {activeBeacon && (
        <ActiveBeaconModule
          beacon={activeBeacon}
          ownerId={profile.id}
          ownerName={ownerName}
        />
      )}

      {/* Inverse direction: profile → globe flyTo for this user's beacons. */}
      <div className="mt-4">
        <ProfileBeaconsSection userId={profile.auth_user_id || profile.id} />
      </div>
    </Shell>
  );
}
