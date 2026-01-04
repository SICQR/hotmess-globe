import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Users, Filter, MapPin, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FiltersDrawer from '@/components/discovery/FiltersDrawer';

export default function DiscoveryGrid({ currentUser }) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['discover-users', filters],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      // Filter out current user
      return allUsers.filter(u => u.email !== currentUser?.email).slice(0, 20);
    },
    enabled: !!currentUser,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white/5 aspect-[3/4] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-white/60 uppercase tracking-wider">
          {users.length} {users.length === 1 ? 'person' : 'people'} nearby
        </p>
        <Button
          onClick={() => setShowFilters(true)}
          variant="outline"
          className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
        >
          <Filter className="w-4 h-4 mr-2" />
          FILTERS
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-2xl font-black mb-2">NO ONE NEARBY</h3>
          <p className="text-white/60 mb-6">Try adjusting your filters</p>
          <Button 
            onClick={() => setShowFilters(true)}
            className="bg-[#FF1493] hover:bg-white text-black font-black uppercase"
          >
            ADJUST FILTERS
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map((user) => (
            <Link 
              key={user.id}
              to={createPageUrl(`Profile?user=${user.email}`)}
              className="group"
            >
              <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-[#FF1493] transition-all aspect-[3/4] relative overflow-hidden">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.full_name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                    <span className="text-4xl font-black">
                      {user.full_name?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="font-black uppercase text-sm mb-1 truncate">
                    {user.full_name || 'Anonymous'}
                  </p>
                  {user.city && (
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <MapPin className="w-3 h-3" />
                      {user.city}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showFilters && (
        <FiltersDrawer
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApply={setFilters}
        />
      )}
    </>
  );
}