import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, User, MapPin, ShoppingBag, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isOpen
  });

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.list(),
    enabled: isOpen
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: isOpen
  });

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const filteredBeacons = beacons.filter(b => 
    b.title?.toLowerCase().includes(query.toLowerCase()) ||
    b.city?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.description?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const hasResults = filteredUsers.length > 0 || filteredBeacons.length > 0 || filteredProducts.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-white text-white max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-[#FF1493]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, events, products..."
            className="bg-white/5 border-white/20 text-white text-lg"
            autoFocus
          />
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {!query && (
            <p className="text-center text-white/40 py-8">Start typing to search...</p>
          )}

          {query && !hasResults && (
            <p className="text-center text-white/40 py-8">No results found</p>
          )}

          {filteredUsers.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">People</h3>
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <Link
                    key={user.email}
                    to={createPageUrl(`Profile?email=${user.email}`)}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <User className="w-5 h-5 text-[#FF1493]" />
                    <div>
                      <div className="font-bold">{user.full_name}</div>
                      <div className="text-xs text-white/60">{user.email}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredBeacons.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Events</h3>
              <div className="space-y-2">
                {filteredBeacons.map(beacon => (
                  <Link
                    key={beacon.id}
                    to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}
                    onClick={() => {
                      saveRecentSearch(searchQuery);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <MapPin className="w-5 h-5 text-[#00D9FF]" />
                    <div>
                      <div className="font-bold">{beacon.title}</div>
                      <div className="text-xs text-white/60">{beacon.city}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Products</h3>
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <Link
                    key={product.id}
                    to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    onClick={() => {
                      saveRecentSearch(searchQuery);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <ShoppingBag className="w-5 h-5 text-[#39FF14]" />
                    <div>
                      <div className="font-bold">{product.name}</div>
                      <div className="text-xs text-white/60">{product.price_xp} XP</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}