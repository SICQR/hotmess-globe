import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Calendar, Filter, Search, Map, Zap, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isAfter, isBefore, startOfDay, endOfDay, addDays, format } from 'date-fns';
import { fromUTC } from '../components/utils/dateUtils';
import EventCard from '../components/events/EventCard';
import PersonalizedRecommendations from '../components/events/PersonalizedRecommendations';
import EventsMapView from '../components/events/EventsMapView';
import NightlifeResearcher from '../components/ai/NightlifeResearcher';
import AIEventRecommendations from '../components/events/AIEventRecommendations';
import logger from '@/utils/logger';
import { safeGetViewerLatLng } from '@/utils/geolocation';

export default function Events() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return;
        
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (user.lat && user.lng) {
          setUserLocation({ lat: user.lat, lng: user.lng });
        }
      } catch (error) {
        logger.error('Failed to fetch user', { error: error.message });
      }
    };
    fetchUser();

    let cancelled = false;
    safeGetViewerLatLng(
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      { retries: 2, logKey: 'events' }
    ).then((loc) => {
      if (cancelled) return;
      if (!loc) return;
      if (!userLocation) setUserLocation({ lat: loc.lat, lng: loc.lng });
    });

    return () => {
      cancelled = true;
    };
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

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.venue_name?.toLowerCase().includes(query) ||
        e.city?.toLowerCase().includes(query)
      );
    }

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

    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.mode === typeFilter);
    }

    if (cityFilter !== 'all') {
      filtered = filtered.filter(e => e.city === cityFilter);
    }

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

  const featuredEvent = filteredEvents[0];
  const upcomingEvents = filteredEvents.slice(1);

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
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/images/hero/hero-green.jpg" 
            alt="Tonight" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20"
        >
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-4">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="text-[12vw] md:text-[8vw] font-black italic leading-[0.85] tracking-tighter mb-6">
              TONIGHT<span className="text-pink-500">.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 mb-10 max-w-xl">
              What's happening in London. Find the energy. RSVP. Go.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => setViewMode('map')}
                className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-8 py-6 text-lg"
              >
                <Map className="w-5 h-5 mr-3" />
                MAP VIEW
              </Button>
              <Link to="/pulse">
                <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-8 py-6 text-lg">
                  <Zap className="w-5 h-5 mr-3" />
                  PULSE
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. FEATURED EVENT */}
      {featuredEvent && (
        <section className="py-16 px-6 bg-black">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-pink-500 mb-6">FEATURED</p>
              
              <Link to={`/events/${encodeURIComponent(featuredEvent.id)}`}>
                <div className="group grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white/5 border border-white/10 hover:border-pink-500 rounded-2xl overflow-hidden transition-all">
                  {/* Image */}
                  <div className="relative h-64 lg:h-auto">
                    {featuredEvent.image_url ? (
                      <img 
                        src={featuredEvent.image_url} 
                        alt={featuredEvent.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <Calendar className="w-20 h-20 text-pink-500/30" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      {featuredEvent.event_date && (
                        <span className="px-3 py-1 bg-pink-500 text-black text-xs font-black uppercase rounded-full">
                          {format(fromUTC(featuredEvent.event_date), 'EEE d MMM')}
                        </span>
                      )}
                      {myRsvpIds.has(featuredEvent.id) && (
                        <span className="px-3 py-1 bg-green-500 text-black text-xs font-black uppercase rounded-full">
                          GOING
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black mb-4 group-hover:text-pink-500 transition-colors">
                      {featuredEvent.title}
                    </h2>
                    {featuredEvent.venue_name && (
                      <p className="text-lg text-white/60 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {featuredEvent.venue_name}
                      </p>
                    )}
                    <p className="text-white/50 mb-8 line-clamp-3">
                      {featuredEvent.description}
                    </p>
                    <div className="flex items-center gap-2 text-pink-500 font-black uppercase group-hover:text-white transition-colors">
                      VIEW EVENT
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* 3. FILTERS */}
      <section className="py-8 px-6 bg-black sticky top-0 z-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-4 h-4 text-pink-500" />
            <span className="text-xs uppercase tracking-wider font-bold text-pink-500">Filters</span>
            <span className="text-xs text-white/40">• {filteredEvents.length} events</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/20 text-white h-12"
              />
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                <SelectValue placeholder="When" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/20">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/20">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="crowd">Club Night</SelectItem>
                <SelectItem value="hookup">Meetup</SelectItem>
                <SelectItem value="ticket">Ticketed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/20">
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/20">
                <SelectItem value="date">By Date</SelectItem>
                <SelectItem value="popularity">Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setViewMode('map')}
              variant="outline"
              className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-black h-12 font-black uppercase"
            >
              <Map className="w-4 h-4 mr-2" />
              MAP
            </Button>
          </div>
        </div>
      </section>

      {/* 4. AI RECOMMENDATIONS (if logged in) */}
      {currentUser && (
        <section className="py-8 px-6 bg-black">
          <div className="max-w-7xl mx-auto">
            <AIEventRecommendations currentUser={currentUser} />
            <div className="mt-6">
              <NightlifeResearcher currentUser={currentUser} />
            </div>
            <PersonalizedRecommendations
              currentUser={currentUser}
              allEvents={events}
              allRsvps={allRsvps}
            />
          </div>
        </section>
      )}

      {/* 5. EVENT GRID */}
      <section className="py-16 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <h2 className="text-4xl font-black italic mb-2">ALL EVENTS</h2>
            <p className="text-white/50">{filteredEvents.length} events found</p>
          </motion.div>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, idx) => (
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
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <h3 className="text-xl font-bold mb-2">No events found</h3>
              <p className="text-white/60 mb-6">Try adjusting your filters</p>
              <Link to={createPageUrl('CreateBeacon')}>
                <Button className="bg-pink-500 text-white hover:bg-white hover:text-black font-black uppercase">
                  Create Event
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 6. B2B CTA */}
      <section className="py-20 px-6 bg-black border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black italic mb-6">
              GOT AN EVENT?
            </h2>
            <p className="text-xl text-white/60 mb-10">
              List your night. Reach London's queer scene.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={createPageUrl('CreateBeacon')}>
                <Button className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase px-10 py-6 text-lg">
                  SUBMIT EVENT
                </Button>
              </Link>
              <Link to="/for-venues">
                <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white hover:text-black font-black uppercase px-10 py-6 text-lg">
                  FOR VENUES
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
