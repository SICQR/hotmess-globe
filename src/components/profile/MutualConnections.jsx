import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function MutualConnections({ profileUserEmail, currentUserEmail }) {
  const { data: currentUserFollowing = [] } = useQuery({
    queryKey: ['following', currentUserEmail],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: currentUserEmail }),
    enabled: !!currentUserEmail
  });

  const { data: profileUserFollowing = [] } = useQuery({
    queryKey: ['following', profileUserEmail],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: profileUserEmail }),
    enabled: !!profileUserEmail
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Find mutual follows
  const currentFollowEmails = new Set(currentUserFollowing.map(f => f.following_email));
  const mutualEmails = profileUserFollowing
    .map(f => f.following_email)
    .filter(email => currentFollowEmails.has(email) && email !== currentUserEmail);

  const mutualUsers = allUsers.filter(u => mutualEmails.includes(u.email));

  if (mutualUsers.length === 0) return null;

  return (
    <div className="bg-black border-2 border-white/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#00D9FF]" />
        <h3 className="text-xs uppercase tracking-widest text-white/60 font-black">
          {mutualUsers.length} Mutual Connection{mutualUsers.length !== 1 ? 's' : ''}
        </h3>
      </div>
      <div className="flex -space-x-2 overflow-hidden">
        {mutualUsers.slice(0, 5).map((user) => (
          <Link 
            key={user.email} 
            to={createPageUrl(`Profile?email=${user.email}`)}
            className="inline-block"
          >
            <div 
              className="w-10 h-10 border-2 border-black bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center overflow-hidden hover:z-10 transition-transform hover:scale-110"
              title={user.full_name}
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold">{user.full_name?.[0]}</span>
              )}
            </div>
          </Link>
        ))}
        {mutualUsers.length > 5 && (
          <div className="w-10 h-10 border-2 border-black bg-white/10 flex items-center justify-center">
            <span className="text-xs font-bold">+{mutualUsers.length - 5}</span>
          </div>
        )}
      </div>
    </div>
  );
}