import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  MapPin, Users, Calendar, ShoppingBag, Trophy, MessageSquare, 
  Bookmark, Music, Radio, Search, Bell, Heart, Star, Zap,
  Plus, ArrowRight
} from 'lucide-react';

// Predefined empty state configurations
const EMPTY_STATE_CONFIGS = {
  events: {
    icon: Calendar,
    title: "No Events Yet",
    description: "Discover exciting events happening near you or create your own beacon to bring people together.",
    actionLabel: "Explore Events",
    secondaryLabel: "Create Beacon",
    color: "#FF1493",
  },
  beacons: {
    icon: MapPin,
    title: "No Beacons Found",
    description: "Drop a beacon to let others know where you are or what you're up to. Be the spark!",
    actionLabel: "Create Beacon",
    color: "#00D9FF",
  },
  connections: {
    icon: Users,
    title: "No Connections Yet",
    description: "Start connecting with people who share your vibe. Swipe right to match!",
    actionLabel: "Discover People",
    color: "#B026FF",
  },
  messages: {
    icon: MessageSquare,
    title: "No Messages",
    description: "Your inbox is empty. Start a conversation with your connections!",
    actionLabel: "Find Someone",
    color: "#00D9FF",
  },
  bookmarks: {
    icon: Bookmark,
    title: "Nothing Saved",
    description: "Bookmark events, profiles, and products you want to remember.",
    actionLabel: "Browse",
    color: "#FFEB3B",
  },
  products: {
    icon: ShoppingBag,
    title: "No Products",
    description: "The marketplace awaits! List your items or discover unique finds.",
    actionLabel: "Browse Market",
    secondaryLabel: "Sell Something",
    color: "#FF1493",
  },
  achievements: {
    icon: Trophy,
    title: "No Achievements Yet",
    description: "Start earning achievements by exploring, connecting, and engaging with the community.",
    actionLabel: "View Challenges",
    color: "#FFEB3B",
  },
  checkins: {
    icon: MapPin,
    title: "No Check-ins",
    description: "Check into beacons and events to build your activity history.",
    actionLabel: "Find Beacons",
    color: "#39FF14",
  },
  squads: {
    icon: Users,
    title: "Not in Any Squads",
    description: "Join or create a squad to connect with like-minded people.",
    actionLabel: "Find Squads",
    secondaryLabel: "Create Squad",
    color: "#B026FF",
  },
  search: {
    icon: Search,
    title: "No Results Found",
    description: "Try adjusting your search or filters to find what you're looking for.",
    actionLabel: "Clear Filters",
    color: "#00D9FF",
  },
  notifications: {
    icon: Bell,
    title: "All Caught Up!",
    description: "You've seen all your notifications. Check back later!",
    color: "#FFEB3B",
  },
  music: {
    icon: Music,
    title: "No Tracks Yet",
    description: "Discover music from the community or upload your own tracks.",
    actionLabel: "Browse Music",
    color: "#B026FF",
  },
  radio: {
    icon: Radio,
    title: "Nothing Playing",
    description: "Tune into live radio shows and discover new sounds.",
    actionLabel: "Listen Now",
    color: "#FF1493",
  },
  favorites: {
    icon: Heart,
    title: "No Favorites",
    description: "Heart the things you love to save them here.",
    actionLabel: "Explore",
    color: "#FF1493",
  },
};

// Floating particles animation
const FloatingParticles = ({ color }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 6 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full opacity-20"
        style={{ 
          backgroundColor: color,
          left: `${20 + Math.random() * 60}%`,
          top: `${20 + Math.random() * 60}%`,
        }}
        animate={{
          y: [0, -20, 0],
          opacity: [0.1, 0.3, 0.1],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.5,
        }}
      />
    ))}
  </div>
);

export default function EmptyState({ 
  // Basic props
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel,
  // Enhanced props
  preset,
  secondaryAction,
  secondaryLabel,
  variant = 'default', // 'default', 'compact', 'card', 'full'
  color = '#FF1493',
  showParticles = false,
  showHint = false,
  hint,
  className,
}) {
  // Use preset config if provided
  const config = preset ? EMPTY_STATE_CONFIGS[preset] : null;
  const FinalIcon = Icon || config?.icon;
  const finalTitle = title || config?.title || 'Nothing Here';
  const finalDescription = description || config?.description || 'No content to display.';
  const finalActionLabel = actionLabel || config?.actionLabel;
  const finalSecondaryLabel = secondaryLabel || config?.secondaryLabel;
  const finalColor = color || config?.color || '#FF1493';

  // Variant styles
  const variants = {
    default: 'py-16 px-4',
    compact: 'py-8 px-4',
    card: 'py-12 px-6 bg-white/5 border border-white/10 rounded-xl',
    full: 'min-h-[60vh] py-16 px-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex flex-col items-center justify-center text-center",
        variants[variant],
        className
      )}
    >
      {/* Floating particles */}
      {showParticles && <FloatingParticles color={finalColor} />}

      {/* Icon */}
      {FinalIcon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="relative mb-6"
        >
          {/* Glow background */}
          <div 
            className="absolute inset-0 rounded-full blur-2xl opacity-20"
            style={{ backgroundColor: finalColor }}
          />
          
          {/* Icon container */}
          <div 
            className="relative w-20 h-20 rounded-full flex items-center justify-center border-2"
            style={{ 
              borderColor: `${finalColor}40`,
              backgroundColor: `${finalColor}10`,
            }}
          >
            <FinalIcon 
              className="w-10 h-10" 
              style={{ color: `${finalColor}80` }} 
            />
          </div>

          {/* Animated ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: finalColor }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-xl font-black uppercase mb-2">{finalTitle}</h3>
        <p className="text-white/60 mb-6 max-w-md text-sm">{finalDescription}</p>
      </motion.div>

      {/* Actions */}
      {(finalActionLabel || finalSecondaryLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {finalActionLabel && (
            <Button 
              onClick={action}
              className="font-black uppercase tracking-wider group"
              style={{ backgroundColor: finalColor, color: 'black' }}
            >
              <span>{finalActionLabel}</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
          
          {finalSecondaryLabel && (
            <Button 
              onClick={secondaryAction}
              variant="outline"
              className="font-black uppercase tracking-wider border-white/20 text-white hover:bg-white/5"
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>{finalSecondaryLabel}</span>
            </Button>
          )}
        </motion.div>
      )}

      {/* Hint */}
      {(showHint || hint) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex items-center gap-2 text-xs text-white/40"
        >
          <Zap className="w-3 h-3" />
          <span>{hint || 'Pro tip: Complete your profile to get personalized recommendations!'}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

// Pre-configured empty state components for common use cases
export const EventsEmptyState = (props) => <EmptyState preset="events" {...props} />;
export const BeaconsEmptyState = (props) => <EmptyState preset="beacons" {...props} />;
export const ConnectionsEmptyState = (props) => <EmptyState preset="connections" {...props} />;
export const MessagesEmptyState = (props) => <EmptyState preset="messages" {...props} />;
export const BookmarksEmptyState = (props) => <EmptyState preset="bookmarks" {...props} />;
export const ProductsEmptyState = (props) => <EmptyState preset="products" {...props} />;
export const AchievementsEmptyState = (props) => <EmptyState preset="achievements" {...props} />;
export const CheckinsEmptyState = (props) => <EmptyState preset="checkins" {...props} />;
export const SquadsEmptyState = (props) => <EmptyState preset="squads" {...props} />;
export const SearchEmptyState = (props) => <EmptyState preset="search" {...props} />;
export const NotificationsEmptyState = (props) => <EmptyState preset="notifications" {...props} />;