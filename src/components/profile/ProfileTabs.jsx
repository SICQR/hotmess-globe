/**
 * ProfileTabs - Unified tab system for profile role-based content
 * 
 * Shows different tabs based on user's profile_type:
 * - Standard: About, Activity, Gallery
 * - Creator: About, Music, Calendar, Gallery
 * - Seller: About, Store, Reviews, Gallery
 * - Host/Organizer: About, Events, Venues, Gallery
 * - DJ: About, Sets, Schedule, Gallery
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  User, Music, Calendar, Star, ShoppingBag, 
  MapPin, Zap, Image, Clock, Ticket, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductCard from '@/components/marketplace/ProductCard';
import { isXpPurchasingEnabled } from '@/lib/featureFlags';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

// Tab configs by profile type
const TAB_CONFIGS = {
  standard: [
    { id: 'about', label: 'About', icon: User },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'gallery', label: 'Gallery', icon: Image },
  ],
  creator: [
    { id: 'about', label: 'About', icon: User },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'calendar', label: 'Shows', icon: Calendar },
    { id: 'gallery', label: 'Gallery', icon: Image },
  ],
  seller: [
    { id: 'about', label: 'About', icon: User },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'gallery', label: 'Gallery', icon: Image },
  ],
  host: [
    { id: 'about', label: 'About', icon: User },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'venues', label: 'Venues', icon: MapPin },
    { id: 'gallery', label: 'Gallery', icon: Image },
  ],
  dj: [
    { id: 'about', label: 'About', icon: User },
    { id: 'sets', label: 'Sets', icon: Radio },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'gallery', label: 'Gallery', icon: Image },
  ],
};

export default function ProfileTabs({ user, photos = [], isOwnProfile = false }) {
  const profileType = user?.profile_type || 'standard';
  const tabs = TAB_CONFIGS[profileType] || TAB_CONFIGS.standard;
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const xpPurchasingEnabled = isXpPurchasingEnabled();

  // Fetch products for sellers
  const { data: products = [] } = useQuery({
    queryKey: ['profile-products', user?.email],
    queryFn: () => base44.entities.Product.filter({ seller_email: user?.email, status: 'active' }),
    enabled: !!user?.email && profileType === 'seller',
  });

  // Fetch events for hosts
  const { data: events = [] } = useQuery({
    queryKey: ['profile-events', user?.email],
    queryFn: () => base44.entities.Beacon.filter({ created_by: user?.email, mode: 'event' }),
    enabled: !!user?.email && (profileType === 'host' || profileType === 'dj'),
  });

  // Fetch music/sets for creators/DJs
  const { data: tracks = [] } = useQuery({
    queryKey: ['profile-tracks', user?.email],
    queryFn: () => base44.entities.Beacon.filter({ created_by: user?.email, mode: 'radio' }),
    enabled: !!user?.email && (profileType === 'creator' || profileType === 'dj'),
  });

  // Fetch reviews for sellers
  const { data: reviews = [] } = useQuery({
    queryKey: ['profile-reviews', user?.email],
    queryFn: () => base44.entities.Review.filter({ seller_email: user?.email }),
    enabled: !!user?.email && profileType === 'seller',
  });

  // Fetch activity/check-ins
  const { data: checkIns = [] } = useQuery({
    queryKey: ['profile-checkins', user?.email],
    queryFn: () => base44.entities.BeaconCheckIn.filter({ user_email: user?.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  // Calculate stats
  const avgRating = useMemo(() => {
    if (!reviews.length) return null;
    return (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="mt-4">
      {/* Tab bar */}
      <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap',
              activeTab === tab.id 
                ? 'text-[#FF1493] border-b-2 border-[#FF1493]'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {/* Show count badges */}
            {tab.id === 'store' && products.length > 0 && (
              <span className="px-1.5 py-0.5 bg-[#FF1493]/20 rounded-full text-[10px]">{products.length}</span>
            )}
            {tab.id === 'events' && events.length > 0 && (
              <span className="px-1.5 py-0.5 bg-[#B026FF]/20 rounded-full text-[10px]">{events.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="py-4"
      >
        {/* About Tab */}
        {activeTab === 'about' && (
          <AboutTab user={user} />
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <ActivityTab checkIns={checkIns} />
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <GalleryTab photos={photos} />
        )}

        {/* Store Tab (Sellers) */}
        {activeTab === 'store' && (
          <StoreTab products={products} xpEnabled={xpPurchasingEnabled} />
        )}

        {/* Reviews Tab (Sellers) */}
        {activeTab === 'reviews' && (
          <ReviewsTab reviews={reviews} avgRating={avgRating} />
        )}

        {/* Music Tab (Creators) */}
        {activeTab === 'music' && (
          <MusicTab tracks={tracks} />
        )}

        {/* Sets Tab (DJs) */}
        {activeTab === 'sets' && (
          <MusicTab tracks={tracks} label="Sets" />
        )}

        {/* Events Tab (Hosts) */}
        {activeTab === 'events' && (
          <EventsTab events={events} />
        )}

        {/* Schedule Tab (DJs/Hosts) */}
        {activeTab === 'schedule' && (
          <EventsTab events={events} label="Upcoming Shows" />
        )}

        {/* Calendar Tab (Creators) */}
        {activeTab === 'calendar' && (
          <EventsTab events={events} label="Shows" />
        )}

        {/* Venues Tab (Hosts) */}
        {activeTab === 'venues' && (
          <VenuesTab events={events} />
        )}
      </motion.div>
    </div>
  );
}

// Tab components
function AboutTab({ user }) {
  const bio = user?.bio || user?.description || 'No bio yet';
  const interests = user?.interests || user?.event_preferences || [];
  const musicTaste = user?.music_taste || user?.musicTags || [];
  const lookingFor = user?.looking_for || [];

  return (
    <div className="space-y-6 px-4">
      {/* Bio */}
      <div>
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Bio</h3>
        <p className="text-white/80 text-sm leading-relaxed">{bio}</p>
      </div>

      {/* Music */}
      {musicTaste.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Music</h3>
          <div className="flex flex-wrap gap-2">
            {musicTaste.map((tag, i) => (
              <span key={i} className="px-3 py-1.5 text-xs font-bold uppercase bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/30 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((tag, i) => (
              <span key={i} className="px-3 py-1.5 text-xs font-bold uppercase bg-[#FF1493]/10 text-[#FF1493] border border-[#FF1493]/30 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Looking for */}
      {lookingFor.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Looking For</h3>
          <div className="flex flex-wrap gap-2">
            {lookingFor.map((tag, i) => (
              <span key={i} className="px-3 py-1.5 text-xs font-bold uppercase bg-[#00D9FF]/10 text-[#00D9FF] border border-[#00D9FF]/30 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {user?.height && (
          <div className="p-3 bg-white/5 rounded-xl text-center">
            <p className="text-lg font-black text-white">{user.height}</p>
            <p className="text-[10px] text-white/40 uppercase">Height</p>
          </div>
        )}
        {user?.job && (
          <div className="p-3 bg-white/5 rounded-xl text-center col-span-2">
            <p className="text-lg font-black text-white truncate">{user.job}</p>
            <p className="text-[10px] text-white/40 uppercase">Work</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ checkIns }) {
  if (!checkIns.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {checkIns.slice(0, 10).map((checkIn) => (
        <div key={checkIn.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          <MapPin className="w-5 h-5 text-[#FF1493]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{checkIn.venue_name || 'Unknown venue'}</p>
            <p className="text-xs text-white/40">{format(new Date(checkIn.created_date), 'MMM d, h:mm a')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GalleryTab({ photos }) {
  if (!photos.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <Image className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 px-1">
      {photos.map((url, i) => (
        <div key={i} className="aspect-square">
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function StoreTab({ products, xpEnabled }) {
  if (!products.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No products listed</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} showXp={xpEnabled} />
      ))}
    </div>
  );
}

function ReviewsTab({ reviews, avgRating }) {
  if (!reviews.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Average rating */}
      {avgRating && (
        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
          <div className="text-3xl font-black text-[#FFD700]">{avgRating}</div>
          <div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className="w-4 h-4" 
                  fill={star <= Math.round(avgRating) ? '#FFD700' : 'transparent'}
                  stroke={star <= Math.round(avgRating) ? '#FFD700' : '#666'}
                />
              ))}
            </div>
            <p className="text-xs text-white/40 mt-1">{reviews.length} reviews</p>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.slice(0, 5).map((review) => (
        <div key={review.id} className="p-4 bg-white/5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className="w-3 h-3" 
                  fill={star <= (review.rating || 0) ? '#FFD700' : 'transparent'}
                  stroke={star <= (review.rating || 0) ? '#FFD700' : '#666'}
                />
              ))}
            </div>
            <span className="text-xs text-white/40">
              {format(new Date(review.created_date), 'MMM d, yyyy')}
            </span>
          </div>
          <p className="text-sm text-white/80">{review.comment || 'No comment'}</p>
        </div>
      ))}
    </div>
  );
}

function MusicTab({ tracks, label = 'Tracks' }) {
  if (!tracks.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No {label.toLowerCase()} yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {tracks.map((track) => (
        <div key={track.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          {track.image_url ? (
            <img src={track.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{track.title || 'Untitled'}</p>
            <p className="text-xs text-white/40">{track.description || label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventsTab({ events, label = 'Events' }) {
  const upcomingEvents = events.filter(e => new Date(e.starts_at) > new Date());

  if (!upcomingEvents.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No upcoming {label.toLowerCase()}</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {upcomingEvents.map((event) => (
        <Link key={event.id} to={`/events/${event.id}`} className="block">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            {event.image_url ? (
              <img src={event.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#B026FF] to-[#00D9FF] flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{event.title || 'Untitled Event'}</p>
              <p className="text-xs text-[#FF1493]">{format(new Date(event.starts_at), 'MMM d, h:mm a')}</p>
              <p className="text-xs text-white/40 truncate">{event.location_name || event.venue}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function VenuesTab({ events }) {
  // Extract unique venues from events
  const venues = useMemo(() => {
    const venueMap = new Map();
    events.forEach(e => {
      if (e.location_name || e.venue) {
        const name = e.location_name || e.venue;
        if (!venueMap.has(name)) {
          venueMap.set(name, {
            name,
            address: e.location_address,
            lat: e.geo_lat,
            lng: e.geo_lng,
            image: e.image_url,
          });
        }
      }
    });
    return Array.from(venueMap.values());
  }, [events]);

  if (!venues.length) {
    return (
      <div className="px-4 py-8 text-center text-white/40">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No venues yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {venues.map((venue, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{venue.name}</p>
            {venue.address && (
              <p className="text-xs text-white/40 truncate">{venue.address}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
