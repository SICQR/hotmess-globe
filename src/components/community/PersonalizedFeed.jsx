import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const CATEGORIES = ['general', 'events', 'marketplace', 'beacons', 'squads', 'achievements'];

export default function PersonalizedFeed({ user, posts, onFilterChange }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [followedSellers, setFollowedSellers] = useState([]);
  const [aiFiltering, setAiFiltering] = useState(false);

  const { data: userFollows = [] } = useQuery({
    queryKey: ['user-follows', user?.email],
    queryFn: () => base44.entities.UserFollow.filter({ follower_email: user.email }),
    enabled: !!user,
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ['user-orders-filter', user?.email],
    queryFn: () => base44.entities.Order.filter({ buyer_email: user.email }),
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-filter'],
    queryFn: () => base44.entities.Product.list(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    // Get sellers user has purchased from
    const purchasedSellers = [...new Set(userOrders.map(o => o.seller_email))];
    setFollowedSellers(purchasedSellers);
  }, [userOrders, user]);

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const applyFilters = () => {
    let filtered = [...posts];

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p) => selectedCategories.includes(p.category));
    }

    // Filter by followed users
    const followedEmails = userFollows.map((f) => f.following_email);
    if (followedEmails.length > 0 && aiFiltering) {
      filtered = filtered.filter(
        (p) => followedEmails.includes(p.user_email) || followedSellers.includes(p.user_email)
      );
    }

    onFilterChange(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [selectedCategories, aiFiltering, posts]);

  return (
    <div className="flex items-center gap-3 mb-6">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="border-white/20 text-white">
            <Sliders className="w-4 h-4 mr-2" />
            Filters
            {selectedCategories.length > 0 && (
              <Badge className="ml-2 bg-[#C8962C]">{selectedCategories.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] max-w-80 bg-black border-white/20">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                      selectedCategories.includes(cat)
                        ? 'bg-[#C8962C] text-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiFiltering}
                  onChange={(e) => setAiFiltering(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  Show posts from people I follow & sellers I've purchased from
                </span>
              </label>
            </div>

            <Button
              onClick={() => {
                setSelectedCategories([]);
                setAiFiltering(false);
              }}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Clear All Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {(selectedCategories.length > 0 || aiFiltering) && (
        <span className="text-sm text-white/40">
          Showing personalized feed
        </span>
      )}
    </div>
  );
}