import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Music, Mic2, Calendar, Play, ExternalLink, Users, Disc3, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import MutualConnections from './MutualConnections';
import { CollaborationRequestButton } from './CollaborationRequest';
import PhotoGallery from './shared/PhotoGallery';

export default function CreatorProfileView({ user, currentUser, isOwnProfile }) {
  // Fetch creator's music releases (beacons with type='music' or 'release')
  const { data: musicReleases = [] } = useQuery({
    queryKey: ['creator-releases', user?.email],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({ organizer_email: user.email });
      return beacons.filter((b) => 
        b.type === 'music' || 
        b.type === 'release' || 
        b.beacon_type === 'music' ||
        b.tags?.includes('music') ||
        b.tags?.includes('release')
      );
    },
    enabled: !!user?.email,
  });

  // Fetch creator's events/shows
  const { data: creatorEvents = [] } = useQuery({
    queryKey: ['creator-events', user?.email],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({ organizer_email: user.email });
      return beacons.filter((b) => 
        b.type === 'event' || 
        b.type === 'show' || 
        b.beacon_type === 'event' ||
        !['music', 'release'].includes(b.type)
      ).sort((a, b) => new Date(b.start_date || b.created_date) - new Date(a.start_date || a.created_date));
    },
    enabled: !!user?.email,
  });

  // Fetch check-in stats for events
  const { data: eventStats = {} } = useQuery({
    queryKey: ['creator-event-stats', user?.email],
    queryFn: async () => {
      const eventIds = creatorEvents.map((e) => e.id);
      if (eventIds.length === 0) return { totalAttendees: 0 };
      
      const checkIns = await base44.entities.BeaconCheckIn.list();
      const relevantCheckIns = checkIns.filter((c) => eventIds.includes(c.beacon_id));
      
      return {
        totalAttendees: relevantCheckIns.length,
        uniqueAttendees: new Set(relevantCheckIns.map((c) => c.user_email)).size,
      };
    },
    enabled: creatorEvents.length > 0,
  });

  const upcomingEvents = creatorEvents.filter((e) => {
    const eventDate = new Date(e.start_date || e.created_date);
    return eventDate > new Date();
  });

  const pastEvents = creatorEvents.filter((e) => {
    const eventDate = new Date(e.start_date || e.created_date);
    return eventDate <= new Date();
  });

  const socialLinks = user?.social_links || {};
  const musicTaste = Array.isArray(user?.music_taste) ? user.music_taste : [];
  const genres = Array.isArray(user?.genres) ? user.genres : musicTaste;

  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <PhotoGallery user={user} />

      {/* Collaboration Request Button */}
      {!isOwnProfile && currentUser && (
        <div className="bg-gradient-to-r from-[#B026FF]/10 to-[#E62020]/10 border border-[#B026FF]/30 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white">Want to Collaborate?</h3>
              <p className="text-xs text-white/60 mt-0.5">
                Send a collaboration request to work together
              </p>
            </div>
            <CollaborationRequestButton
              creatorEmail={user?.email}
              creatorName={user?.full_name}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

      {/* Creator Bio */}
      {(user?.bio || user?.creator_bio) && (
        <div className="bg-white/5 border border-[#B026FF]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#B026FF] mb-3 flex items-center gap-2">
            <Mic2 className="w-4 h-4" />
            About This Creator
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
          <div className="text-2xl font-black">{creatorEvents.length}</div>
          <div className="text-xs text-white/40 uppercase">Shows</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-black">{eventStats.uniqueAttendees || 0}</div>
          <div className="text-xs text-white/40 uppercase">Fans</div>
        </div>
      </div>

      {/* Genres */}
      {genres.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Headphones className="w-4 h-4" />
            Genres
          </h3>
          <div className="flex flex-wrap gap-2">
            {genres.slice(0, 10).map((genre, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#B026FF]/15 border border-[#B026FF]/35 text-[#D7B8FF] text-xs font-bold uppercase"
              >
                {String(genre).replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Streaming Links */}
      {(socialLinks.soundcloud || socialLinks.spotify || socialLinks.apple_music || socialLinks.bandcamp) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Play className="w-4 h-4" />
            Listen
          </h3>
          <div className="flex flex-wrap gap-3">
            {socialLinks.soundcloud && (
              <a
                href={socialLinks.soundcloud}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#FF5500] rounded-lg text-white text-sm font-bold hover:opacity-80 transition-opacity"
              >
                <Music className="w-4 h-4" />
                SoundCloud
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {socialLinks.spotify && (
              <a
                href={socialLinks.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] rounded-lg text-white text-sm font-bold hover:opacity-80 transition-opacity"
              >
                <Music className="w-4 h-4" />
                Spotify
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {socialLinks.apple_music && (
              <a
                href={socialLinks.apple_music}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FA233B] to-[#FB5C74] rounded-lg text-white text-sm font-bold hover:opacity-80 transition-opacity"
              >
                <Music className="w-4 h-4" />
                Apple Music
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {socialLinks.bandcamp && (
              <a
                href={socialLinks.bandcamp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#629aa9] rounded-lg text-white text-sm font-bold hover:opacity-80 transition-opacity"
              >
                <Music className="w-4 h-4" />
                Bandcamp
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Shows */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white/5 border border-[#00D9FF]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#00D9FF] mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Shows
          </h3>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                to={`/beacons/${event.id}`}
                className="block p-4 bg-black/30 border border-white/10 rounded-lg hover:border-[#00D9FF]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{event.title}</h4>
                    <p className="text-xs text-white/60 mt-1">{event.venue || event.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#00D9FF]">
                      {format(new Date(event.start_date || event.created_date), 'MMM d')}
                    </div>
                    <div className="text-xs text-white/40">
                      {format(new Date(event.start_date || event.created_date), 'h:mm a')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Music Releases */}
      {musicReleases.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Disc3 className="w-4 h-4" />
            Releases
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {musicReleases.slice(0, 6).map((release) => (
              <Link
                key={release.id}
                to={`/beacons/${release.id}`}
                className="group block"
              >
                <div className="aspect-square bg-gradient-to-br from-[#B026FF]/20 to-[#E62020]/20 border border-white/10 rounded-lg overflow-hidden group-hover:border-[#B026FF]/50 transition-colors">
                  {release.image_url || release.cover_url ? (
                    <img
                      src={release.image_url || release.cover_url}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 className="w-12 h-12 text-[#B026FF]/50" />
                    </div>
                  )}
                </div>
                <h4 className="mt-2 font-bold text-sm text-white truncate">{release.title}</h4>
                <p className="text-xs text-white/40">
                  {format(new Date(release.release_date || release.created_date), 'MMM yyyy')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past Shows */}
      {pastEvents.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Mic2 className="w-4 h-4" />
            Past Shows
          </h3>
          <div className="space-y-2">
            {pastEvents.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                to={`/beacons/${event.id}`}
                className="flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-sm text-white/80">{event.title}</h4>
                  <p className="text-xs text-white/40">{event.venue || event.location}</p>
                </div>
                <span className="text-xs text-white/40">
                  {format(new Date(event.start_date || event.created_date), 'MMM d, yyyy')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mutual Connections */}
      <MutualConnections targetUser={user} currentUser={currentUser} />
    </div>
  );
}
