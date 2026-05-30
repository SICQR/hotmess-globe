/**
 * Admin verification queue.
 *
 * Backed by public.profile_verifications:
 *   pending   -> awaiting admin review (this queue)
 *   approved  -> profiles.is_verified flipped true on approval
 *   rejected  -> rejection_reason shown to user, can resubmit
 *
 * RLS lets only admins SELECT all + UPDATE here (see migration
 * 20260507000005_verification_flow).
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function UserVerification() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_verifications')
        .select(`
          id, user_id, type, status, selfie_url, pose_challenge,
          submitted_at, reviewed_at, reviewed_by, rejection_reason,
          profile:profiles!profile_verifications_user_id_fkey (
            id, display_name, full_name, avatar_url, is_verified, is_demo
          )
        `)
        .order('submitted_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, userId, decision, reason }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates = {
        status:           decision,
        reviewed_by:      user.id,
        reviewed_at:      new Date().toISOString(),
        rejection_reason: decision === 'rejected' ? (reason || null) : null,
      };
      const { error: vErr } = await supabase
        .from('profile_verifications')
        .update(updates)
        .eq('id', id);
      if (vErr) throw vErr;

      if (decision === 'approved') {
        const { error: pErr } = await supabase
          .from('profiles')
          .update({
            is_verified:        true,
            verification_level: 'basic',
            verified_at:        new Date().toISOString(),
          })
          .eq('id', userId);
        if (pErr) throw pErr;
      }
      return { decision };
    },
    onSuccess: ({ decision }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      toast.success(decision === 'approved' ? 'User verified' : 'Verification rejected');
      setRejectingId(null);
      setRejectReason('');
    },
    onError: (err) => {
      toast.error(err.message || 'Update failed');
    },
  });

  const pending  = rows.filter((r) => r.status === 'pending' && !r.profile?.is_demo);
  const approved = rows.filter((r) => r.status === 'approved');
  const rejected = rows.filter((r) => r.status === 'rejected');

  if (isLoading) {
    return <div className="text-white/60">Loading verification queue…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={Clock}       color="#FFEB3B" label="Pending"  value={pending.length}  />
        <Stat icon={CheckCircle} color="#39FF14" label="Approved" value={approved.length} />
        <Stat icon={XCircle}     color="#FF3B30" label="Rejected" value={rejected.length} />
      </div>

      {/* Pending */}
      <div>
        <h3 className="text-lg font-black uppercase mb-4">Pending Review</h3>
        {pending.length === 0 && (
          <p className="text-white/40 text-sm">Inbox zero. No pending submissions.</p>
        )}
        <div className="space-y-3">
          {pending.map((row, idx) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Submitted selfie */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                    {row.selfie_url ? (
                      <img src={row.selfie_url} alt="Submitted selfie" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
                        No selfie
                      </div>
                    )}
                  </div>

                  {/* User profile photo */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#C8962C]/20 to-black flex-shrink-0 border border-white/10">
                    {row.profile?.avatar_url ? (
                      <img src={row.profile.avatar_url} alt="Profile photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold truncate">
                        {row.profile?.full_name || row.profile?.display_name || 'Unknown user'}
                      </p>
                      <Badge className="bg-[#FFEB3B] text-black text-xs">Pending</Badge>
                    </div>
                    <p className="text-xs text-white/40">Submitted {timeAgo(row.submitted_at)}</p>
                    {row.pose_challenge && (
                      <p className="text-xs text-white/60 mt-1">
                        Pose: <span className="text-white/80">{row.pose_challenge.replace(/_/g, ' ')}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    onClick={() => reviewMutation.mutate({ id: row.id, userId: row.user_id, decision: 'approved' })}
                    disabled={reviewMutation.isPending}
                    className="bg-[#39FF14] text-black font-bold"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setRejectingId(row.id)}
                    variant="outline"
                    className="border-red-600 text-red-600"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>

              {rejectingId === row.id && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50">Reason (shown to user)</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Selfie does not match profile photos"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-red-500/50"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => reviewMutation.mutate({
                        id: row.id, userId: row.user_id, decision: 'rejected', reason: rejectReason.trim(),
                      })}
                      disabled={!rejectReason.trim() || reviewMutation.isPending}
                      className="bg-red-600 text-white font-bold"
                    >
                      Confirm Rejection
                    </Button>
                    <Button
                      onClick={() => { setRejectingId(null); setRejectReason(''); }}
                      variant="outline"
                      className="border-white/20 text-white/70"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recently approved (last 10) */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-lg font-black uppercase mb-4">
            Recently Approved <span className="text-white/40">({approved.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {approved.slice(0, 10).map((row) => (
              <div
                key={row.id}
                className="bg-[#39FF14]/10 border border-[#39FF14]/40 rounded-xl p-3 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 text-[#39FF14] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">
                    {row.profile?.full_name || row.profile?.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-white/40">
                    Reviewed {timeAgo(row.reviewed_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value }) {
  return (
    <div
      className="border-2 p-6"
      style={{ background: `${color}10`, borderColor: color }}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-xs uppercase tracking-wider text-white/60">{label}</span>
      </div>
      <div className="text-3xl font-black">{value}</div>
    </div>
  );
}
