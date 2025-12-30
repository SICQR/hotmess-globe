import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

export default function CommentsSection({ beaconId }) {
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
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

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', beaconId],
    queryFn: () => base44.entities.BeaconComment.filter({ beacon_id: beaconId }, '-created_date')
  });

  const createCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.BeaconComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', beaconId]);
      setComment('');
      setRating(5);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;

    createCommentMutation.mutate({
      beacon_id: beaconId,
      user_email: user.email,
      user_name: user.full_name,
      content: comment,
      rating
    });
  };

  const avgRating = comments.length > 0 
    ? (comments.reduce((sum, c) => sum + (c.rating || 5), 0) / comments.length).toFixed(1)
    : 'N/A';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-[#00D9FF]" />
          <h2 className="text-xl font-bold uppercase tracking-wider">Reviews</h2>
        </div>
        {comments.length > 0 && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#FFEB3B] fill-[#FFEB3B]" />
            <span className="font-bold">{avgRating}</span>
            <span className="text-sm text-white/40">({comments.length})</span>
          </div>
        )}
      </div>

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="mb-6 pb-6 border-b border-white/10">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-white/60">Your Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${star <= rating ? 'text-[#FFEB3B] fill-[#FFEB3B]' : 'text-white/20'}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="bg-black border-white/20 text-white"
            />
          </div>
          <Button
            type="submit"
            disabled={!comment.trim() || createCommentMutation.isPending}
            className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black"
          >
            {createCommentMutation.isPending ? 'Posting...' : 'Post Review'}
          </Button>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((c, idx) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/5 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center text-sm font-bold">
                  {c.user_name?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-bold text-sm">{c.user_name}</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: c.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-[#FFEB3B] fill-[#FFEB3B]" />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs text-white/40">
                {format(new Date(c.created_date), 'MMM d')}
              </span>
            </div>
            <p className="text-sm text-white/80">{c.content}</p>
          </motion.div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-8 text-white/40">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No reviews yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}