import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Music, 
  Calendar, 
  PlayCircle, 
  Headphones,
  ExternalLink,
  Play,
  Disc3,
  Mic2,
  Radio,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const getUserPhotoUrls = (user) => {
  const urls = [];
  const push = (value) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (!url) return;
    if (urls.includes(url)) return;
    urls.push(url);
  };

  push(user?.avatar_url);
  push(user?.avatarUrl);

  const photos = Array.isArray(user?.photos) ? user.photos : [];
  for (const item of photos) {
    if (!item) continue;
    if (typeof item === 'string') push(item);
    else if (typeof item === 'object') push(item.url || item.file_url || item.href);
  }

  const more = Array.isArray(user?.photo_urls) ? user.photo_urls : [];
  for (const u of more) push(u);

  return urls.slice(0, 5);
};

const isPremiumPhoto = (user, idx) => {
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const p = photos[idx];
  if (!p || typeof p !== 'object') return false;
  return !!(p.is_premium || p.isPremium || p.premium);
};

export default function CreatorProfileView({ user, currentUser }) {
  const photoUrls = getUserPhotoUrls(user);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = React.useState(null);
  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activeIsPremium = isPremiumPhoto(user, activePhotoIndex);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.full_name || 'User'))}&size=512&background=111111&color=ffffff`;
  const mainUrl = activeUrl || fallbackAvatar;

  // Fetch music releases (beacons with kind='release' or type='music')
  const { data: musicReleases = [] } = useQuery({
    queryKey: ['creator-releases', user?.email],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({
        created_by: user?.email,
        kind: 'release',
        status: 'published'
      });
      return Array.isArray(beacons) ? beacons : [];
    },
    enabled: !!user?.email,
  });

  // Fetch events hosted by this creator
  const { data: hostedEvents = [] } = useQuery({
    queryKey: ['creator-events', user?.email],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({
        created_by: user?.email,
        kind: 'event',
        status: 'published'
      });
      return Array.isArray(beacons) ? beacons : [];
    },
    enabled: !!user?.email,
  });

  // Fetch total plays/streams (mock calculation based on check-ins)
  const { data: totalPlays = 0 } = useQuery({
    queryKey: ['creator-plays', user?.email],
    queryFn: async () => {
      // This would ideally come from a dedicated analytics table
      // For now, estimate from release beacon interactions
      const releaseIds = musicReleases.map(r => r.id);
      if (!releaseIds.length) return 0;
      
      let total = 0;
      for (const id of releaseIds) {
        try {
          const checkIns = await base44.entities.BeaconCheckIn.filter({ beacon_id: id });
          total += Array.isArray(checkIns) ? checkIns.length : 0;
        } catch {
          // ignore
        }
      }
      return total;
    },
    enabled: !!user?.email && musicReleases.length > 0,
  });

  // Parse social links
  const socialLinks = user?.social_links || {};
  const soundcloudUrl = socialLinks.soundcloud || user?.soundcloud_url;
  const spotifyUrl = socialLinks.spotify;
  const appleMusicUrl = socialLinks.apple_music || socialLinks.appleMusic;
  const youtubeUrl = socialLinks.youtube;
  const instagramUrl = socialLinks.instagram;

  // Upcoming shows (events in the future)
  const upcomingShows = hostedEvents
    .filter(e => e.event_date && new Date(e.event_date) > new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 3);

  // Past shows
  const pastShows = hostedEvents
    .filter(e => e.event_date && new Date(e.event_date) <= new Date())
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Photos</h3>

        <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {activeIsPremium ? (
            <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/15 to-[#FF1493]/15 border border-[#FFD700]/40 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-xs text-[#FFD700] font-black uppercase">Premium</div>
              </div>
            </div>
          ) : (
            <img src={mainUrl} alt="Profile photo" className="w-full h-full object-cover" />
          )}
          
          {/* Creator Badge Overlay */}
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-[#B026FF] text-white text-xs font-black uppercase flex items-center gap-1.5">
            <Mic2 className="w-3 h-3" />
            Creator
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, slotIdx) => {
            const photoIdx = slotIdx + 1;
            const url = photoUrls[photoIdx] || null;
            const premium = isPremiumPhoto(user, photoIdx);

            return (
              <button
                key={photoIdx}
                type="button"
                className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30 hover:border-white/25 transition-colors disabled:opacity-60"
                onMouseEnter={() => setPreviewPhotoIndex(photoIdx)}
                onMouseLeave={() => setPreviewPhotoIndex(null)}
                onClick={() => {
                  if (!url) return;
                  setSelectedPhotoIndex(photoIdx);
                  setPreviewPhotoIndex(null);
                }}
                disabled={!url}
              >
                {premium ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFD700]/15 to-[#FF1493]/15 flex items-center justify-center">
                    <div className="text-xs text-[#FFD700] font-black">🔒</div>
                  </div>
                ) : url ? (
                  <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-white/10 to-black/30" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Creator Bio */}
      {(user?.creator_bio || user?.bio) && (
        <div className="bg-gradient-to-br from-[#B026FF]/10 to-[#FF1493]/10 border border-[#B026FF]/30 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#B026FF] mb-3 flex items-center gap-2">
            <Mic2 className="w-4 h-4" />
            About the Artist
          </h3>
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {user.creator_bio || user.bio}
          </p>
        </div>
      )}

      {/* Creator Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Disc3 className="w-6 h-6 mx-auto mb-2 text-[#B026FF]" />
          <div className="text-2xl font-black">{musicReleases.length}</div>
          <div className="text-xs text-white/40 uppercase">Releases</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{hostedEvents.length}</div>
          <div className="text-xs text-white/40 uppercase">Shows</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Headphones className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-black">{totalPlays}</div>
          <div className="text-xs text-white/40 uppercase">Plays</div>
        </div>
      </div>

      {/* Music Releases */}
      {musicReleases.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase flex items-center gap-2">
              <Music className="w-5 h-5 text-[#B026FF]" />
              Releases
            </h3>
            <Link 
              to="/music"
              className="text-xs text-[#B026FF] hover:text-white uppercase font-bold"
            >
              View All →
            </Link>
          </div>
          
          <div className="space-y-3">
            {musicReleases.slice(0, 5).map((release) => (
              <Link 
                key={release.id}
                to={`/music/releases/${release.release_slug || release.id}`}
                className="flex items-center gap-4 p-3 bg-black/30 border border-white/10 hover:border-[#B026FF]/50 transition-colors group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-[#B026FF]/30 to-[#FF1493]/30 flex items-center justify-center flex-shrink-0">
                  {release.cover_image || release.image_url ? (
                    <img 
                      src={release.cover_image || release.image_url} 
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Disc3 className="w-8 h-8 text-[#B026FF]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-white group-hover:text-[#B026FF] transition-colors truncate">
                    {release.release_title || release.title}
                  </h4>
                  <p className="text-xs text-white/50 uppercase">
                    {release.release_at ? format(new Date(release.release_at), 'MMM d, yyyy') : 'Unreleased'}
                  </p>
                </div>
                <PlayCircle className="w-8 h-8 text-white/30 group-hover:text-[#B026FF] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Shows */}
      {upcomingShows.length > 0 && (
        <div className="bg-gradient-to-br from-[#00D9FF]/10 to-[#B026FF]/10 border border-[#00D9FF]/30 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#00D9FF]" />
            Upcoming Shows
          </h3>
          
          <div className="space-y-3">
            {upcomingShows.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block p-4 bg-black/30 border border-white/10 hover:border-[#00D9FF]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-black text-white">{event.title}</h4>
                    <p className="text-sm text-white/60 mt-1">
                      {event.event_date && format(new Date(event.event_date), 'EEEE, MMMM d')}
                      {event.event_time && ` • ${event.event_time}`}
                    </p>
                    {event.venue_name && (
                      <p className="text-xs text-white/40 mt-1">{event.venue_name}</p>
                    )}
                  </div>
                  <Button size="sm" className="bg-[#00D9FF] text-black font-bold uppercase text-xs">
                    RSVP
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past Shows */}
      {pastShows.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Past Performances
          </h3>
          
          <div className="space-y-2">
            {pastShows.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="font-bold text-white/80">{event.title}</p>
                  <p className="text-xs text-white/40">
                    {event.event_date && format(new Date(event.event_date), 'MMM d, yyyy')}
                  </p>
                </div>
                {event.venue_name && (
                  <span className="text-xs text-white/40">{event.venue_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streaming Links */}
      {(soundcloudUrl || spotifyUrl || appleMusicUrl || youtubeUrl) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Headphones className="w-4 h-4" />
            Listen On
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {soundcloudUrl && (
              <a
                href={soundcloudUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#FF5500] hover:bg-[#FF5500]/80 text-white text-sm font-bold uppercase transition-colors"
              >
                <Radio className="w-4 h-4" />
                SoundCloud
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {spotifyUrl && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] hover:bg-[#1DB954]/80 text-white text-sm font-bold uppercase transition-colors"
              >
                <Music className="w-4 h-4" />
                Spotify
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {appleMusicUrl && (
              <a
                href={appleMusicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FA57C1] to-[#FC5C5C] hover:opacity-80 text-white text-sm font-bold uppercase transition-colors"
              >
                <Music className="w-4 h-4" />
                Apple Music
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#FF0000] hover:bg-[#FF0000]/80 text-white text-sm font-bold uppercase transition-colors"
              >
                <Play className="w-4 h-4" />
                YouTube
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Music Genres/Styles */}
      {user?.music_taste && user.music_taste.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {user.music_taste.map((genre, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1 bg-[#B026FF]/15 border border-[#B026FF]/35 text-[#D7B8FF] text-xs font-bold uppercase"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills/Instruments */}
      {user?.skills && user.skills.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Skills & Instruments</h3>
          <div className="flex flex-wrap gap-2">
            {user.skills.map((skill, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1 bg-white/10 border border-white/20 text-white/80 text-xs font-bold uppercase"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collaboration CTA */}
      {user?.email !== currentUser?.email && (
        <div className="bg-gradient-to-r from-[#B026FF]/20 to-[#FF1493]/20 border border-[#B026FF]/40 rounded-xl p-6 text-center">
          <h3 className="text-lg font-black uppercase mb-2">Want to Collaborate?</h3>
          <p className="text-white/60 text-sm mb-4">
            Reach out to discuss bookings, features, or collaborations
          </p>
          <Button className="bg-[#B026FF] hover:bg-white hover:text-black text-white font-black uppercase">
            Send Message
          </Button>
        </div>
      )}
    </div>
  );
}
