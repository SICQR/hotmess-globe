import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Image,
  Eye,
  MousePointer,
  Calendar,
  Settings,
  Pause,
  Play,
  Upload,
  Plus,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

/**
 * BannerManager - Manage banner advertisements for businesses
 */
export default function BannerManager({ businessEmail, banners = [] }) {
  const [editingBanner, setEditingBanner] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const queryClient = useQueryClient();

  const activeBanners = banners.filter(b => 
    b.status === 'active' && new Date(b.end_date) > new Date()
  );
  
  const inactiveBanners = banners.filter(b => 
    b.status !== 'active' || new Date(b.end_date) <= new Date()
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handlePauseBanner = async (bannerId) => {
    try {
      const { error } = await supabase
        .from('sponsored_placements')
        .update({ status: 'paused' })
        .eq('id', bannerId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries(['business-sponsorships']);
      toast.success('Banner paused');
    } catch (error) {
      toast.error('Failed to pause banner');
    }
  };

  const handleResumeBanner = async (bannerId) => {
    try {
      const { error } = await supabase
        .from('sponsored_placements')
        .update({ status: 'active' })
        .eq('id', bannerId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries(['business-sponsorships']);
      toast.success('Banner resumed');
    } catch (error) {
      toast.error('Failed to resume banner');
    }
  };

  const BannerCard = ({ banner }) => {
    const daysLeft = getDaysRemaining(banner.end_date);
    const isActive = banner.status === 'active' && daysLeft > 0;
    const isPaused = banner.status === 'paused';
    const isExpired = daysLeft <= 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`bg-white/5 border overflow-hidden transition-all ${
          isActive ? 'border-[#00D9FF]/30' : 
          isPaused ? 'border-[#FFEB3B]/30' : 
          'border-white/10'
        }`}>
          {/* Banner Preview */}
          {banner.image_url && (
            <div className="relative h-24 bg-black/50">
              <img 
                src={banner.image_url} 
                alt={banner.name || 'Banner'} 
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
              <Badge 
                className={`absolute top-2 right-2 ${
                  isActive ? 'bg-[#39FF14]/80 text-black' :
                  isPaused ? 'bg-[#FFEB3B]/80 text-black' :
                  'bg-white/20 text-white'
                }`}
              >
                {isExpired ? 'Expired' : banner.status}
              </Badge>
            </div>
          )}

          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-lg">{banner.name || 'Banner Ad'}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/60">
                    {banner.placement_location || 'App-wide'}
                  </span>
                  {!isExpired && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="text-xs text-white/40">
                        {daysLeft} days left
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isActive && (
                  <button
                    onClick={() => handlePauseBanner(banner.id)}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                {isPaused && !isExpired && (
                  <button
                    onClick={() => handleResumeBanner(banner.id)}
                    className="p-2 bg-[#00D9FF]/20 rounded-lg hover:bg-[#00D9FF]/30 transition-colors text-[#00D9FF]"
                    title="Resume"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setEditingBanner(banner)}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  title="Edit"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <Eye className="w-4 h-4 mx-auto mb-1 text-[#00D9FF]" />
                <div className="text-lg font-bold">{(banner.impressions || 0).toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase">Impressions</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <MousePointer className="w-4 h-4 mx-auto mb-1 text-[#E62020]" />
                <div className="text-lg font-bold">{(banner.clicks || 0).toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase">Clicks</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-[#39FF14]" />
                <div className="text-lg font-bold">
                  {banner.impressions > 0 
                    ? ((banner.clicks / banner.impressions) * 100).toFixed(1) 
                    : 0}%
                </div>
                <div className="text-[10px] text-white/40 uppercase">CTR</div>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 mt-4 text-xs text-white/60">
              <Calendar className="w-3 h-3" />
              {formatDate(banner.start_date)} - {formatDate(banner.end_date)}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black uppercase">Banner Ads</h3>
          <p className="text-sm text-white/60">Your display advertisements across the app</p>
        </div>
      </div>

      {/* Banner Specs Info */}
      <Card className="bg-[#00D9FF]/10 border-[#00D9FF]/30">
        <CardContent className="p-4">
          <h4 className="font-bold text-[#00D9FF] mb-2 flex items-center gap-2">
            <Image className="w-4 h-4" />
            Banner Specifications
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-white/60">Standard:</span>
              <span className="ml-2 font-mono">728×90</span>
            </div>
            <div>
              <span className="text-white/60">Mobile:</span>
              <span className="ml-2 font-mono">320×50</span>
            </div>
            <div>
              <span className="text-white/60">Full-width:</span>
              <span className="ml-2 font-mono">1200×300</span>
            </div>
            <div>
              <span className="text-white/60">Max size:</span>
              <span className="ml-2 font-mono">500KB</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Banners */}
      {activeBanners.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm uppercase tracking-wider text-white/40">Active ({activeBanners.length})</h4>
          <div className="grid md:grid-cols-2 gap-4">
            {activeBanners.map((banner) => (
              <BannerCard key={banner.id} banner={banner} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Banners */}
      {inactiveBanners.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm uppercase tracking-wider text-white/40">
            Past Campaigns ({inactiveBanners.length})
          </h4>
          <div className="grid md:grid-cols-2 gap-4 opacity-60">
            {inactiveBanners.map((banner) => (
              <BannerCard key={banner.id} banner={banner} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {banners.length === 0 && (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">No Banner Ads Yet</h4>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Create eye-catching banner advertisements to display across the HotMess app.
            </p>
            <Button className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Banner
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      {editingBanner && (
        <Dialog open={!!editingBanner} onOpenChange={() => setEditingBanner(null)}>
          <DialogContent className="bg-black/95 border-white/20 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Banner Name</Label>
                <Input
                  value={editingBanner.name || ''}
                  onChange={(e) => setEditingBanner({
                    ...editingBanner,
                    name: e.target.value
                  })}
                  placeholder="e.g., Summer Special"
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <Label>Destination URL</Label>
                <Input
                  value={editingBanner.destination_url || ''}
                  onChange={(e) => setEditingBanner({
                    ...editingBanner,
                    destination_url: e.target.value
                  })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <Label>Banner Image URL</Label>
                <Input
                  value={editingBanner.image_url || ''}
                  onChange={(e) => setEditingBanner({
                    ...editingBanner,
                    image_url: e.target.value
                  })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingBanner(null)}>
                Cancel
              </Button>
              <Button 
                className="bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('sponsored_placements')
                      .update({
                        name: editingBanner.name,
                        destination_url: editingBanner.destination_url,
                        image_url: editingBanner.image_url,
                      })
                      .eq('id', editingBanner.id);
                    
                    if (error) throw error;
                    
                    queryClient.invalidateQueries(['business-sponsorships']);
                    toast.success('Banner updated');
                    setEditingBanner(null);
                  } catch (error) {
                    toast.error('Failed to update banner');
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
