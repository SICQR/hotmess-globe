import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PostCard from '../components/community/PostCard';
import TrendingSummary from '../components/community/TrendingSummary';
import PersonalizedFeed from '../components/community/PersonalizedFeed';
import PostCreator from '../components/community/PostCreator';
import { checkRateLimit } from '../components/utils/sanitize';

export default function Community() {
  const [user, setUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => base44.entities.CommunityPost.filter({ moderation_status: 'approved' }, '-created_date', 100),
    refetchInterval: 5000 // Real-time feed updates every 5 seconds
  });

  const { data: userLikes = [] } = useQuery({
    queryKey: ['user-likes', user?.email],
    queryFn: () => base44.entities.PostLike.filter({ user_email: user.email }),
    enabled: !!user,
  });



  const likeMutation = useMutation({
    mutationFn: async (postId) => {
      // Rate limit: max 10 likes per minute
      const rateCheck = checkRateLimit(`like-${user.email}`, 10, 60000);
      if (!rateCheck.allowed) {
        throw new Error('Too many likes. Please slow down.');
      }

      const existingLike = userLikes.find(l => l.post_id === postId);
      if (existingLike) {
        await base44.entities.PostLike.delete(existingLike.id);
        const post = posts.find(p => p.id === postId);
        await base44.entities.CommunityPost.update(postId, {
          likes_count: Math.max(0, (post.likes_count || 0) - 1)
        });
      } else {
        await base44.entities.PostLike.create({ user_email: user.email, post_id: postId });
        const post = posts.find(p => p.id === postId);
        await base44.entities.CommunityPost.update(postId, {
          likes_count: (post.likes_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['community-posts']);
      queryClient.invalidateQueries(['user-likes']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to like post');
    }
  });



  useEffect(() => {
    setFilteredPosts(posts);
  }, [posts]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            Community
          </h1>
          <p className="text-white/60">Connect with the HOTMESS crew</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/40 rounded-xl p-4 text-center"
          >
            <Users className="w-6 h-6 text-[#FF1493] mx-auto mb-2" />
            <div className="text-2xl font-black">2.4K</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Members</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-[#00D9FF]/20 to-[#39FF14]/20 border border-[#00D9FF]/40 rounded-xl p-4 text-center"
          >
            <Sparkles className="w-6 h-6 text-[#00D9FF] mx-auto mb-2" />
            <div className="text-2xl font-black">{posts.length}</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Total Posts</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border border-[#FFEB3B]/40 rounded-xl p-4 text-center"
          >
            <Users className="w-6 h-6 text-[#FFEB3B] mx-auto mb-2" />
            <div className="text-2xl font-black">{posts.filter(p => p.ai_sentiment === 'positive').length}</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">Positive Vibes</div>
          </motion.div>
        </div>

        {/* AI Trending Summary */}
        {posts.length >= 5 && <TrendingSummary posts={posts} />}

        {/* Trending Posts Section */}
        {posts.length >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-br from-[#FF1493]/20 to-[#FFEB3B]/20 border-2 border-[#FF1493] p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#FFEB3B]" />
              <h2 className="text-xl font-black uppercase">Trending Now</h2>
            </div>
            <div className="space-y-3">
              {posts
                .filter(p => p.moderation_status === 'approved')
                .sort((a, b) => {
                  const scoreA = (a.likes_count || 0) * 2 + (a.comments_count || 0) * 3 + (a.shares_count || 0) * 4;
                  const scoreB = (b.likes_count || 0) * 2 + (b.comments_count || 0) * 3 + (b.shares_count || 0) * 4;
                  return scoreB - scoreA;
                })
                .slice(0, 3)
                .map((post, idx) => (
                  <div key={post.id} className="flex items-start gap-3 p-3 bg-black/40 border border-white/10">
                    <span className="text-2xl font-black text-[#FFEB3B]">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm mb-1">{post.user_name}</p>
                      <p className="text-xs text-white/60 line-clamp-2">{post.content}</p>
                      <div className="flex gap-3 mt-2 text-xs text-white/40">
                        <span>❤️ {post.likes_count || 0}</span>
                        <span>💬 {post.comments_count || 0}</span>
                        <span>🔗 {post.shares_count || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Create Post */}
        {user && !showCreatePost && (
          <Button
            onClick={() => setShowCreatePost(true)}
            className="w-full mb-6 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        )}

        {showCreatePost && (
          <PostCreator
            user={user}
            onPostCreated={() => {
              setShowCreatePost(false);
              queryClient.invalidateQueries(['community-posts']);
            }}
            onCancel={() => setShowCreatePost(false)}
          />
        )}

        {/* Personalized Filtering */}
        {user && <PersonalizedFeed user={user} posts={posts} onFilterChange={setFilteredPosts} />}

        {/* Feed */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-lg mb-2">No posts yet</p>
              <p className="text-white/60 text-sm">Be the first to share something!</p>
            </div>
          ) : (
            filteredPosts.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                index={idx}
                currentUser={user}
                userHasLiked={userLikes.some(l => l.post_id === post.id)}
                onLike={(postId) => user && likeMutation.mutate(postId)}
                onShare={(postId) => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied!');
                }}
                onCommentCountChange={() => queryClient.invalidateQueries(['community-posts'])}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}