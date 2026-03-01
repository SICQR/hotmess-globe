import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import SoundCloudEmbed from '@/components/media/SoundCloudEmbed';
import { useServerNow } from '@/hooks/use-server-now';

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HNHMESS_SOUNDCLOUD_URL = 'https://soundcloud.com/rawconvictrecords/hnh-mess/s-jK7AWO2CQ6t';
const HNHMESS_SOUNDCLOUD_PUBLIC_URL = 'https://soundcloud.com/rawconvictrecords/hnh-mess';

export default function MusicRelease() {
  const { slug } = useParams();
  const { serverNow } = useServerNow();

  const formatLondonDateTime = (value) => {
    try {
      return new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' });
    } catch {
      return '';
    }
  };

  const { data: releases = [], isLoading, error } = useQuery({
    queryKey: ['audio-releases', 'by-slug', slug],
    queryFn: async () => {
      const metadata = await base44.entities.AudioMetadata.list('-created_date', 50);
      return Array.isArray(metadata) ? metadata : [];
    },
  });

  const { data: releaseBeacon = null, isLoading: isLoadingBeacon } = useQuery({
    queryKey: ['release-beacon', slug],
    queryFn: async () => {
      const normalizedSlug = String(slug ?? '').trim();
      if (!normalizedSlug) return null;
      const rows = await base44.entities.Beacon.filter(
        { active: true, status: 'published', kind: 'release', release_slug: normalizedSlug },
        'release_at',
        1
      );
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    },
  });

  const release = useMemo(() => {
    const normalizedSlug = String(slug ?? '').trim();
    if (!normalizedSlug) return null;

    return (
      releases.find((r) => String(r?.slug ?? '').trim() === normalizedSlug) ||
      releases.find((r) => String(r?.id ?? '').trim() === normalizedSlug) ||
      releases.find((r) => slugify(r?.title) === normalizedSlug) ||
      releases.find((r) => slugify(r?.name) === normalizedSlug) ||
      null
    );
  }, [releases, slug]);

  const effective = release || releaseBeacon;
  const releaseAt = effective?.release_at ? new Date(effective.release_at) : null;
  const endAt = effective?.end_at ? new Date(effective.end_at) : null;
  const now = serverNow ?? new Date();
  const isPreLaunch = releaseAt ? now < releaseAt : false;
  const isEnded = releaseAt && endAt ? now >= endAt : false;

  const soundcloudUrn = effective?.soundcloud_urn || effective?.metadata?.soundcloud_urn;
  const soundcloudUrl = effective?.soundcloud_url || effective?.metadata?.soundcloud_url;
  const normalizedSlug = String(slug ?? '').trim().toLowerCase();
  const soundcloudRef = soundcloudUrn || soundcloudUrl || (normalizedSlug === 'hnhmess' ? HNHMESS_SOUNDCLOUD_URL : null);
  const playOnSoundCloudUrl = normalizedSlug === 'hnhmess'
    ? HNHMESS_SOUNDCLOUD_PUBLIC_URL
    : ((typeof soundcloudUrl === 'string' && soundcloudUrl.trim()) ? soundcloudUrl : null);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase">Release</h1>
            <p className="text-white/60 text-sm uppercase tracking-wider">/music/releases/{slug}</p>
          </div>
          <Link to="/music/releases">
            <Button
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
            >
              Back to releases
            </Button>
          </Link>
        </div>

        {(isLoading || isLoadingBeacon) ? (
          <div className="bg-white/5 border-2 border-white/10 p-6">Loading…</div>
        ) : error ? (
          <div className="bg-white/5 border-2 border-white/10 p-6">
            Couldn’t load release.
          </div>
        ) : !effective ? (
          <div className="bg-white/5 border-2 border-white/10 p-6">
            Release not found.
          </div>
        ) : (
          <div className="bg-white/5 border-2 border-white/10 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-black mb-2">{effective.release_title || effective.title || effective.name || 'Untitled'}</h2>
              {(effective.artist || effective.label) && (
                <p className="text-white/70">
                  {[effective.artist, effective.label].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>

            {releaseAt && (
              <div className="mb-4 text-white/70 uppercase tracking-wider text-sm">
                {isEnded
                  ? 'This release window has ended.'
                  : isPreLaunch
                    ? `Launches at ${formatLondonDateTime(releaseAt)} (London)`
                    : 'Available now'}
                {endAt && !isEnded && (
                  <span className="block text-white/50 mt-1">Ends at {formatLondonDateTime(endAt)} (London)</span>
                )}
              </div>
            )}

            {!isPreLaunch && !isEnded && soundcloudRef ? (
              <div className="mb-4">
                <SoundCloudEmbed urlOrUrn={soundcloudRef} />
              </div>
            ) : (
              <div className="mb-4 text-white/70">
                {isPreLaunch
                  ? 'Countdown active — player unlocks at launch.'
                  : isEnded
                    ? 'Player is no longer available.'
                    : 'No SoundCloud link/URN available for this release.'}
              </div>
            )}

            {typeof playOnSoundCloudUrl === 'string' && playOnSoundCloudUrl.startsWith('http') && (
              <a
                href={playOnSoundCloudUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <Button className="bg-[#C8962C] hover:bg-white text-black font-black uppercase">
                  {isPreLaunch ? 'View on SoundCloud' : 'Play on SoundCloud'}
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
