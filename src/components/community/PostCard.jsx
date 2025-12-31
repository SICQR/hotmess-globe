import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ExpiryBadge from './ExpiryBadge';
import { base44 } from '@/api/base44Client';

const CATEGORY_COLORS = {
  general: '#FF1493',
  events: '#00D9FF',
  marketplace: '#FFEB3B',
  beacons: '#B026FF',
  squads: '#39FF14',
  achievements: '#FF6B35',
};

export default function PostCard({ post, onLike, onComment, onShare, userHasLiked, index }) {
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0">
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
          <p className="text-white/80 break-words">{post.content}</p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6 pt-4 border-t border-white/10">
        <button
          onClick={async () => {
            await onLike(post.id);
            // Notify post author of like
            if (post.user_email !== userHasLiked) {
              await base44.entities.Notification.create({
                user_email: post.user_email,
                type: 'post_like',
                title: 'New Like',
                message: `Someone liked your post`,
                link: 'Community'
              }).catch(() => {}); // Silent fail
            }
          }}
          className={`flex items-center gap-2 text-sm transition-colors ${
            userHasLiked
              ? 'text-[#FF1493]'
              : 'text-white/60 hover:text-[#FF1493]'
          }`}
        >
          <Heart className={`w-4 h-4 ${userHasLiked ? 'fill-current' : ''}`} />
          <span>{post.likes_count || 0}</span>
        </button>
        <button
          onClick={() => onComment(post.id)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-[#00D9FF] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments_count || 0}</span>
        </button>
        <button
          onClick={() => onShare(post.id)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-[#FFEB3B] transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {post.shares_count > 0 && <span>{post.shares_count}</span>}
        </button>
      </div>
    </motion.div>
  );
}