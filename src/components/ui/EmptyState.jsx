/**
 * EmptyState & ErrorState - Unified feedback components
 * 
 * Use EmptyState when: No data to show
 * Use ErrorState when: Something went wrong
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Inbox, Calendar, MessageCircle, ShoppingBag, 
  MapPin, Users, Heart, Search, AlertTriangle,
  RefreshCw, WifiOff, ServerCrash
} from 'lucide-react';

// Preset icons for common empty states
const PRESETS = {
  messages: { icon: MessageCircle, title: 'No messages yet', description: 'Start a conversation with someone nearby' },
  events: { icon: Calendar, title: 'No events', description: 'Check back later for upcoming events' },
  shop: { icon: ShoppingBag, title: 'Nothing here', description: 'Products will appear here soon' },
  beacons: { icon: MapPin, title: 'No check-ins nearby', description: 'Be the first to drop a beacon' },
  people: { icon: Users, title: 'No one here', description: 'Try expanding your search' },
  favorites: { icon: Heart, title: 'No favorites yet', description: 'Tap the heart on profiles you like' },
  search: { icon: Search, title: 'No results', description: 'Try different keywords' },
  inbox: { icon: Inbox, title: 'All caught up', description: 'No new notifications' },
};

export default function EmptyState({ 
  // Content
  icon: Icon, 
  title, 
  description,
  // Action button
  action, 
  actionLabel,
  actionVariant = 'hot',
  // Preset (auto-fills icon/title/description)
  preset,
  // Size variant
  size = 'default',
  // Custom styling
  className = '',
}) {
  // Use preset values if provided
  const presetConfig = preset ? PRESETS[preset] : null;
  const FinalIcon = Icon || presetConfig?.icon || Inbox;
  const finalTitle = title || presetConfig?.title || 'Nothing here';
  const finalDescription = description || presetConfig?.description || '';

  const sizeClasses = {
    small: 'py-8 px-4',
    default: 'py-16 px-4',
    large: 'py-24 px-6',
  };

  const iconSizes = {
    small: 'w-12 h-12',
    default: 'w-20 h-20',
    large: 'w-24 h-24',
  };

  const iconInnerSizes = {
    small: 'w-6 h-6',
    default: 'w-10 h-10',
    large: 'w-12 h-12',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}
    >
      <div className={`${iconSizes[size]} rounded-full bg-white/5 flex items-center justify-center mb-6`}>
        <FinalIcon className={`${iconInnerSizes[size]} text-white/20`} />
      </div>
      <h3 className={`font-black uppercase mb-2 ${size === 'small' ? 'text-base' : 'text-xl'}`}>
        {finalTitle}
      </h3>
      {finalDescription && (
        <p className={`text-white/60 mb-6 max-w-md ${size === 'small' ? 'text-sm' : ''}`}>
          {finalDescription}
        </p>
      )}
      {action && actionLabel && (
        <Button 
          onClick={action} 
          variant={actionVariant}
          className="font-black"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

// Error state component
export function ErrorState({
  // Content
  title = 'Something went wrong',
  description = 'We couldn\'t load this content. Please try again.',
  error,
  // Retry action
  onRetry,
  retryLabel = 'Try Again',
  // Error type (affects icon)
  type = 'generic', // 'generic' | 'network' | 'server' | 'notFound'
  // Size
  size = 'default',
  className = '',
}) {
  const icons = {
    generic: AlertTriangle,
    network: WifiOff,
    server: ServerCrash,
    notFound: Search,
  };

  const Icon = icons[type] || AlertTriangle;

  const sizeClasses = {
    small: 'py-8 px-4',
    default: 'py-16 px-4',
    large: 'py-24 px-6',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}
    >
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-red-400" />
      </div>
      <h3 className="text-xl font-black uppercase mb-2 text-red-400">
        {title}
      </h3>
      <p className="text-white/60 mb-2 max-w-md">
        {description}
      </p>
      {error && import.meta.env.DEV && (
        <p className="text-xs text-white/30 mb-4 max-w-md font-mono">
          {error.message || String(error)}
        </p>
      )}
      {onRetry && (
        <Button 
          onClick={onRetry} 
          variant="outline"
          className="font-black gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {retryLabel}
        </Button>
      )}
    </motion.div>
  );
}

// Loading state (for consistency)
export function LoadingState({ text = 'Loading...', size = 'default' }) {
  const sizeClasses = {
    small: 'py-8',
    default: 'py-16',
    large: 'py-24',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]}`}>
      <div className="w-8 h-8 border-4 border-white/20 border-t-[#FF1493] rounded-full animate-spin mb-4" />
      <p className="text-white/40 text-sm">{text}</p>
    </div>
  );
}
