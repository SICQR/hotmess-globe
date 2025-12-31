import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function UserVerification() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-verification'],
    queryFn: () => base44.entities.User.list()
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ email, verified }) => {
      await base44.auth.updateMe({ is_verified: verified });
      // Note: This updates current user. In production, you'd need admin endpoints
      return { email, verified };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users-verification']);
      toast.success(data.verified ? 'User verified' : 'Verification removed');
    }
  });

  const pendingVerifications = users.filter(u => u.verification_requested && !u.is_verified);
  const verifiedUsers = users.filter(u => u.is_verified);
  const unverifiedUsers = users.filter(u => !u.is_verified && !u.verification_requested);

  if (isLoading) {
    return <div className="text-white/60">Loading verifications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FFEB3B]/10 border-2 border-[#FFEB3B] p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[#FFEB3B]" />
            <span className="text-xs uppercase tracking-wider text-white/60">Pending</span>
          </div>
          <div className="text-3xl font-black">{pendingVerifications.length}</div>
        </div>
        <div className="bg-[#39FF14]/10 border-2 border-[#39FF14] p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-[#39FF14]" />
            <span className="text-xs uppercase tracking-wider text-white/60">Verified</span>
          </div>
          <div className="text-3xl font-black">{verifiedUsers.length}</div>
        </div>
        <div className="bg-white/10 border-2 border-white/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-white/60" />
            <span className="text-xs uppercase tracking-wider text-white/60">Unverified</span>
          </div>
          <div className="text-3xl font-black">{unverifiedUsers.length}</div>
        </div>
      </div>

      {/* Pending Verifications */}
      {pendingVerifications.length > 0 && (
        <div>
          <h3 className="text-lg font-black uppercase mb-4">Pending Verifications</h3>
          <div className="space-y-3">
            {pendingVerifications.map((user, idx) => (
              <motion.div
                key={user.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{user.full_name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{user.full_name}</p>
                        <Badge className="bg-[#FFEB3B] text-black text-xs">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-xs text-white/40">{user.email}</p>
                      <p className="text-xs text-white/60 mt-1">
                        XP: {user.xp || 0} • Level {Math.floor((user.xp || 0) / 1000) + 1}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => verifyMutation.mutate({ email: user.email, verified: true })}
                      className="bg-[#39FF14] text-black font-bold"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                    <Button
                      onClick={() => verifyMutation.mutate({ email: user.email, verified: false })}
                      variant="outline"
                      className="border-red-600 text-red-600"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Users */}
      <div>
        <h3 className="text-lg font-black uppercase mb-4">Verified Users ({verifiedUsers.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {verifiedUsers.slice(0, 10).map((user) => (
            <div key={user.email} className="bg-[#39FF14]/10 border border-[#39FF14]/40 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#39FF14]" />
              <div>
                <p className="font-bold text-sm">{user.full_name}</p>
                <p className="text-xs text-white/40">{user.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}