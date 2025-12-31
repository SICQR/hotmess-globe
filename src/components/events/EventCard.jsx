import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Calendar, MapPin, Users, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { formatUTCDate } from '../utils/dateUtils';
import OSCard, { OSCardImage, OSCardBadge } from '../ui/OSCard';

export default function EventCard({ event, isRsvpd, attendeeCount, delay = 0, recommendationScore }) {
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const isPast = eventDate && eventDate < new Date();

  const MODE_COLORS = {
    crowd: '#FF1493',
    hookup: '#FF073A',
    drop: '#FF6B35',
    ticket: '#B026FF',
    radio: '#00D9FF'
  };

  const color = MODE_COLORS[event.mode] || '#FF1493';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group relative"
    >
      {recommendationScore && recommendationScore > 40 && (
        <div className="absolute -top-2 -right-2 z-10 bg-[#FF1493] border-2 border-white px-2 py-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span className="text-[10px] font-black uppercase">Top Match</span>
        </div>
      )}
      <Link to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
        <OSCard className={isPast ? 'opacity-60' : ''}>
          {/* Editorial Image */}
          {event.image_url && (
            <div className="relative h-48">
              <OSCardImage 
                src={event.image_url} 
                alt={event.title}
                grayscale={!isPast}
                className="group-hover:scale-110 transition-transform duration-500"
              />
              {isPast && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white/80 font-bold uppercase text-sm">Past Event</span>
                </div>
              )}
              {isRsvpd && !isPast && (
                <div className="absolute top-3 right-3 bg-[#00D9FF] text-black px-3 py-1 text-xs font-black uppercase">
                  GOING
                </div>
              )}
            </div>
          )}

          <div className="p-5">
            {/* Mode Badge */}
            <OSCardBadge color={color}>
              {event.mode || 'EVENT'}
            </OSCardBadge>

            {/* Title */}
            <h3 className="text-xl font-black mb-2 line-clamp-2 group-hover:text-[#FF1493] transition-colors">
              {event.title}
            </h3>

            {/* Description */}
            {event.description && (
              <p className="text-sm text-white/60 mb-4 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Event Details */}
            <div className="space-y-2 text-sm">
              {event.event_date && (
                <div className="flex items-center gap-2 text-white/80">
                  <Calendar className="w-4 h-4 text-[#FF1493]" />
                  <span>{formatUTCDate(event.event_date, 'EEE, MMM d • h:mm a')}</span>
                </div>
              )}

              {event.venue_name && (
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="w-4 h-4 text-[#FF1493]" />
                  <span className="line-clamp-1">{event.venue_name}</span>
                </div>
              )}

              {event.city && (
                <div className="flex items-center gap-2 text-white/60 text-xs">
                  <span>{event.city}</span>
                </div>
              )}

              {attendeeCount > 0 && (
                <div className="flex items-center gap-2 text-white/60">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">{attendeeCount} going</span>
                </div>
              )}
            </div>

            {/* Capacity Warning */}
            {event.capacity && attendeeCount >= event.capacity && !isPast && (
              <div className="mt-4 text-xs text-[#FF6B35] font-bold uppercase">
                ⚠ At Capacity
              </div>
            )}

            {/* External Ticket Link */}
            {event.ticket_url && (
              <a 
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-4 flex items-center gap-2 text-xs text-[#00D9FF] hover:text-white transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Get Tickets
              </a>
            )}
          </div>
        </OSCard>
      </Link>
    </motion.div>
  );
}