/**
 * L2CommunityPostSheet — Community feed + post creation
 *
 * Displays approved community posts and lets authenticated users post.
 * DB: community_posts (user_email, user_name, content, category, like_count, comment_count)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, X, Loader2, Flame, Send, Image } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const CATEGORIES = ['All', 'Scene', 'Events', 'Music', 'Fashion', 'Wellness', 'Chat'];
const POST_CATEGORIES = ['Scene', 'Events', 'Music', 'Fashion', 'Wellness', 'Chat'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function PostCard({ post, onLike, liking }) {
  return (
    <div className="bg-[#1C1C1E] rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[#C8962C] font-black text-xs">
            {(post.user_name || 'A')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{post.user_name || 'Anonymous'}</p>
          <p className="text-white/30 text-xs">{timeAgo(post.created_at)}</p>
        </div>
        {post.category && (
          <span className="px-2 py-0.5 bg-white/5 rounded-full text-white/40 text-xs font-bold">
            {post.category}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-white/90 text-sm leading-relaxed mb-3">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <div className="rounded-xl overflow-hidden mb-3 aspect-video">
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1 border-t border-white/5">
        <button
          onClick={() => onLike(post.id)}
          disabled={liking === post.id}
          className="flex items-center gap-1.5 text-white/40 hover:text-[#C8962C] transition-colors"
        >
          {liking === post.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Heart className="w-4 h-4" />}
          <span className="text-xs font-bold">{post.like_count || 0}</span>
        </button>
        <div className="flex items-center gap-1.5 text-white/30">
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-bold">{post.comment_count || 0}</span>
        </div>
        {post.ai_sentiment === 'positive' && (
          <div className="flex items-center gap-1 text-amber-400/60">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs">Hot</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function L2CommunityPostSheet() {
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ content: '', category: 'Scene' });
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  useEffect(() => {
    loadPosts(true);
  }, [category]);

  const loadPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPosts([]);
    } else {
      setLoadingMore(true);
    }

    let query = supabase
      .from('community_posts')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (category !== 'All') query = query.eq('category', category);
    if (!reset) query = query.range(posts.length, posts.length + PAGE_SIZE - 1);

    const { data, error: fetchError } = await query;

    if (!fetchError && data) {
      if (reset) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [category, posts.length]);

  async function handlePost(e) {
    e.preventDefault();
    setError('');
    if (!form.content.trim()) { setError('Write something first.'); return; }
    if (!currentUser) { setError('You need to sign in to post.'); return; }

    setPosting(true);
    const { error: insertErr } = await supabase
      .from('community_posts')
      .insert({
        user_email: currentUser.email,
        user_name: currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0],
        content: form.content.trim(),
        category: form.category,
      });

    setPosting(false);

    if (insertErr) { setError('Could not post. Please try again.'); return; }

    setForm({ content: '', category: 'Scene' });
    setShowCreate(false);
    loadPosts(true);
  }

  async function handleLike(postId) {
    setLiking(postId);
    await supabase.rpc('increment_post_likes', { p_post_id: postId }).catch(() => null);
    setPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p)
    );
    setLiking(null);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Hero */}
      <div className="px-4 pt-4 pb-3">
        <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div>
            <p className="text-[#C8962C] font-black text-sm">Community</p>
            <p className="text-white/60 text-xs mt-0.5">The scene, in your pocket.</p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-colors ${
                category === c
                  ? 'bg-[#C8962C] text-black'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Create post input (collapsed trigger) */}
      <AnimatePresence>
        {!showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-3"
          >
            <button
              onClick={() => currentUser && setShowCreate(true)}
              className="w-full bg-[#1C1C1E] rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#C8962C] font-black text-xs">
                  {currentUser ? (currentUser.email?.[0] || '?').toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-white/30 text-sm flex-1">
                {currentUser ? "What's happening on the scene?" : 'Sign in to post...'}
              </span>
              <Image className="w-4 h-4 text-white/20" />
            </button>
          </motion.div>
        )}

        {/* Create form */}
        {showCreate && (
          <motion.form
            key="create"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handlePost}
            className="mx-4 mb-3 bg-[#1C1C1E] rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/30 font-black">New Post</p>
              <button type="button" onClick={() => { setShowCreate(false); setError(''); }}>
                <X className="w-4 h-4 text-white/30 hover:text-white/60" />
              </button>
            </div>

            <textarea
              placeholder="What's happening on the scene?"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50 resize-none"
              autoFocus
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {POST_CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: c }))}
                  className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap transition-colors flex-shrink-0 ${
                    form.category === c ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(''); }}
                className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={posting || !form.content.trim()}
                className="flex-1 py-3 bg-[#C8962C] rounded-xl text-black font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Feed */}
      <div className="px-4 pb-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="bg-[#1C1C1E] rounded-2xl p-8 flex flex-col items-center text-center">
            <MessageSquare className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-white/50 font-bold text-sm">No posts yet</p>
            <p className="text-white/30 text-xs mt-1">
              {category !== 'All' ? `Nothing in ${category} yet.` : 'Be the first to post.'}
            </p>
          </div>
        )}

        {posts.map(post => (
          <PostCard key={post.id} post={post} onLike={handleLike} liking={liking} />
        ))}

        {/* Load more */}
        {!loading && hasMore && posts.length > 0 && (
          <button
            onClick={() => loadPosts(false)}
            disabled={loadingMore}
            className="w-full py-3 bg-white/5 rounded-2xl text-white/50 font-bold text-sm flex items-center justify-center gap-2"
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}
