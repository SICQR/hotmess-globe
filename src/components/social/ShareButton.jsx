/**
 * Social Share Button Component
 * Enables sharing of events, profiles, beacons to social media and via native share
 */

import React, { useState } from 'react';
import { Share2, Twitter, Facebook, Link as LinkIcon, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

/**
 * ShareButton Component
 * 
 * @param {Object} props
 * @param {string} props.url - URL to share (required)
 * @param {string} props.title - Title of the content (required)
 * @param {string} props.description - Description of the content
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.compact - Use compact button style
 */
export function ShareButton({
  url,
  title,
  description = '',
  className = '',
  compact = false,
}) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Validate required props
  if (!url || !title) {
    console.error('ShareButton: url and title are required props');
    return null;
  }

  // Generate share URL with UTM parameters for tracking
  const getShareUrl = (platform) => {
    try {
      const shareUrl = new URL(url);
      shareUrl.searchParams.set('utm_source', platform);
      shareUrl.searchParams.set('utm_medium', 'social');
      shareUrl.searchParams.set('utm_campaign', 'share');
      return shareUrl.toString();
    } catch (error) {
      console.error('Invalid URL:', url);
      return url;
    }
  };

  // Try native share API first (mobile)
  const handleNativeShare = async () => {
    if (!navigator.share) {
      return false;
    }

    try {
      await navigator.share({
        title,
        text: description,
        url: getShareUrl('native'),
      });
      
      toast.success('Shared successfully!');
      return true;
    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
      return false;
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl('clipboard'));
      setCopied(true);
      toast.success('Link copied to clipboard!');
      
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy link');
    }
  };

  // Share to Twitter
  const handleTwitterShare = () => {
    const text = `${title}${description ? ` - ${description}` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl('twitter'))}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setIsOpen(false);
  };

  // Share to Facebook
  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl('facebook'))}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setIsOpen(false);
  };

  // Share to WhatsApp
  const handleWhatsAppShare = () => {
    const text = `${title}${description ? ` - ${description}` : ''}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + getShareUrl('whatsapp'))}`;
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
  };

  // Share via Email
  const handleEmailShare = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${description}\n\n${getShareUrl('email')}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setIsOpen(false);
  };

  // Main button click handler
  const handleMainClick = async () => {
    // Try native share first if available
    if (navigator.share) {
      const shared = await handleNativeShare();
      if (shared) return;
    }
    
    // Otherwise show share menu
    setIsOpen(true);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? 'ghost' : 'outline'}
          size={compact ? 'sm' : 'default'}
          onClick={handleMainClick}
          className={className}
        >
          <Share2 className={compact ? 'w-4 h-4' : 'w-4 h-4 mr-2'} />
          {!compact && 'Share'}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleTwitterShare}>
          <Twitter className="w-4 h-4 mr-2" />
          Share on Twitter
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleFacebookShare}>
          <Facebook className="w-4 h-4 mr-2" />
          Share on Facebook
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleWhatsAppShare}>
          <MessageCircle className="w-4 h-4 mr-2" />
          Share on WhatsApp
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleEmailShare}>
          <Mail className="w-4 h-4 mr-2" />
          Share via Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Quick Share Buttons
 * Display share buttons inline
 * 
 * @param {Object} props
 * @param {string} props.url - URL to share (required)
 * @param {string} props.title - Title of the content (required)
 * @param {string} props.description - Description of the content
 * @param {string} props.className - Additional CSS classes
 */
export function QuickShareButtons({ url, title, description, className = '' }) {
  const [copied, setCopied] = useState(false);

  // Validate required props
  if (!url || !title) {
    console.error('QuickShareButtons: url and title are required props');
    return null;
  }

  const getShareUrl = (platform) => {
    try {
      const shareUrl = new URL(url);
      shareUrl.searchParams.set('utm_source', platform);
      shareUrl.searchParams.set('utm_medium', 'social');
      shareUrl.searchParams.set('utm_campaign', 'share');
      return shareUrl.toString();
    } catch (error) {
      console.error('Invalid URL:', url);
      return url;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl('clipboard'));
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleTwitterShare = () => {
    const text = `${title}${description ? ` - ${description}` : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl('twitter'))}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl('facebook'))}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTwitterShare}
        className="hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]"
      >
        <Twitter className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleFacebookShare}
        className="hover:bg-[#4267B2]/10 hover:text-[#4267B2]"
      >
        <Facebook className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyLink}
        className="hover:bg-primary/10"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <LinkIcon className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

export default ShareButton;
