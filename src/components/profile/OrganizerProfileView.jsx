import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Calendar, 
  Users, 
  MapPin, 
  Star,
  TrendingUp,
  Clock,
  Ticket,
  BadgeCheck,
  Building,
  Mail,
  ExternalLink,
  PartyPopper,
  Award
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

  return urls.slice(0, 5);
};

const isPremiumPhoto = (user, idx) => {
  const photos = Array.isArray(user?.photos) ? user.photos : [];
  const p = photos[idx];
  if (!p || typeof p !== 'object') return false;
  return !!(p.is_premium || p.isPremium || p.premium);
};

export default function OrganizerProfileView({ user, currentUser }) {
  const photoUrls = getUserPhotoUrls(user);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0);
  const [previewPhotoIndex, setPreviewPhotoIndex] = React.useState(null);
  const activePhotoIndex = previewPhotoIndex === null ? selectedPhotoIndex : previewPhotoIndex;
  const activeUrl = photoUrls[activePhotoIndex] || null;
  const activeIsPremium = isPremiumPhoto(user, activePhotoIndex);
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(String(user?.full_name || 'User'))}&size=512&background=111111&color=ffffff`;
  const mainUrl = activeUrl || fallbackAvatar;

  // Fetch all events organized by this user
  const { data: organizedEvents = [] } = useQuery({
    queryKey: ['organizer-events', user?.email],
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

  // Fetch total RSVPs across all events
  const { data: eventStats } = useQuery({
    queryKey: ['organizer-stats', user?.email],
    queryFn: async () => {
      const eventIds = organizedEvents.map(e => e.id);
      if (!eventIds.length) return { totalRsvps: 0, totalCheckIns: 0, avgRating: 0 };
      
      let totalRsvps = 0;
      let totalCheckIns = 0;
      
      for (const eventId of eventIds) {
        try {
          const rsvps = await base44.entities.EventRSVP.filter({ beacon_id: eventId });
          totalRsvps += Array.isArray(rsvps) ? rsvps.length : 0;
          
          const checkIns = await base44.entities.BeaconCheckIn.filter({ beacon_id: eventId });
          totalCheckIns += Array.isArray(checkIns) ? checkIns.length : 0;
        } catch {
          // ignore
        }
      }
      
      // Mock avg rating - in production this would come from a reviews table
      const avgRating = organizedEvents.length > 3 ? 4.5 + Math.random() * 0.5 : 0;
      
      return { totalRsvps, totalCheckIns, avgRating };
    },
    enabled: !!user?.email && organizedEvents.length > 0,
  });

  const stats = eventStats || { totalRsvps: 0, totalCheckIns: 0, avgRating: 0 };

  // Split events into upcoming and past
  const now = new Date();
  const upcomingEvents = organizedEvents
    .filter(e => e.event_date && new Date(e.event_date) > now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  
  const pastEvents = organizedEvents
    .filter(e => e.event_date && new Date(e.event_date) <= now)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  // Parse venue partnerships from user data
  const venuePartnerships = Array.isArray(user?.venue_partnerships) 
    ? user.venue_partnerships 
    : [];

  // Event categories/specialties
  const eventCategories = [...new Set(
    organizedEvents
      .map(e => e.event_type || e.category)
      .filter(Boolean)
  )];

  // Social links
  const socialLinks = user?.social_links || {};

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
          
          {/* Organizer Badge Overlay */}
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-[#00D9FF] text-black text-xs font-black uppercase flex items-center gap-1.5">
            <PartyPopper className="w-3 h-3" />
            Event Organizer
          </div>

          {/* Verified Badge */}
          {user?.is_verified && (
            <div className="absolute top-3 right-3 w-8 h-8 bg-[#39FF14] flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-black" />
            </div>
          )}
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

      {/* Organizer Bio */}
      {(user?.organizer_bio || user?.bio) && (
        <div className="bg-gradient-to-br from-[#00D9FF]/10 to-[#B026FF]/10 border border-[#00D9FF]/30 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#00D9FF] mb-3 flex items-center gap-2">
            <PartyPopper className="w-4 h-4" />
            About the Organizer
          </h3>
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {user.organizer_bio || user.bio}
          </p>
        </div>
      )}

      {/* Organizer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{organizedEvents.length}</div>
          <div className="text-xs text-white/40 uppercase">Events</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#FF1493]" />
          <div className="text-2xl font-black">{stats.totalRsvps}</div>
          <div className="text-xs text-white/40 uppercase">Total RSVPs</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-black">{stats.totalCheckIns}</div>
          <div className="text-xs text-white/40 uppercase">Attendees</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Star className="w-6 h-6 mx-auto mb-2 text-[#FFEB3B]" />
          <div className="text-2xl font-black">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'New'}
          </div>
          <div className="text-xs text-white/40 uppercase">Rating</div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-gradient-to-br from-[#FF1493]/10 to-[#B026FF]/10 border border-[#FF1493]/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#FF1493]" />
              Upcoming Events
            </h3>
            <Link 
              to="/events"
              className="text-xs text-[#FF1493] hover:text-white uppercase font-bold"
            >
              View All →
            </Link>
          </div>
          
          <div className="space-y-3">
            {upcomingEvents.slice(0, 4).map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block p-4 bg-black/30 border border-white/10 hover:border-[#FF1493]/50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  {event.image_url ? (
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-20 h-20 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-[#FF1493]/30 to-[#B026FF]/30 flex items-center justify-center flex-shrink-0">
                      <PartyPopper className="w-8 h-8 text-[#FF1493]" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white group-hover:text-[#FF1493] transition-colors">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-white/60 mt-1">
                      <Calendar className="w-3 h-3" />
                      {event.event_date && format(new Date(event.event_date), 'EEE, MMM d')}
                      {event.event_time && ` • ${event.event_time}`}
                    </div>
                    {event.venue_name && (
                      <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.venue_name}
                      </div>
                    )}
                  </div>

                  <Button size="sm" className="bg-[#FF1493] text-white font-bold uppercase text-xs flex-shrink-0">
                    <Ticket className="w-3 h-3 mr-1" />
                    RSVP
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Past Events
          </h3>
          
          <div className="space-y-2">
            {pastEvents.slice(0, 6).map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white/80 truncate">{event.title}</p>
                  <p className="text-xs text-white/40">
                    {event.event_date && format(new Date(event.event_date), 'MMM d, yyyy')}
                    {event.venue_name && ` • ${event.venue_name}`}
                  </p>
                </div>
                <div className="text-xs text-white/30 uppercase ml-4">View</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Event Categories/Specialties */}
      {eventCategories.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Event Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {eventCategories.map((category, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1 bg-[#00D9FF]/15 border border-[#00D9FF]/35 text-[#00D9FF] text-xs font-bold uppercase"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Venue Partnerships */}
      {venuePartnerships.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Building className="w-4 h-4" />
            Venue Partnerships
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {venuePartnerships.map((venue, idx) => (
              <div 
                key={idx}
                className="p-3 bg-black/30 border border-white/10 text-center"
              >
                <Building className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
                <p className="text-sm font-bold text-white">{venue.name || venue}</p>
                {venue.location && (
                  <p className="text-xs text-white/40 mt-1">{venue.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact for Booking */}
      {user?.email !== currentUser?.email && (
        <div className="bg-gradient-to-r from-[#00D9FF]/20 to-[#FF1493]/20 border border-[#00D9FF]/40 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-black uppercase mb-1">Book an Event</h3>
              <p className="text-white/60 text-sm">
                Want {user?.full_name} to organize your event? Get in touch!
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="border-white/30 text-white hover:bg-white hover:text-black font-bold uppercase"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact
              </Button>
              <Link to={`/messages?to=${user?.email}`}>
                <Button className="bg-[#00D9FF] text-black font-black uppercase">
                  Send Message
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      {(socialLinks.instagram || socialLinks.twitter || socialLinks.website) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4">Connect</h3>
          <div className="flex flex-wrap gap-3">
            {socialLinks.instagram && (
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#FCAF45] hover:opacity-80 text-white text-sm font-bold uppercase transition-colors"
              >
                Instagram
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {socialLinks.twitter && (
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-black border border-white/20 hover:border-white text-white text-sm font-bold uppercase transition-colors"
              >
                X / Twitter
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {socialLinks.website && (
              <a
                href={socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold uppercase transition-colors"
              >
                Website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
