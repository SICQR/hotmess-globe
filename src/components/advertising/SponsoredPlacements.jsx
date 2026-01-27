import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Globe,
  Eye,
  MousePointer,
  Calendar,
  Clock,
  Settings,
  Trash2,
  Edit,
  Pause,
  Play,
  ExternalLink,
  Plus,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
 * SponsoredPlacements - Manage Globe pin placements for businesses
 */
export default function SponsoredPlacements({ businessEmail, sponsorships = [] }) {
  const [editingPlacement, setEditingPlacement] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const activePlacements = sponsorships.filter(s => 
    s.status === 'active' && new Date(s.end_date) > new Date()
  );
  
  const expiredPlacements = sponsorships.filter(s => 
    s.status !== 'active' || new Date(s.end_date) <= new Date()
  );

  const handlePausePlacement = async (placementId) => {
    try {
      const { error } = await supabase
        .from('sponsored_placements')
        .update({ status: 'paused' })
        .eq('id', placementId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries(['business-sponsorships']);
      toast.success('Placement paused');
    } catch (error) {
      toast.error('Failed to pause placement');
    }
  };

  const handleResumePlacement = async (placementId) => {
    try {
      const { error } = await supabase
        .from('sponsored_placements')
        .update({ status: 'active' })
        .eq('id', placementId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries(['business-sponsorships']);
      toast.success('Placement resumed');
    } catch (error) {
      toast.error('Failed to resume placement');
    }
  };

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

  const PlacementCard = ({ placement }) => {
    const daysLeft = getDaysRemaining(placement.end_date);
    const isActive = placement.status === 'active' && daysLeft > 0;
    const isPaused = placement.status === 'paused';
    const isExpired = daysLeft <= 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`bg-white/5 border transition-all ${
          isActive ? 'border-[#39FF14]/30' : 
          isPaused ? 'border-[#FFEB3B]/30' : 
          'border-white/10'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-[#39FF14]/20' : 
                  isPaused ? 'bg-[#FFEB3B]/20' : 
                  'bg-white/10'
                }`}>
                  <MapPin className={`w-6 h-6 ${
                    isActive ? 'text-[#39FF14]' : 
                    isPaused ? 'text-[#FFEB3B]' : 
                    'text-white/40'
                  }`} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{placement.name || 'Globe Pin'}</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      isActive ? 'bg-[#39FF14]/20 text-[#39FF14]' :
                      isPaused ? 'bg-[#FFEB3B]/20 text-[#FFEB3B]' :
                      'bg-white/10 text-white/60'
                    }>
                      {isExpired ? 'Expired' : placement.status}
                    </Badge>
                    {!isExpired && (
                      <span className="text-xs text-white/40">
                        {daysLeft} days left
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isActive && (
                  <button
                    onClick={() => handlePausePlacement(placement.id)}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                {isPaused && !isExpired && (
                  <button
                    onClick={() => handleResumePlacement(placement.id)}
                    className="p-2 bg-[#39FF14]/20 rounded-lg hover:bg-[#39FF14]/30 transition-colors text-[#39FF14]"
                    title="Resume"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setEditingPlacement(placement)}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  title="Edit"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <Eye className="w-4 h-4 mx-auto mb-1 text-[#00D9FF]" />
                <div className="text-lg font-bold">{(placement.impressions || 0).toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase">Impressions</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <MousePointer className="w-4 h-4 mx-auto mb-1 text-[#E62020]" />
                <div className="text-lg font-bold">{(placement.clicks || 0).toLocaleString()}</div>
                <div className="text-[10px] text-white/40 uppercase">Clicks</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-[#39FF14]" />
                <div className="text-lg font-bold">
                  {placement.impressions > 0 
                    ? ((placement.clicks / placement.impressions) * 100).toFixed(1) 
                    : 0}%
                </div>
                <div className="text-[10px] text-white/40 uppercase">CTR</div>
              </div>
            </div>

            {/* Location & Dates */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {placement.city || 'All Cities'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(placement.start_date)} - {formatDate(placement.end_date)}
              </div>
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
          <h3 className="text-xl font-black uppercase">Globe Placements</h3>
          <p className="text-sm text-white/60">Your venue pins on the HotMess Globe</p>
        </div>
      </div>

      {/* Active Placements */}
      {activePlacements.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm uppercase tracking-wider text-white/40">Active ({activePlacements.length})</h4>
          <div className="grid gap-4">
            {activePlacements.map((placement) => (
              <PlacementCard key={placement.id} placement={placement} />
            ))}
          </div>
        </div>
      )}

      {/* Expired/Inactive Placements */}
      {expiredPlacements.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm uppercase tracking-wider text-white/40">
            Past Campaigns ({expiredPlacements.length})
          </h4>
          <div className="grid gap-4 opacity-60">
            {expiredPlacements.map((placement) => (
              <PlacementCard key={placement.id} placement={placement} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sponsorships.length === 0 && (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="p-12 text-center">
            <Globe className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">No Globe Placements Yet</h4>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              Get your venue featured on the HotMess Globe and reach thousands of nightlife enthusiasts.
            </p>
            <Button className="bg-[#E62020] hover:bg-[#E62020]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Placement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      {editingPlacement && (
        <Dialog open={!!editingPlacement} onOpenChange={() => setEditingPlacement(null)}>
          <DialogContent className="bg-black/95 border-white/20 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Placement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Placement Name</Label>
                <Input
                  value={editingPlacement.name || ''}
                  onChange={(e) => setEditingPlacement({
                    ...editingPlacement,
                    name: e.target.value
                  })}
                  placeholder="e.g., Weekend Special"
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingPlacement.description || ''}
                  onChange={(e) => setEditingPlacement({
                    ...editingPlacement,
                    description: e.target.value
                  })}
                  placeholder="Short description for your pin..."
                  className="bg-white/5 border-white/20"
                  rows={3}
                />
              </div>
              <div>
                <Label>Destination URL</Label>
                <Input
                  value={editingPlacement.destination_url || ''}
                  onChange={(e) => setEditingPlacement({
                    ...editingPlacement,
                    destination_url: e.target.value
                  })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPlacement(null)}>
                Cancel
              </Button>
              <Button 
                className="bg-[#E62020] hover:bg-[#E62020]/90 text-black"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('sponsored_placements')
                      .update({
                        name: editingPlacement.name,
                        description: editingPlacement.description,
                        destination_url: editingPlacement.destination_url,
                      })
                      .eq('id', editingPlacement.id);
                    
                    if (error) throw error;
                    
                    queryClient.invalidateQueries(['business-sponsorships']);
                    toast.success('Placement updated');
                    setEditingPlacement(null);
                  } catch (error) {
                    toast.error('Failed to update placement');
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
