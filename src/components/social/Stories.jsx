/**
 * Stories Component
 * 
 * Ephemeral content (24-hour expiration) similar to Instagram/Snapchat stories
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Trash2,
  Loader2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/components/utils/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDisplayName, getProfileUrl } from '@/lib/userPrivacy';
import { Link } from 'react-router-dom';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORY_DURATION = 5000; // 5 seconds per story
const STORY_EXPIRY_HOURS = 24;

// =============================================================================
// STORIES BAR (Horizontal scroll of user stories)
// =============================================================================

export function StoriesBar({ currentUser, className }) {
  const [showViewer, setShowViewer] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch stories from users
  const { data: storiesData = [], isLoading } = useQuery({
    queryKey: ['stories', currentUser?.id],
    queryFn: async () => {
      // Get stories from last 24 hours
      const cutoff = new Date(Date.now() - STORY_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:user_id (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by user
      const grouped = {};
      (data || []).forEach(story => {
        const userId = story.user_id;
        if (!grouped[userId]) {
          grouped[userId] = {
            user: story.user,
            stories: [],
            hasUnviewed: false,
          };
        }
        grouped[userId].stories.push(story);
        if (!story.viewed_by?.includes(currentUser?.id)) {
          grouped[userId].hasUnviewed = true;
        }
      });

      return Object.values(grouped);
    },
    enabled: !!currentUser?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Check if current user has stories
  const myStories = storiesData.find(s => s.user?.id === currentUser?.id);

  const openStory = (index) => {
    setSelectedUserIndex(index);
    setShowViewer(true);
  };

  if (isLoading) {
    return (
      <div className={cn("flex gap-4 p-4 overflow-x-auto", className)}>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-16 h-20 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex gap-3 p-4 overflow-x-auto scrollbar-hide", className)}>
        {/* Create Story Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-shrink-0 w-16 flex flex-col items-center"
        >
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed transition-colors",
            myStories ? "border-[#FF1493] bg-[#FF1493]/10" : "border-white/30 hover:border-white/50"
          )}>
            {myStories ? (
              <div className="w-14 h-14 rounded-full overflow-hidden">
                <img 
                  src={currentUser?.avatar_url || '/default-avatar.svg'} 
                  alt="Your story"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <Plus className="w-6 h-6 text-white/60" />
            )}
          </div>
          <span className="text-[10px] text-white/60 mt-1 truncate w-full text-center">
            {myStories ? 'Your Story' : 'Add Story'}
          </span>
        </button>

        {/* Other Users' Stories */}
        {storiesData
          .filter(s => s.user?.id !== currentUser?.id)
          .map((userStories, index) => (
            <button
              key={userStories.user?.id}
              onClick={() => openStory(index)}
              className="flex-shrink-0 w-16 flex flex-col items-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-full p-0.5",
                userStories.hasUnviewed
                  ? "bg-gradient-to-br from-[#FF1493] via-[#B026FF] to-[#00D9FF]"
                  : "bg-white/20"
              )}>
                <div className="w-full h-full rounded-full overflow-hidden bg-black">
                  <img
                    src={userStories.user?.avatar_url || '/default-avatar.svg'}
                    alt={getDisplayName(userStories.user)}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[10px] text-white/60 mt-1 truncate w-full text-center">
                {getDisplayName(userStories.user)}
              </span>
            </button>
          ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {showViewer && (
          <StoryViewer
            storiesData={storiesData.filter(s => s.user?.id !== currentUser?.id)}
            initialIndex={selectedUserIndex}
            currentUserId={currentUser?.id}
            onClose={() => setShowViewer(false)}
          />
        )}
      </AnimatePresence>

      {/* Create Story Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateStoryModal
            currentUser={currentUser}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              queryClient.invalidateQueries(['stories']);
              setShowCreateModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// STORY VIEWER
// =============================================================================

function StoryViewer({ storiesData, initialIndex, currentUserId, onClose }) {
  const [userIndex, setUserIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  
  const progressRef = useRef(null);
  const currentUserStories = storiesData[userIndex];
  const currentStory = currentUserStories?.stories[storyIndex];

  // Progress timer
  useEffect(() => {
    if (paused || !currentStory) return;

    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;
      
      if (newProgress >= 100) {
        goToNextStory();
      } else {
        setProgress(newProgress);
        progressRef.current = requestAnimationFrame(animate);
      }
    };

    progressRef.current = requestAnimationFrame(animate);

    return () => {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    };
  }, [userIndex, storyIndex, paused, currentStory]);

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory || !currentUserId) return;
    
    // Mark as viewed in background
    supabase
      .from('stories')
      .update({
        viewed_by: [...(currentStory.viewed_by || []), currentUserId],
        view_count: (currentStory.view_count || 0) + 1,
      })
      .eq('id', currentStory.id)
      .then(() => {});
  }, [currentStory?.id, currentUserId]);

  const goToNextStory = () => {
    setProgress(0);
    
    if (storyIndex < currentUserStories.stories.length - 1) {
      // Next story from same user
      setStoryIndex(prev => prev + 1);
    } else if (userIndex < storiesData.length - 1) {
      // Next user
      setUserIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      // End of all stories
      onClose();
    }
  };

  const goToPrevStory = () => {
    setProgress(0);
    
    if (storyIndex > 0) {
      // Previous story from same user
      setStoryIndex(prev => prev - 1);
    } else if (userIndex > 0) {
      // Previous user
      setUserIndex(prev => prev - 1);
      setStoryIndex(storiesData[userIndex - 1].stories.length - 1);
    }
  };

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    if (x < rect.width / 3) {
      goToPrevStory();
    } else if (x > (rect.width * 2) / 3) {
      goToNextStory();
    }
  };

  if (!currentStory) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black"
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 pt-safe">
        {currentUserStories.stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{
                width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-4">
        <Link 
          to={getProfileUrl(currentUserStories.user)}
          className="flex items-center gap-3"
          onClick={onClose}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
            <img
              src={currentUserStories.user?.avatar_url || '/default-avatar.svg'}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="font-bold text-white text-sm">
              {getDisplayName(currentUserStories.user)}
            </p>
            <p className="text-xs text-white/60">
              {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
            </p>
          </div>
        </Link>
        
        <button
          onClick={onClose}
          className="p-2 text-white/80 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Story Content */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={handleTap}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {currentStory.media_type === 'image' ? (
          <img
            src={currentStory.media_url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        ) : currentStory.media_type === 'video' ? (
          <video
            src={currentStory.media_url}
            autoPlay
            muted
            playsInline
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-2xl font-bold text-white">{currentStory.text}</p>
          </div>
        )}

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-4">
            <p className="text-white text-center text-shadow">{currentStory.caption}</p>
          </div>
        )}
      </div>

      {/* Navigation hints */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
        <ChevronLeft className="w-8 h-8" />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
        <ChevronRight className="w-8 h-8" />
      </div>
    </motion.div>
  );
}

