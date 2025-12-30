import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bookmark, Camera, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function BeaconActions({ beacon }) {
  const [user, setUser] = useState(null);
  const [checkInNote, setCheckInNote] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks', user?.email],
    queryFn: () => base44.entities.BeaconBookmark.filter({ user_email: user.email }),
    enabled: !!user
  });

  const isBookmarked = bookmarks.some(b => b.beacon_id === beacon.id);

  const bookmarkMutation = useMutation({
    mutationFn: () => base44.entities.BeaconBookmark.create({
      user_email: user.email,
      beacon_id: beacon.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmarks']);
      toast.success('Bookmarked!');
    }
  });

  const unbookmarkMutation = useMutation({
    mutationFn: () => {
      const bookmark = bookmarks.find(b => b.beacon_id === beacon.id);
      return base44.entities.BeaconBookmark.delete(bookmark.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmarks']);
      toast.success('Removed bookmark');
    }
  });

  const checkInMutation = useMutation({
    mutationFn: (data) => base44.entities.BeaconCheckIn.create(data),
    onSuccess: () => {
      toast.success('Checked in!');
      setCheckInNote('');
      
      // Track interaction
      base44.entities.UserInteraction.create({
        user_email: user.email,
        interaction_type: 'visit',
        beacon_id: beacon.id,
        beacon_kind: beacon.kind,
        beacon_mode: beacon.mode
      });
    }
  });

  const handleCheckIn = () => {
    if (!user) return;
    checkInMutation.mutate({
      user_email: user.email,
      user_name: user.full_name,
      beacon_id: beacon.id,
      beacon_title: beacon.title,
      note: checkInNote
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: beacon.title,
        text: beacon.description,
        url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  if (!user) return null;

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => isBookmarked ? unbookmarkMutation.mutate() : bookmarkMutation.mutate()}
        variant="outline"
        size="icon"
        className="border-white/20 hover:bg-white/10"
      >
        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#FFEB3B] text-[#FFEB3B]' : ''}`} />
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="border-white/20 hover:bg-white/10">
            <Camera className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-black border-white/20">
          <DialogHeader>
            <DialogTitle>Check In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={checkInNote}
              onChange={(e) => setCheckInNote(e.target.value)}
              placeholder="How's the vibe? (optional)"
              className="bg-white/5 border-white/20 text-white"
            />
            <Button
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
              className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black"
            >
              {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={handleShare}
        variant="outline"
        size="icon"
        className="border-white/20 hover:bg-white/10"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}