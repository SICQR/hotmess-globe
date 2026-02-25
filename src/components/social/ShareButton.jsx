import React, { useState } from 'react';
import { 
  Share2, 
  Link2, 
  Twitter, 
  MessageCircle, 
  Copy, 
  Check,
  Mail,
  Facebook
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trackEvent } from '@/components/utils/analytics';

/**
 * Generate share URL with tracking
 */
function getShareUrl(type, id, referralCode = null) {
  const baseUrl = window.location.origin;
  let url;
  
  switch (type) {
    case 'event':
      url = `${baseUrl}/events/${id}`;
      break;
    case 'profile':
      url = `${baseUrl}/social/u/${id}`;
      break;
    case 'product':
      url = `${baseUrl}/market/p/${id}`;
      break;
    default:
      url = window.location.href;
  }
  
  if (referralCode) {
    url += `?ref=${referralCode}`;
  }
  
  return url;
}

/**
 * Social Share Button Component
 */
export default function ShareButton({ 
  type = 'page', 
  id,
  title,
  description,
  image,
  referralCode,
  variant = 'default',
  className = ''
}) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const shareUrl = getShareUrl(type, id, referralCode);
  const shareTitle = title || 'Check this out on HOTMESS';
  const shareText = description || 'Discover events and connect with people on HOTMESS';
  
  // Native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        trackEvent('share', { method: 'native', type, id });
        return true;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    }
    return false;
  };
  
  const handleShareClick = async () => {
    const shared = await handleNativeShare();
    if (!shared) {
      setShowModal(true);
    }
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      trackEvent('share', { method: 'copy', type, id });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };
  
  const shareToTwitter = () => {
    const text = encodeURIComponent(`${shareTitle}\n\n${shareText}`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    trackEvent('share', { method: 'twitter', type, id });
  };
  
  const shareToFacebook = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    trackEvent('share', { method: 'facebook', type, id });
  };
  
  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${shareTitle}\n\n${shareText}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    trackEvent('share', { method: 'whatsapp', type, id });
  };
  
  const shareToTelegram = () => {
    const text = encodeURIComponent(`${shareTitle}\n\n${shareText}`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    trackEvent('share', { method: 'telegram', type, id });
  };
  
  const shareViaEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackEvent('share', { method: 'email', type, id });
  };
  
  return (
    <>
      <Button
        onClick={handleShareClick}
        variant={variant}
        className={className}
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-black border-2 border-white text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Share</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Link Preview */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="font-semibold mb-1">{shareTitle}</div>
              <div className="text-sm text-white/60 mb-3">{shareText}</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-black border border-white/20 rounded px-3 py-2 text-sm text-white/80"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="border-white/20"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            {/* Social Buttons */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={shareToTwitter}
                className="p-4 bg-white/5 hover:bg-[#1DA1F2]/20 border border-white/10 rounded-lg flex flex-col items-center gap-2 transition-colors"
              >
                <Twitter className="w-6 h-6 text-[#1DA1F2]" />
                <span className="text-xs">Twitter</span>
              </button>
              
              <button
                onClick={shareToFacebook}
                className="p-4 bg-white/5 hover:bg-[#4267B2]/20 border border-white/10 rounded-lg flex flex-col items-center gap-2 transition-colors"
              >
                <Facebook className="w-6 h-6 text-[#4267B2]" />
                <span className="text-xs">Facebook</span>
              </button>
              
              <button
                onClick={shareToWhatsApp}
                className="p-4 bg-white/5 hover:bg-[#25D366]/20 border border-white/10 rounded-lg flex flex-col items-center gap-2 transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
                <span className="text-xs">WhatsApp</span>
              </button>
              
              <button
                onClick={shareToTelegram}
                className="p-4 bg-white/5 hover:bg-[#0088cc]/20 border border-white/10 rounded-lg flex flex-col items-center gap-2 transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-[#0088cc]" />
                <span className="text-xs">Telegram</span>
              </button>
            </div>
            
            {/* More Options */}
            <div className="flex gap-3">
              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="flex-1 border-white/20 text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1 border-white/20 text-white"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact Share Icon Button
 */
export function ShareIconButton({ type, id, title, description, className = '' }) {
  const handleShare = async () => {
    const shareUrl = getShareUrl(type, id);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'HOTMESS',
          text: description || '',
          url: shareUrl,
        });
        trackEvent('share', { method: 'native', type, id });
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Fallback to copy
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied!');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
      trackEvent('share', { method: 'copy', type, id });
    }
  };
  
  return (
    <button
      onClick={handleShare}
      className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${className}`}
      title="Share"
    >
      <Share2 className="w-5 h-5" />
    </button>
  );
}

/**
 * Social Proof Component
 * Shows how many friends are attending/interested
 */
export function SocialProof({ type, friends = [], total = 0 }) {
  if (friends.length === 0 && total === 0) return null;
  
  const displayFriends = friends.slice(0, 3);
  const remaining = friends.length - 3;
  
  return (
    <div className="flex items-center gap-2">
      {/* Friend Avatars */}
      {displayFriends.length > 0 && (
        <div className="flex -space-x-2">
          {displayFriends.map((friend, idx) => (
            <div
              key={idx}
              className="w-6 h-6 rounded-full border-2 border-black bg-gradient-to-br from-[#C8962C] to-[#B026FF] flex items-center justify-center text-xs font-bold overflow-hidden"
            >
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                friend.name?.[0] || '?'
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Text */}
      <span className="text-sm text-white/60">
        {friends.length > 0 ? (
          <>
            <span className="text-white font-medium">{friends[0]?.name}</span>
            {remaining > 0 && ` + ${remaining} friends`}
            {type === 'event' && ' going'}
          </>
        ) : (
          `${total} ${type === 'event' ? 'going' : 'interested'}`
        )}
      </span>
    </div>
  );
}