// =============================================================================
// CREATE STORY MODAL
// =============================================================================

function CreateStoryModal({ currentUser, onClose, onCreated }) {
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please select an image or video');
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!mediaFile || !currentUser?.id) return;

    setUploading(true);

    try {
      // Upload media
      const fileName = `stories/${currentUser.id}/${Date.now()}_${mediaFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Create story record
      const { error: createError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          media_url: publicUrl,
          media_type: mediaFile.type.startsWith('image/') ? 'image' : 'video',
          caption,
          expires_at: new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
        });

      if (createError) throw createError;

      onCreated();
    } catch (error) {
      console.error('Failed to create story:', error);
      alert('Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button onClick={onClose} className="text-white/60 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-bold uppercase">Create Story</h2>
        <Button
          onClick={handleCreate}
          disabled={!mediaFile || uploading}
          size="sm"
          className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {mediaPreview ? (
          <div className="relative max-w-full max-h-full">
            {mediaFile?.type.startsWith('image/') ? (
              <img src={mediaPreview} alt="" className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            ) : (
              <video src={mediaPreview} autoPlay muted loop className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            )}
            <button
              onClick={() => {
                setMediaFile(null);
                setMediaPreview(null);
              }}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center hover:border-[#FF1493] transition-colors"
            >
              <div className="text-center">
                <Camera className="w-8 h-8 text-white/40 mx-auto mb-2" />
                <span className="text-xs text-white/40">Add Photo/Video</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Caption */}
      {mediaPreview && (
        <div className="p-4 border-t border-white/10">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="bg-white/5 border-white/20"
            maxLength={200}
          />
          <p className="text-[10px] text-white/40 mt-1 text-right">{caption.length}/200</p>
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-white/5 flex items-center gap-2 text-xs text-white/40">
        <Clock className="w-4 h-4" />
        <span>Stories disappear after 24 hours</span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default StoriesBar;
