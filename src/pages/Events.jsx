import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Calendar, MapPin, Clock, Users, Filter, Search, Map, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isAfter, isBefore, startOfDay, endOfDay, addDays } from 'date-fns';
import { fromUTC } from '../components/utils/dateUtils';
import EventCard from '../components/events/EventCard';
import PersonalizedRecommendations from '../components/events/PersonalizedRecommendations';
import EventsMapView from '../components/events/EventsMapView';

export default function Events() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;
        
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Set user location if available
        if (user.lat && user.lng) {
          setUserLocation({ lat: user.lat, lng: user.lng });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();

    // Get browser location as fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!userLocation) {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
        },
        (error) => console.log('Location access denied:', error)
      );
    }
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter(
        { kind: 'event', status: 'published', active: true },
        '-event_date'
      );
      return beacons;
    }
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['my-rsvps', currentUser?.email],
    queryFn: () => base44.entities.EventRSVP.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['all-rsvps'],
    queryFn: () => base44.entities.EventRSVP.list()
  });

  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.venue_name?.toLowerCase().includes(query) ||
        e.city?.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFilter !== 'all' && dateFilter) {
      const now = new Date();
      filtered = filtered.filter(e => {
        if (!e.event_date) return false;
        const eventDate = fromUTC(e.event_date);
        
        switch(dateFilter) {
          case 'today':
            return isAfter(eventDate, startOfDay(now)) && isBefore(eventDate, endOfDay(now));
          case 'tomorrow':
            const tomorrow = addDays(now, 1);
            return isAfter(eventDate, startOfDay(tomorrow)) && isBefore(eventDate, endOfDay(tomorrow));
          case 'week':
            return isAfter(eventDate, now) && isBefore(eventDate, addDays(now, 7));
          case 'month':
            return isAfter(eventDate, now) && isBefore(eventDate, addDays(now, 30));
          case 'upcoming':
            return isAfter(eventDate, now);
          default:
            return true;
        }
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.mode === typeFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(e => e.city === cityFilter);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch(sortBy) {
        case 'date':
          const aDate = a.event_date ? fromUTC(a.event_date) : new Date(0);
          const bDate = b.event_date ? fromUTC(b.event_date) : new Date(0);
          return aDate - bDate;
        case 'popularity':
          const aCount = allRsvps.filter(r => r.event_id === a.id).length;
          const bCount = allRsvps.filter(r => r.event_id === b.id).length;
          return bCount - aCount;
        case 'newest':
          return new Date(b.created_date) - new Date(a.created_date);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, searchQuery, dateFilter, typeFilter, cityFilter, sortBy, allRsvps]);

  const cities = useMemo(() => {
    return [...new Set(events.map(e => e.city).filter(Boolean))];
  }, [events]);

  const myRsvpIds = new Set(rsvps.map(r => r.event_id));

  if (viewMode === 'map') {
    return (
      <EventsMapView
        events={filteredEvents}
        userLocation={userLocation}
        radius={10}
        onClose={() => setViewMode('grid')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic mb-2">
              EVENTS<span className="text-[#FF1493]">.</span>
            </h1>
            <p className="text-white/60 text-sm uppercase tracking-wider">
              Discover what's happening in London tonight
            </p>
          </div>
          <Button
            onClick={() => setViewMode('map')}
            className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black border-2 border-white"
          >
            <Map className="w-4 h-4 mr-2" />
            MAP VIEW
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-[#FF1493]" />
            <span className="text-xs uppercase tracking-wider font-bold">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white"
              />
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="crowd">Club Night</SelectItem>
                <SelectItem value="hookup">Meetup</SelectItem>
                <SelectItem value="drop">Drop Event</SelectItem>
                <SelectItem value="ticket">Ticketed</SelectItem>
                <SelectItem value="radio">Radio Show</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-white/60">
            <span>{filteredEvents.length} events found</span>
            {myRsvpIds.size > 0 && (
              <span className="text-[#FF1493]">• {myRsvpIds.size} you're attending</span>
            )}
          </div>
        </div>

        {/* Personalized Recommendations */}
        {currentUser && (
          <PersonalizedRecommendations
            currentUser={currentUser}
            allEvents={events}
            allRsvps={allRsvps}
          />
        )}

        {/* Event Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, idx) => (
              <EventCard 
                key={event.id} 
                event={event} 
                isRsvpd={myRsvpIds.has(event.id)}
                attendeeCount={allRsvps.filter(r => r.event_id === event.id).length}
                delay={idx * 0.05}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-bold mb-2">No events found</h3>
            <p className="text-white/60 mb-6">Try adjusting your filters</p>
            <Link to={createPageUrl('CreateBeacon')}>
              <Button className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black">
                Create Event
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}