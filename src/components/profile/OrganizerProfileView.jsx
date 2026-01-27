import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, MapPin, Users, Star, TrendingUp, Clock, Building2, Ticket, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import MutualConnections from './MutualConnections';
import PhotoGallery from './shared/PhotoGallery';

export default function OrganizerProfileView({ user, currentUser }) {
  // Fetch organizer's events
  const { data: organizerEvents = [] } = useQuery({
    queryKey: ['organizer-events', user?.email],
    queryFn: () => base44.entities.Beacon.filter({ organizer_email: user.email }),
    enabled: !!user?.email,
  });

  // Fetch all RSVPs for organizer's events
  const { data: eventRsvps = [] } = useQuery({
    queryKey: ['organizer-rsvps', user?.email],
    queryFn: async () => {
      const eventIds = organizerEvents.map((e) => e.id);
      if (eventIds.length === 0) return [];
      
      const allRsvps = await base44.entities.EventRSVP.list();
      return allRsvps.filter((r) => eventIds.includes(r.beacon_id) || eventIds.includes(r.event_id));
    },
    enabled: organizerEvents.length > 0,
  });

  // Fetch check-ins for stats
  const { data: eventCheckIns = [] } = useQuery({
    queryKey: ['organizer-checkins', user?.email],
    queryFn: async () => {
      const eventIds = organizerEvents.map((e) => e.id);
      if (eventIds.length === 0) return [];
      
      const allCheckIns = await base44.entities.BeaconCheckIn.list();
      return allCheckIns.filter((c) => eventIds.includes(c.beacon_id));
    },
    enabled: organizerEvents.length > 0,
  });

  const upcomingEvents = organizerEvents
    .filter((e) => {
      const eventDate = new Date(e.start_date || e.created_date);
      return eventDate > new Date();
    })
    .sort((a, b) => new Date(a.start_date || a.created_date) - new Date(b.start_date || b.created_date));

  const pastEvents = organizerEvents
    .filter((e) => {
      const eventDate = new Date(e.start_date || e.created_date);
      return eventDate <= new Date();
    })
    .sort((a, b) => new Date(b.start_date || b.created_date) - new Date(a.start_date || a.created_date));

  // Calculate stats
  const totalAttendees = eventCheckIns.length;
  const uniqueAttendees = new Set(eventCheckIns.map((c) => c.user_email)).size;
  const totalRsvps = eventRsvps.length;
  const avgRating = user?.organizer_rating || user?.rating || null;

  // Venue partnerships (stored as JSON array or separate field)
  const venuePartnerships = Array.isArray(user?.venue_partnerships) 
    ? user.venue_partnerships 
    : [];

  // Event categories/specialties
  const eventCategories = (() => {
    const categories = new Map();
    organizerEvents.forEach((e) => {
      const cat = e.category || e.event_type || e.type || 'Event';
      categories.set(cat, (categories.get(cat) || 0) + 1);
    });
    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <PhotoGallery user={user} />

      {/* Organizer Bio */}
      {(user?.bio || user?.organizer_bio) && (
        <div className="bg-white/5 border border-[#FF6B35]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#FF6B35] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            About This Organizer
          </h3>
          <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
            {user.organizer_bio || user.bio}
          </p>
        </div>
      )}

      {/* Organizer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-[#FF6B35]" />
          <div className="text-2xl font-black">{organizerEvents.length}</div>
          <div className="text-xs text-white/40 uppercase">Events</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
          <div className="text-2xl font-black">{uniqueAttendees}</div>
          <div className="text-xs text-white/40 uppercase">Attendees</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Ticket className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
          <div className="text-2xl font-black">{totalRsvps}</div>
          <div className="text-xs text-white/40 uppercase">RSVPs</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Star className="w-6 h-6 mx-auto mb-2 text-[#FFEB3B]" />
          <div className="text-2xl font-black">{avgRating?.toFixed(1) || 'New'}</div>
          <div className="text-xs text-white/40 uppercase">Rating</div>
        </div>
      </div>

      {/* Event Categories/Specialties */}
      {eventCategories.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Specialties
          </h3>
          <div className="flex flex-wrap gap-2">
            {eventCategories.map(([category, count], idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#FF6B35]/15 border border-[#FF6B35]/35 text-[#FF6B35] text-xs font-bold uppercase"
              >
                {String(category).replaceAll('_', ' ')} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verified Organizer Badge */}
      {user?.verified_organizer && (
        <div className="bg-gradient-to-r from-[#39FF14]/10 to-[#00D9FF]/10 border border-[#39FF14]/30 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#39FF14] rounded-full flex items-center justify-center">
            <Award className="w-6 h-6 text-black" />
          </div>
          <div>
            <h4 className="font-bold text-[#39FF14]">Verified Organizer</h4>
            <p className="text-xs text-white/60">This organizer has been verified by HOTMESS</p>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white/5 border border-[#00D9FF]/20 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-[#00D9FF] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming Events
          </h3>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).map((event) => {
              const rsvpCount = eventRsvps.filter(
                (r) => r.beacon_id === event.id || r.event_id === event.id
              ).length;

              return (
                <Link
                  key={event.id}
                  to={`/beacons/${event.id}`}
                  className="block p-4 bg-black/30 border border-white/10 rounded-lg hover:border-[#00D9FF]/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                        <MapPin className="w-3 h-3" />
                        <span>{event.venue || event.location || 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-[#00D9FF] font-bold">
                          {format(new Date(event.start_date || event.created_date), 'MMM d, h:mm a')}
                        </span>
                        {rsvpCount > 0 && (
                          <span className="text-white/40">
                            {rsvpCount} RSVP{rsvpCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {upcomingEvents.length > 5 && (
            <Link
              to={`/events?organizer=${user.email}`}
              className="block mt-4 text-center text-xs text-[#00D9FF] hover:text-white uppercase font-bold"
            >
              View All Upcoming Events →
            </Link>
          )}
        </div>
      )}

      {/* Venue Partnerships */}
      {venuePartnerships.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Venue Partners
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {venuePartnerships.slice(0, 6).map((venue, idx) => (
              <div
                key={idx}
                className="p-4 bg-black/30 border border-white/10 rounded-lg text-center"
              >
                {venue.logo_url && (
                  <img
                    src={venue.logo_url}
                    alt={venue.name}
                    className="w-12 h-12 mx-auto mb-2 object-contain"
                  />
                )}
                <h4 className="font-bold text-sm text-white">{venue.name || venue}</h4>
                {venue.location && (
                  <p className="text-xs text-white/40 mt-1">{venue.location}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm uppercase tracking-wider text-white/40 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Past Events
            </h3>
            <span className="text-xs text-white/40">{pastEvents.length} total</span>
          </div>
          <div className="space-y-2">
            {pastEvents.slice(0, 5).map((event) => {
              const checkInCount = eventCheckIns.filter((c) => c.beacon_id === event.id).length;

              return (
                <Link
                  key={event.id}
                  to={`/beacons/${event.id}`}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-white/80">{event.title}</h4>
                    <p className="text-xs text-white/40">{event.venue || event.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/60">
                      {format(new Date(event.start_date || event.created_date), 'MMM d, yyyy')}
                    </span>
                    {checkInCount > 0 && (
                      <div className="text-xs text-[#39FF14]">{checkInCount} attended</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Contact for Booking */}
      {user?.booking_email && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-sm uppercase tracking-wider text-white/40 mb-3">Book This Organizer</h3>
          <a
            href={`mailto:${user.booking_email}?subject=Event Booking Inquiry`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-black font-bold rounded-lg hover:bg-[#FF6B35]/80 transition-colors"
          >
            Contact for Booking
          </a>
        </div>
      )}

      {/* Mutual Connections */}
      <MutualConnections targetUser={user} currentUser={currentUser} />
    </div>
  );
}
