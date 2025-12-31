import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CommentThread({ post, currentUser, onCommentCountChange }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: () => base44.entities.PostComment.filter({ post_id: post.id }, 'created_date'),
    enabled: showComments,
    refetchInterval: showComments ? 3000 : false // Real-time polling when visible
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const comment = await base44.entities.PostComment.create({
        post_id: post.id,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        content
      });

      // Update post comment count
      await base44.entities.CommunityPost.update(post.id, {
        comments_count: (post.comments_count || 0) + 1
      });

      // Notify post author
      if (post.user_email !== currentUser.email) {
        await base44.entities.Notification.create({
          user_email: post.user_email,
          type: 'post_comment',
          title: 'New Comment',
          message: `${currentUser.full_name} commented on your post`,
          link: 'Community',
          metadata: { post_id: post.id }
        });
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['post-comments', post.id]);
      queryClient.invalidateQueries(['community-posts']);
      setCommentText('');
      onCommentCountChange?.();
      toast.success('Comment added');
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      await base44.entities.PostComment.delete(commentId);
      
      // Update post comment count
      await base44.entities.CommunityPost.update(post.id, {
        comments_count: Math.max(0, (post.comments_count || 0) - 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['post-comments', post.id]);
      queryClient.invalidateQueries(['community-posts']);
      onCommentCountChange?.();
      toast.success('Comment deleted');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText);
  };

  return (
    <div>
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-2 text-sm text-white/60 hover:text-[#00D9FF] transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{post.comments_count || 0}</span>
      </button>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="mb-4">
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-black border-white/20 text-white placeholder:text-white/40"
                  maxLength={500}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">
                  No comments yet. Be the first!
                </p>
              ) : (
                comments.map((comment, idx) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#39FF14] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold">{comment.user_name?.[0] || 'U'}</span>
                        </div>
                        <span className="text-xs font-bold">{comment.user_name}</span>
                        <span className="text-xs text-white/40">
                          {format(new Date(comment.created_date), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      {(comment.user_email === currentUser.email || currentUser.role === 'admin') && (
                        <button
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          className="text-white/40 hover:text-red-500 transition-colors"
                          disabled={deleteCommentMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-white/80 pl-8">{comment.content}</p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}