import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Share2, AlertTriangle, BarChart3, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import ExpiryBadge from './ExpiryBadge';
import { base44 } from '@/api/base44Client';
import CommentThread from './CommentThread';
import { toast } from 'sonner';
import ReportButton from '../moderation/ReportButton';

function PollDisplay({ post, currentUser }) {
  const [voting, setVoting] = useState(false);
  const poll = post.metadata?.poll;
  
  if (!poll) return null;

  const isPollExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const userVote = poll.votes?.[currentUser?.email];
  const totalVotes = Object.keys(poll.votes || {}).length;

  const handleVote = async (option) => {
    if (!currentUser || voting || userVote || isPollExpired) return;
    
    setVoting(true);
    try {
      const updatedVotes = {
        ...poll.votes,
        [currentUser.email]: option
      };

      await base44.entities.CommunityPost.update(post.id, {
        metadata: {
          ...post.metadata,
          poll: {
            ...poll,
            votes: updatedVotes
          }
        }
      });

      toast.success('Vote recorded!');
    } catch (error) {
      toast.error('Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-[#00D9FF]" />
        <span className="text-xs font-bold uppercase text-[#00D9FF]">Poll</span>
        {isPollExpired && (
          <span className="text-xs text-white/40 uppercase">• Ended</span>
        )}
      </div>

      {poll.options.map((option, idx) => {
        const votes = Object.values(poll.votes || {}).filter(v => v === option).length;
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const isSelected = userVote === option;

        return (
          <button
            key={idx}
            onClick={() => handleVote(option)}
            disabled={!!userVote || isPollExpired || !currentUser || voting}
            className={`w-full p-3 border-2 transition-all relative overflow-hidden ${
              isSelected
                ? 'bg-[#00D9FF]/20 border-[#00D9FF]'
                : userVote || isPollExpired
                ? 'bg-white/5 border-white/20 cursor-default'
                : 'bg-white/5 border-white/20 hover:border-white hover:bg-white/10 cursor-pointer'
            }`}
          >
            <div
              className="absolute inset-0 bg-[#00D9FF]/10 transition-all"
              style={{ width: `${userVote || isPollExpired ? percentage : 0}%` }}
            />
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-medium">{option}</span>
              {(userVote || isPollExpired) && (
                <span className="text-xs font-bold text-white/60">
                  {percentage}% ({votes})
                </span>
              )}
            </div>
          </button>
        );
      })}

      <p className="text-xs text-white/40 mt-2">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        {poll.expires_at && !isPollExpired && (
          <> • Ends {format(new Date(poll.expires_at), 'MMM d')}</>
        )}
      </p>
    </div>
  );
}

function EventDisplay({ post, currentUser }) {
  const event = post.metadata?.event;
  const [creatingBeacon, setCreatingBeacon] = React.useState(false);
  
  if (!event) return null;

  const handleCreateBeacon = async () => {
    if (!currentUser || !event.location) return;
    
    setCreatingBeacon(true);
    try {
      // Try to geocode location (simplified - in production use Google Maps API)
      const beacon = await base44.entities.Beacon.create({
        title: event.title,
        description: post.content,
        kind: 'event',
        lat: 51.5074, // Default to London - should geocode event.location
        lng: -0.1278,
        city: event.location,
        event_date: event.date + (event.time ? `T${event.time}` : 'T19:00:00'),
        venue_name: event.location,
        ticket_url: event.ticket_url,
        active: true
      });
      
      toast.success('Event beacon created!');
      
      // Link beacon to post
      await base44.entities.CommunityPost.update(post.id, {
        metadata: {
          ...post.metadata,
          event: {
            ...event,
            beacon_id: beacon.id
          }
        }
      });
    } catch (error) {
      toast.error('Failed to create beacon');
    } finally {
      setCreatingBeacon(false);
    }
  };

  return (
    <div className="mt-4 bg-[#FFEB3B]/10 border-2 border-[#FFEB3B]/40 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-[#FFEB3B]" />
        <h3 className="font-black uppercase text-[#FFEB3B]">{event.title}</h3>
      </div>
      <div className="space-y-2 text-sm">
        {event.date && (
          <div className="flex items-center gap-2 text-white/80">
            <Calendar className="w-4 h-4 text-white/60" />
            <span>
              {format(new Date(event.date), 'MMMM d, yyyy')}
              {event.time && ` at ${event.time}`}
            </span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2 text-white/80">
            <MapPin className="w-4 h-4 text-white/60" />
            <span>{event.location}</span>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          {event.ticket_url && (
            <a
              href={event.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFEB3B] hover:bg-[#FFEB3B]/90 text-black font-bold rounded-lg transition-colors"
            >
              Get Tickets
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {!event.beacon_id && currentUser && (
            <button
              onClick={handleCreateBeacon}
              disabled={creatingBeacon}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              <MapPin className="w-4 h-4" />
              {creatingBeacon ? 'Creating...' : 'Add to Globe'}
            </button>
          )}
          {event.beacon_id && (
            <Link
              to={createPageUrl(`BeaconDetail?id=${event.beacon_id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 border border-[#00D9FF] text-[#00D9FF] font-bold rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4" />
              View on Globe
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const CATEGORY_COLORS = {
  general: '#E62020',
  events: '#00D9FF',
  marketplace: '#FFEB3B',
  beacons: '#B026FF',
  squads: '#39FF14',
  achievements: '#FF6B35',
};

export default function PostCard({ post, onLike, onComment, onShare, userHasLiked, index, currentUser, onCommentCountChange }) {
  const isFlagged = post.moderation_status === 'flagged';
  const isRemoved = post.moderation_status === 'removed';
  const isExpired = post.expires_at && new Date(post.expires_at) < new Date();

  if (isRemoved || isExpired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white/5 border rounded-xl p-6 ${
        isFlagged ? 'border-red-500/50' : 'border-white/10'
      }`}
    >
      {isFlagged && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-400">
            Flagged: {post.moderation_reason || 'Under review'}
          </span>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center flex-shrink-0">
          <span className="font-bold">{post.user_name?.[0] || 'U'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{post.user_name}</span>
              {post.category && post.category !== 'general' && (
                <Badge
                  style={{
                    backgroundColor: CATEGORY_COLORS[post.category] + '30',
                    color: CATEGORY_COLORS[post.category],
                    borderColor: CATEGORY_COLORS[post.category] + '60',
                  }}
                  className="border"
                >
                  {post.category}
                </Badge>
              )}
              {post.expires_at && <ExpiryBadge expiresAt={post.expires_at} />}
            </div>
            <span className="text-xs text-white/40">
              {format(new Date(post.created_date), 'MMM d, h:mm a')}
            </span>
          </div>
          <p className="text-white/80 break-words whitespace-pre-wrap">{post.content}</p>

          {/* Media */}
          {post.image_url && (
            <div className="mt-3 border-2 border-white/10 rounded-lg overflow-hidden">
              <img src={post.image_url} alt="Post" className="w-full max-h-96 object-cover" />
            </div>
          )}
          {post.video_url && (
            <div className="mt-3 border-2 border-white/10 rounded-lg overflow-hidden">
              <video src={post.video_url} controls className="w-full max-h-96" />
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-[#E62020]/20 border border-[#E62020]/40 text-[#E62020]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Poll Display */}
          {post.metadata?.poll && (
            <PollDisplay post={post} currentUser={currentUser} />
          )}

          {/* Event Display */}
          {post.metadata?.event && (
            <EventDisplay post={post} currentUser={currentUser} />
          )}
        </div>
      </div>
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-6 mb-4 flex-wrap">
          <button
            onClick={async () => {
              await onLike(post.id);
              // Notify post author of like
              if (post.user_email !== currentUser?.email) {
                await base44.entities.Notification.create({
                  user_email: post.user_email,
                  type: 'post_like',
                  title: 'New Like',
                  message: `${currentUser?.full_name || 'Someone'} liked your post`,
                  link: 'Community'
                }).catch(() => {}); // Silent fail
              }
            }}
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${
              userHasLiked
                ? 'text-[#E62020]'
                : 'text-white/60 hover:text-[#E62020]'
            }`}
          >
            <Heart className={`w-5 h-5 ${userHasLiked ? 'fill-current' : ''}`} />
            <span>{post.likes_count || 0}</span>
          </button>

          {currentUser && (
            <CommentThread 
              post={post} 
              currentUser={currentUser}
              onCommentCountChange={onCommentCountChange}
            />
          )}

          <button
            onClick={() => onShare(post.id)}
            className="flex items-center gap-2 text-sm font-bold text-white/60 hover:text-[#FFEB3B] transition-colors"
          >
            <Share2 className="w-5 h-5" />
            {post.shares_count > 0 && <span>{post.shares_count}</span>}
          </button>

          <div className="ml-auto">
            <ReportButton itemType="post" itemId={post.id} variant="ghost" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}