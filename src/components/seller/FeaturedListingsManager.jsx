import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Star, TrendingUp, Eye, MousePointer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FeaturedListingsManager({ products, sellerEmail }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [duration, setDuration] = useState('24');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-featured'],
    queryFn: () => base44.auth.me(),
    enabled: !!sellerEmail,
  });

  const { data: featuredListings = [] } = useQuery({
    queryKey: ['featured-listings', sellerEmail],
    queryFn: () => base44.entities.FeaturedListing.filter({ seller_email: sellerEmail }, '-created_date'),
    enabled: !!sellerEmail
  });

  const activeProducts = products.filter(p => p.status === 'active');
  
  const pricingTiers = {
    '24': { hours: 24, cost: 500, label: '24 hours' },
    '72': { hours: 72, cost: 1200, label: '3 days' },
    '168': { hours: 168, cost: 2000, label: '1 week' }
  };

  const selectedTier = pricingTiers[duration];

  const featureMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        throw new Error('Select a product');
      }

      if (currentUser.xp < selectedTier.cost) {
        throw new Error('Insufficient XP');
      }

      // Deduct XP
      await base44.auth.updateMe({ xp: currentUser.xp - selectedTier.cost });

      // Create featured listing
      const startsAt = new Date();
      const expiresAt = new Date(Date.now() + selectedTier.hours * 60 * 60 * 1000);

      await base44.entities.FeaturedListing.create({
        product_id: selectedProduct,
        seller_email: sellerEmail,
        duration_hours: selectedTier.hours,
        cost_xp: selectedTier.cost,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        placement: 'top_row',
        active: true
      });

      // Log XP transaction
      await base44.entities.XPLedger.create({
        user_email: sellerEmail,
        amount: -selectedTier.cost,
        transaction_type: 'feature_listing',
        reference_id: selectedProduct,
        reference_type: 'product',
        balance_after: currentUser.xp - selectedTier.cost
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['featured-listings']);
      queryClient.invalidateQueries(['current-user-featured']);
      toast.success('Product featured!');
      setSelectedProduct('');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const activeListings = featuredListings.filter(f => 
    f.active && new Date(f.expires_at) > new Date()
  );

  const expiredListings = featuredListings.filter(f => 
    !f.active || new Date(f.expires_at) <= new Date()
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#FFEB3B]/10 to-[#E62020]/10 border-2 border-[#FFEB3B] p-6">
        <h2 className="text-2xl font-black uppercase flex items-center gap-2 mb-4">
          <Star className="w-6 h-6 text-[#FFEB3B]" />
          Feature Your Listing
        </h2>

        <p className="text-sm text-white/60 mb-6">
          Boost visibility by featuring your products at the top of marketplace search results
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-white/60 uppercase mb-2 block">Select Product</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {activeProducts.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-white/60 uppercase mb-2 block">Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours - 500 XP</SelectItem>
                <SelectItem value="72">3 days - 1,200 XP</SelectItem>
                <SelectItem value="168">1 week - 2,000 XP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/5 p-4 border border-white/10 mb-4">
          <div>
            <p className="text-sm text-white/60">Total Cost</p>
            <p className="text-2xl font-black text-[#FFEB3B]">
              {selectedTier.cost.toLocaleString()} XP
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Your Balance</p>
            <p className="text-2xl font-black">
              {currentUser?.xp?.toLocaleString() || 0} XP
            </p>
          </div>
        </div>

        <Button
          onClick={() => featureMutation.mutate()}
          disabled={!selectedProduct || featureMutation.isPending || (currentUser?.xp || 0) < selectedTier.cost}
          className="w-full bg-[#FFEB3B] hover:bg-white text-black font-black text-lg py-6"
        >
          <Zap className="w-5 h-5 mr-2" />
          {featureMutation.isPending ? 'Processing...' : `Feature for ${selectedTier.label}`}
        </Button>
      </div>

      {/* Active Featured Listings */}
      {activeListings.length > 0 && (
        <div>
          <h3 className="text-xl font-black uppercase mb-4">Active Featured Listings</h3>
          <div className="space-y-3">
            {activeListings.map(listing => {
              const product = products.find(p => p.id === listing.product_id);
              const hoursLeft = Math.max(0, Math.floor((new Date(listing.expires_at) - new Date()) / (1000 * 60 * 60)));
              const ctr = listing.impressions > 0 ? ((listing.clicks / listing.impressions) * 100).toFixed(1) : 0;

              return (
                <div key={listing.id} className="bg-white/5 border border-[#FFEB3B]/30 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold">{product?.name || 'Unknown Product'}</h4>
                      <p className="text-xs text-white/60">
                        Expires in {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge className="bg-[#FFEB3B]/20 text-[#FFEB3B]">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[#00D9FF] mb-1">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black">{listing.impressions}</div>
                      <div className="text-xs text-white/40">Views</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[#E62020] mb-1">
                        <MousePointer className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black">{listing.clicks}</div>
                      <div className="text-xs text-white/40">Clicks</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-[#39FF14] mb-1">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-black">{ctr}%</div>
                      <div className="text-xs text-white/40">CTR</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Featured Listings */}
      {expiredListings.length > 0 && (
        <div>
          <h3 className="text-lg font-black uppercase mb-3 text-white/60">Past Campaigns</h3>
          <div className="space-y-2">
            {expiredListings.slice(0, 5).map(listing => {
              const product = products.find(p => p.id === listing.product_id);
              const ctr = listing.impressions > 0 ? ((listing.clicks / listing.impressions) * 100).toFixed(1) : 0;

              return (
                <div key={listing.id} className="bg-white/5 border border-white/10 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{product?.name || 'Unknown'}</p>
                      <p className="text-xs text-white/40">
                        {format(new Date(listing.created_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p>{listing.impressions} views • {listing.clicks} clicks</p>
                      <p className="text-white/60">{ctr}% CTR</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}