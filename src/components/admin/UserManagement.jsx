import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Ban, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ email, data }) => {
      // Note: Can only update custom fields, not built-in ones except through admin APIs
      const user = users.find(u => u.email === email);
      await base44.entities.User.update(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User updated');
      setEditingUser(null);
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-black border-2 border-white p-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH USERS..."
            className="flex-1 bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">TOTAL USERS</p>
          <p className="text-4xl font-black">{users.length}</p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">ADMINS</p>
          <p className="text-4xl font-black text-[#E62020]">{users.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="bg-black border-2 border-red-600 p-6">
          <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2">BANNED</p>
          <p className="text-4xl font-black text-red-500">{users.filter(u => u.role === 'banned').length}</p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">ACTIVE TODAY</p>
          <p className="text-4xl font-black text-[#00D9FF]">
            {users.filter(u => u.activity_status && u.activity_status !== 'offline').length}
          </p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">AVG XP</p>
          <p className="text-4xl font-black text-[#FFEB3B]">
            {users.length
              ? Math.round(users.reduce((sum, u) => sum + (u.xp || 0), 0) / users.length)
              : 0}
          </p>
        </div>
      </div>

      {/* User List */}
      <div className="bg-black border-2 border-white">
        <div className="border-b-2 border-white/20 p-4 grid grid-cols-12 gap-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">
          <div className="col-span-3">USER</div>
          <div className="col-span-2">ROLE</div>
          <div className="col-span-2">XP</div>
          <div className="col-span-2">JOINED</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-1">ACTIONS</div>
        </div>
        <div className="divide-y-2 divide-white/10">
          {filteredUsers.map((user, idx) => (
            <motion.div
              key={user.email}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors"
            >
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center border-2 border-white">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm">{user.full_name?.[0] || 'U'}</span>
                  )}
                </div>
                <div>
                  <p className="font-black text-sm">{user.full_name}</p>
                  <p className="text-xs text-white/40 font-mono">{user.email}</p>
                </div>
              </div>
              <div className="col-span-2">
                <span className={`px-2 py-1 text-xs font-black uppercase border-2 ${
                  user.role === 'admin' 
                    ? 'bg-red-600/20 border-red-600 text-red-400'
                    : 'bg-white/5 border-white/20 text-white/60'
                }`}>
                  {user.role || 'user'}
                </span>
              </div>
              <div className="col-span-2">
                <p className="font-bold text-[#FFEB3B]">{user.xp || 0} XP</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-mono text-white/60">
                  {format(new Date(user.created_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="col-span-2">
                {user.activity_status && user.activity_status !== 'offline' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
                    <span className="text-xs uppercase font-bold text-[#00D9FF]">{user.activity_status}</span>
                  </div>
                ) : (
                  <span className="text-xs uppercase font-mono text-white/40">Offline</span>
                )}
              </div>
              <div className="col-span-1 flex gap-1">
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setEditingUser(user)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                  onClick={() => {
                    if (confirm(`Ban ${user.full_name}? This will set their role to 'banned' and prevent access.`)) {
                      updateUserMutation.mutate({ 
                        email: user.email, 
                        data: { role: 'banned' } 
                      });
                    }
                  }}
                >
                  <Ban className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/40 uppercase text-sm">NO USERS FOUND</p>
        </div>
      )}
    </div>
  );
}