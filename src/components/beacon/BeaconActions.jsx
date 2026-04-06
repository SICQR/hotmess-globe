import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Bookmark, Camera, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function BeaconActions({ beacon }) {
  const [user, setUser] = useState(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await supabase.auth.getSession().then(r => !!r.data.session);
        if (!isAuth) {
          setUser(null);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
      let currentUser; if (!user) { currentUser = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); currentUser = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  const { data: bookmarks = [] } = useQuery({
    queryKey: ['bookmarks', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase.from('beacon_bookmarks').select('*').eq('user_email', user.email);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const isBookmarked = bookmarks.some(b => b.beacon_id === beacon.id);

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('beacon_bookmarks').insert({
        user_email: user.email,
        beacon_id: beacon.id
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmarks']);
      toast.success('Bookmarked!');
    }
  });

  const unbookmarkMutation = useMutation({
    mutationFn: async () => {
      const bookmark = bookmarks.find(b => b.beacon_id === beacon.id);
      const { error } = await supabase.from('beacon_bookmarks').delete().eq('id', bookmark.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookmarks']);
      toast.success('Removed bookmark');
    }
  });

  const checkInMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase.from('beacon_checkins').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Checked in with photo!');
      setCheckInNote('');
      setPhotoFile(null);

      // Track interaction
      supabase.from('user_interactions').insert({
        user_email: user.email,
        interaction_type: 'visit',
        beacon_id: beacon.id,
        beacon_kind: beacon.kind,
        beacon_mode: beacon.mode
      }).catch(err => console.error('Failed to track interaction:', err));
    }
  });

  const handleCheckIn = async () => {
    if (!user) return;

    let photoUrl = null;
    if (photoFile) {
      setUploading(true);
      try {
        const fileName = `${Date.now()}_${photoFile.name}`;
        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(fileName, photoFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      } catch (error) {
        toast.error('Photo upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    
    checkInMutation.mutate({
      user_email: user.email,
      user_name: user.full_name,
      beacon_id: beacon.id,
      beacon_title: beacon.title,
      note: checkInNote,
      photo_url: photoUrl
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      Promise.resolve(
        navigator.share({
          title: beacon.title,
          text: beacon.description,
          url,
        })
      ).catch((err) => {
        // User cancelled the share sheet.
        if (err?.name === 'AbortError') return;
        toast.error('Share failed');
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => isBookmarked ? unbookmarkMutation.mutate() : bookmarkMutation.mutate()}
        variant="outline"
        className="border-white/20 hover:bg-white/10 flex items-center gap-2"
      >
        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-[#FFEB3B] text-[#FFEB3B]' : ''}`} />
        <span className="text-xs font-bold uppercase hidden sm:inline">
          {isBookmarked ? 'Saved' : 'Save'}
        </span>
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-white/20 hover:bg-white/10 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-xs font-bold uppercase hidden sm:inline">Check In</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-black border-white/20">
          <DialogHeader>
            <DialogTitle>Check In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/40 mb-2">
                Upload Event Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:border-2 file:border-white file:bg-[#C8962C] file:text-black file:font-black file:uppercase file:text-xs hover:file:bg-white file:cursor-pointer"
              />
              {photoFile && (
                <p className="text-xs text-[#00C2E0] mt-2 font-mono">
                  ✓ {photoFile.name}
                </p>
              )}
            </div>
            
            <Textarea
              value={checkInNote}
              onChange={(e) => setCheckInNote(e.target.value)}
              placeholder="How's the vibe? (optional)"
              className="bg-white/5 border-white/20 text-white"
            />
            
            <Button
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending || uploading}
              className="w-full bg-[#00C2E0] hover:bg-[#00C2E0]/90 text-black font-black border-2 border-white"
            >
              {uploading ? 'UPLOADING PHOTO...' : checkInMutation.isPending ? 'CHECKING IN...' : 'CHECK IN'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={handleShare}
        variant="outline"
        className="border-white/20 hover:bg-white/10 flex items-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-xs font-bold uppercase hidden sm:inline">Share</span>
      </Button>
    </div>
  );
}