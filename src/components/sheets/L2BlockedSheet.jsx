/**
 * L2BlockedSheet — Blocked Users list
 * Shows who you've blocked with option to unblock.
 * Reads from user_blocks (canonical) with display info from profiles table.
 */

import { useState, useEffect } from 'react';
import { Lock, Loader2, User } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function L2BlockedSheet() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Read from user_blocks (email-based, canonical table)
      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('id, blocked_email, created_at')
        .eq('blocker_email', user.email)
        .order('created_at', { ascending: false });

      if (!blocks || blocks.length === 0) {
        setBlocked([]);
        setLoading(false);
        return;
      }

      // Resolve blocked emails to display names from profiles
      const emails = blocks.map(b => b.blocked_email).filter(Boolean);
      const { data: users } = await supabase
        .from('profiles')
        .select('email, display_name, username, avatar_url')
        .in('email', emails);

      const userMap = new Map((users || []).map(u => [u.email, u]));

      setBlocked(blocks.map(b => ({
        ...b,
        profile: userMap.get(b.blocked_email) || null,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const handleUnblock = async (blockRow) => {
    setUnblocking(blockRow.id);
    try {
      // Remove from user_blocks
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockRow.id);

      if (error) throw error;

      // Also clean up profile_blocklist_users (legacy, best-effort)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profile_blocklist_users')
          .delete()
          .eq('profile_id', user.id)
          .catch(() => {});
      }

      setBlocked(prev => prev.filter(b => b.id !== blockRow.id));
      toast.success('User unblocked');
    } catch {
      toast.error('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (blocked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
        <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-white/10" />
        </div>
        <p className="text-white/60 font-bold text-sm">No blocked users</p>
        <p className="text-white/30 text-xs mt-1">Anyone you block will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <p className="text-white/30 text-xs">{blocked.length} user{blocked.length !== 1 ? 's' : ''} blocked</p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {blocked.map(b => {
          const profile = b.profile;
          return (
            <div key={b.id} className="px-4 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex-shrink-0 overflow-hidden">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover opacity-50" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white/20" />
                    </div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 font-bold text-sm truncate">
                  {profile?.username || profile?.display_name || 'Unknown User'}
                </p>
              </div>
              <button
                onClick={() => handleUnblock(b)}
                disabled={unblocking === b.id}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/8 text-white/50 text-xs font-bold hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                {unblocking === b.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : 'Unblock'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
