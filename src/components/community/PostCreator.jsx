import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Video, X, Clock, Loader2, BarChart3, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { checkRateLimit } from '../utils/sanitize';

export default function PostCreator({ user, onPostCreated, onCancel }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [expires_in_24h, setExpiresIn24h] = useState(false);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postType, setPostType] = useState('text'); // 'text', 'poll', or 'event'
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(7); // days
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    ticket_url: ''
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error('Image too large (max 10MB)');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMediaUrl(file_url);
      setMediaType('image');
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use MP4, MOV, or WebM.');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error('Video too large (max 100MB)');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMediaUrl(file_url);
      setMediaType('video');
      toast.success('Video uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    if (!tagInput.trim() || tags.length >= 5) return;
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handlePost = async () => {
    if (postType === 'text' && !content.trim() && !mediaUrl) {
      toast.error('Please add content or media');
      return;
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.filter(o => o.trim());
      if (!content.trim()) {
        toast.error('Please add a poll question');
        return;
      }
      if (validOptions.length < 2) {
        toast.error('Polls need at least 2 options');
        return;
      }
    }

    if (postType === 'event') {
      if (!content.trim() || !eventData.title || !eventData.date) {
        toast.error('Please fill in event title, description, and date');
        return;
      }
    }

    // Rate limit: max 5 posts per minute
    const rateCheck = checkRateLimit(`post-${user.email}`, 5, 60000);
    if (!rateCheck.allowed) {
      toast.error('Too many posts. Please wait before posting again.');
      return;
    }

    setPosting(true);
    try {
      // AI moderation
      const moderationPrompt = `Analyze this community post for inappropriate content:

"${content}"

Check for:
- Hate speech, harassment, threats
- Spam or promotional content
- NSFW/explicit content
- Misinformation

Return a JSON with: approved (boolean), reason (string if not approved), sentiment (positive/neutral/negative)`;

      const moderation = await base44.integrations.Core.InvokeLLM({
        prompt: moderationPrompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            approved: { type: "boolean" },
            reason: { type: "string" },
            sentiment: { type: "string" }
          }
        }
      });

      const expiresAt = expires_in_24h 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      const pollData = postType === 'poll' ? {
        options: pollOptions.filter(o => o.trim()),
        votes: {},
        expires_at: new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000).toISOString()
      } : null;

      const eventMetadata = postType === 'event' ? {
        event: {
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          ticket_url: eventData.ticket_url
        }
      } : {};

      const post = await base44.entities.CommunityPost.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        content: content.trim(),
        category,
        tags,
        moderation_status: moderation.approved ? 'approved' : 'flagged',
        moderation_reason: moderation.reason || null,
        ai_sentiment: moderation.sentiment || 'neutral',
        expires_at: expiresAt,
        image_url: mediaType === 'image' ? mediaUrl : null,
        video_url: mediaType === 'video' ? mediaUrl : null,
        metadata: pollData ? { poll: pollData } : eventMetadata
      });
      
      // Notify admins if flagged
      if (!moderation.approved) {
        await base44.entities.Notification.create({
          user_email: 'admin',
          type: 'flagged_post',
          title: 'Post Flagged by AI',
          message: `Post by ${user.full_name || user.email} flagged: ${moderation.reason}`,
          link: 'AdminDashboard',
          metadata: { post_id: post.id }
        });
      }

      if (moderation.approved) {
        toast.success('Post published!');
      } else {
        toast.warning('Post flagged for review: ' + moderation.reason);
      }

      onPostCreated();
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border-2 border-white/10 rounded-xl p-6 mb-6"
    >
      <h3 className="font-black uppercase text-sm mb-4">Create Post</h3>

      {/* Post Type Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={postType === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPostType('text')}
          className={postType === 'text' ? 'bg-[#FF1493] text-black' : 'border-white/20'}
        >
          Text Post
        </Button>
        <Button
          type="button"
          variant={postType === 'poll' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPostType('poll')}
          className={postType === 'poll' ? 'bg-[#00D9FF] text-black' : 'border-white/20'}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Poll
        </Button>
        <Button
          type="button"
          variant={postType === 'event' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPostType('event')}
          className={postType === 'event' ? 'bg-[#FFEB3B] text-black' : 'border-white/20'}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Event
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          postType === 'poll' ? "What's your poll question?" :
          postType === 'event' ? "Describe your event..." :
          "Share something with the community..."
        }
        rows={4}
        className="mb-4 bg-black border-white/20 text-white placeholder:text-white/40"
        maxLength={1000}
      />

      <div className="text-xs text-white/40 mb-4 text-right">
        {content.length}/1000
      </div>

      {/* Poll Options */}
      {postType === 'poll' && (
        <div className="mb-4 space-y-3">
          <p className="text-xs text-white/60 uppercase font-bold">Poll Options</p>
          {pollOptions.map((option, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={option}
                onChange={(e) => updatePollOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40"
                maxLength={100}
              />
              {pollOptions.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePollOption(index)}
                  className="text-white/40 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPollOption}
              className="border-white/20 text-white/60"
            >
              + Add Option
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Poll Duration:</span>
            <select
              value={pollDuration}
              onChange={(e) => setPollDuration(Number(e.target.value))}
              className="px-2 py-1 bg-black border border-white/20 rounded text-xs text-white"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>
          </div>
        </div>
      )}

      {/* Event Form */}
      {postType === 'event' && (
        <div className="mb-4 space-y-3">
          <p className="text-xs text-white/60 uppercase font-bold">Event Details</p>
          <input
            type="text"
            value={eventData.title}
            onChange={(e) => setEventData({...eventData, title: e.target.value})}
            placeholder="Event Title"
            className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40"
            maxLength={100}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={eventData.date}
              onChange={(e) => setEventData({...eventData, date: e.target.value})}
              className="px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white"
            />
            <input
              type="time"
              value={eventData.time}
              onChange={(e) => setEventData({...eventData, time: e.target.value})}
              className="px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white"
            />
          </div>
          <input
            type="text"
            value={eventData.location}
            onChange={(e) => setEventData({...eventData, location: e.target.value})}
            placeholder="Location"
            className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40"
          />
          <input
            type="url"
            value={eventData.ticket_url}
            onChange={(e) => setEventData({...eventData, ticket_url: e.target.value})}
            placeholder="Ticket URL (optional)"
            className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40"
          />
        </div>
      )}

      {/* Media Preview */}
      {mediaUrl && (
        <div className="relative mb-4 border-2 border-white/20 rounded-lg overflow-hidden">
          {mediaType === 'image' && (
            <img src={mediaUrl} alt="Upload" className="w-full max-h-64 object-cover" />
          )}
          {mediaType === 'video' && (
            <video src={mediaUrl} controls className="w-full max-h-64" />
          )}
          <button
            onClick={() => {
              setMediaUrl(null);
              setMediaType(null);
            }}
            className="absolute top-2 right-2 bg-black/80 hover:bg-black p-2 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(tag => (
            <div key={tag} className="px-3 py-1 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-full text-xs flex items-center gap-2">
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-[#FF1493]">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tag Input */}
      {tags.length < 5 && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add tag (max 5)"
            className="flex-1 px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40"
            maxLength={20}
          />
          <Button onClick={addTag} size="sm" variant="outline" className="border-white/20">
            Add Tag
          </Button>
        </div>
      )}

      {/* Options */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {(postType === 'text' || postType === 'event') && (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="post-image-upload"
              disabled={uploading || mediaUrl}
            />
        <label htmlFor="post-image-upload">
          <Button 
            type="button" 
            variant="outline"
            size="sm"
            disabled={uploading || mediaUrl}
            asChild
            className="border-white/20 text-white hover:bg-white/10"
          >
            <span>
              <Image className="w-4 h-4 mr-2" />
              Image
            </span>
          </Button>
        </label>

        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          className="hidden"
          id="post-video-upload"
          disabled={uploading || mediaUrl}
        />
        <label htmlFor="post-video-upload">
          <Button 
            type="button" 
            variant="outline"
            size="sm"
            disabled={uploading || mediaUrl}
            asChild
            className="border-white/20 text-white hover:bg-white/10"
          >
            <span>
              <Video className="w-4 h-4 mr-2" />
              Video
            </span>
          </Button>
        </label>
          </>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={expires_in_24h}
            onChange={(e) => setExpiresIn24h(e.target.checked)}
            className="w-4 h-4 accent-[#FF1493]"
          />
          <Clock className="w-4 h-4 text-white/60" />
          <span className="text-xs text-white/60 uppercase">24hr post</span>
        </label>

        {uploading && (
          <span className="text-xs text-white/40 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading...
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48 bg-black border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="events">Events</SelectItem>
            <SelectItem value="marketplace">Marketplace</SelectItem>
            <SelectItem value="beacons">Beacons</SelectItem>
            <SelectItem value="squads">Squads</SelectItem>
            <SelectItem value="achievements">Achievements</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={posting}>
            Cancel
          </Button>
          <Button
            onClick={handlePost}
            disabled={posting || uploading || (postType === 'text' && !content.trim() && !mediaUrl) || (postType === 'poll' && (!content.trim() || pollOptions.filter(o => o.trim()).length < 2)) || (postType === 'event' && (!content.trim() || !eventData.title || !eventData.date))}
            className="bg-[#FF1493] hover:bg-white text-black font-black"
          >
            {posting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Post'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}