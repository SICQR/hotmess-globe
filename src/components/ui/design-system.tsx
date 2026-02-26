/**
 * HOTMESS Design System — Unified Component Library
 * 
 * All UI primitives follow the dark/gold glow theme.
 * Import these instead of creating one-off styles.
 */

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// MOTION PRESETS
// ─────────────────────────────────────────────────────────────────────────────

export const motionPresets = {
  // Message bubble slide-in
  messageIn: {
    initial: { opacity: 0, y: 25 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 55, damping: 15 },
  },
  // Sheet slide-up
  sheetUp: {
    initial: { opacity: 0, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' },
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  // Modal scale-in
  modalIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2 },
  },
  // Fade in
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15 },
  },
  // Button tap
  buttonTap: {
    whileTap: { scale: 0.97 },
    whileHover: { boxShadow: '0 0 24px #FFC94088' },
  },
  // Pulse glow (for map markers, notifications)
  pulseGlow: {
    animate: {
      boxShadow: [
        '0 0 12px 2px #FFB80055',
        '0 0 24px 4px #FFB80088',
        '0 0 12px 2px #FFB80055',
      ],
    },
    transition: { duration: 2, repeat: Infinity },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY CTA BUTTON
// ─────────────────────────────────────────────────────────────────────────────

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const baseStyles = 'font-bold rounded-md transition-all duration-150 active:scale-[0.97]';
    
    const variants = {
      primary: 'bg-gold text-dark shadow-gold hover:shadow-[0_0_24px_#FFC94088]',
      secondary: 'bg-dark border border-gold text-gold hover:bg-gold/10',
      ghost: 'bg-transparent text-gold hover:bg-gold/10',
      danger: 'bg-red-600 text-white hover:bg-red-500',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileTap={{ scale: 0.97 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLES
// ─────────────────────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  message: string;
  isOutgoing?: boolean;
  timestamp?: string;
  className?: string;
}

export function ChatBubble({ message, isOutgoing = false, timestamp, className }: ChatBubbleProps) {
  return (
    <motion.div
      className={cn('flex py-1', isOutgoing ? 'justify-end' : 'justify-start')}
      {...motionPresets.messageIn}
    >
      <div
        className={cn(
          'rounded-bubble px-4 py-2 text-base max-w-[72%]',
          isOutgoing
            ? 'bg-gold text-dark shadow-gold'
            : 'bg-chatGray text-light',
          className
        )}
      >
        <p>{message}</p>
        {timestamp && (
          <span className={cn(
            'text-xs mt-1 block',
            isOutgoing ? 'text-dark/60' : 'text-muted'
          )}>
            {timestamp}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR WITH STATUS
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarProps {
  src: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  showGlow?: boolean;
  className?: string;
}

export function Avatar({ src, alt = '', size = 'md', status, showGlow = false, className }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };
  
  const statusColors = {
    online: 'bg-online',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <img
        src={src}
        alt={alt}
        className={cn(
          sizes[size],
          'rounded-full border-2 border-gold object-cover',
          showGlow && 'shadow-gold'
        )}
      />
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-darkest',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER INFO BAR
// ─────────────────────────────────────────────────────────────────────────────

interface UserInfoBarProps {
  avatar: string;
  username: string;
  tagline?: string;
  distance?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  onTap?: () => void;
}

export function UserInfoBar({ avatar, username, tagline, distance, status, onTap }: UserInfoBarProps) {
  return (
    <motion.div
      className="flex items-center px-4 py-3 gap-3 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
    >
      <Avatar src={avatar} size="lg" status={status} showGlow />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-light truncate">{username}</div>
        <div className="text-muted text-sm truncate">
          {tagline}
          {distance && <span className="ml-2">· {distance}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD (Generic container)
// ─────────────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  glow?: boolean;
  className?: string;
}

export function Card({ children, glow = false, className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-gray rounded-lg p-4',
        glow && 'shadow-gold border border-borderGlow',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP CARD (For meet-up location)
// ─────────────────────────────────────────────────────────────────────────────

interface MapCardProps {
  placeName: string;
  distance: string;
  travelTime: string;
  mapPreview?: string;
  onStart?: () => void;
  onUber?: () => void;
  onShare?: () => void;
}

export function MapCard({ placeName, distance, travelTime, mapPreview, onStart, onUber, onShare }: MapCardProps) {
  return (
    <Card glow className="flex flex-col gap-3">
      {mapPreview && (
        <div className="w-full h-32 rounded-md overflow-hidden bg-darkest">
          <img src={mapPreview} alt="Map" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="text-light font-semibold">{placeName}</div>
      <div className="flex items-center gap-2 text-muted text-xs">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {distance} · {travelTime}
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="primary" size="sm" onClick={onStart}>Start</Button>
        <Button variant="secondary" size="sm" onClick={onUber}>Uber</Button>
        <Button variant="secondary" size="sm" onClick={onShare}>Share</Button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT INPUT
// ─────────────────────────────────────────────────────────────────────────────

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  onSend?: () => void;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, icon, onSend, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2 bg-gray rounded-full px-4 py-2 border border-borderGlow focus-within:ring-2 focus-within:ring-gold/50">
        {icon && <span className="text-muted">{icon}</span>}
        <input
          ref={ref}
          className={cn(
            'flex-1 bg-transparent text-light placeholder-muted outline-none',
            className
          )}
          {...props}
        />
        {onSend && (
          <button
            onClick={onSend}
            className="text-gold hover:text-goldGlow transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

// ─────────────────────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  variant?: 'gold' | 'pink' | 'green' | 'gray';
  pulse?: boolean;
}

export function Badge({ children, variant = 'gold', pulse = false }: BadgeProps) {
  const variants = {
    gold: 'bg-gold text-dark',
    pink: 'bg-accent text-white',
    green: 'bg-online text-dark',
    gray: 'bg-chatGray text-light',
  };

  return (
    <motion.span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
        variants[variant]
      )}
      animate={pulse ? { scale: [1, 1.05, 1] } : undefined}
      transition={pulse ? { duration: 1, repeat: Infinity } : undefined}
    >
      {children}
    </motion.span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  title?: string;
  showBrand?: boolean;
  onBack?: () => void;
  onOptions?: () => void;
  children?: ReactNode;
}

export function Header({ title, showBrand = false, onBack, onOptions, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-darkest/95 backdrop-blur border-b border-borderGlow">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-light hover:text-gold transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {showBrand ? (
          <span className="text-gold text-xl font-bold tracking-wide drop-shadow-[0_0_14px_#FFB80099]">
            HOTMESS
          </span>
        ) : (
          <span className="text-light font-bold text-lg">{title}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onOptions && (
          <button onClick={onOptions} className="text-light hover:text-gold transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER CARD (For grid displays - Ghosted, Friends)
// ─────────────────────────────────────────────────────────────────────────────

interface UserCardProps {
  avatarSrc: string;
  username: string;
  distance?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  onTap?: () => void;
  className?: string;
}

export function UserCard({ avatarSrc, username, distance, status, onTap, className }: UserCardProps) {
  const statusColors = {
    online: 'bg-online',
    offline: 'bg-gray-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center p-3 rounded-[1.5em] bg-chatGray shadow-gold cursor-pointer',
        'hover:shadow-[0_0_20px_#FFC94088] transition-shadow',
        className
      )}
      onClick={onTap}
      whileTap={{ scale: 0.97 }}
      whileHover={{ boxShadow: '0 0 24px #FFC94088' }}
    >
      {/* Avatar with status */}
      <div className="relative mb-2">
        <img
          src={avatarSrc}
          alt={username}
          className="w-[70px] h-[85px] rounded-xl object-cover border-2 border-gold shadow-gold"
        />
        {status && (
          <span
            className={cn(
              'absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-darkest',
              statusColors[status]
            )}
          />
        )}
      </div>
      
      {/* Username */}
      <span className="font-bold text-light text-sm truncate max-w-full font-mono">
        {username}
      </span>
      
      {/* Distance */}
      {distance && (
        <span className="text-muted text-xs mt-0.5">
          {distance}
        </span>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER GRID (Container for UserCards)
// ─────────────────────────────────────────────────────────────────────────────

interface UserGridProps {
  children: ReactNode;
  className?: string;
}

export function UserGrid({ children, className }: UserGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 p-4', className)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: () => void;
  className?: string;
}

export function SearchBar({ placeholder = 'Search...', value, onChange, onSearch, className }: SearchBarProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4', className)}>
      <div className="flex-1 flex items-center gap-3 bg-chatGray rounded-full px-4 py-3 border border-borderGlow focus-within:border-gold transition-colors">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-light placeholder-muted outline-none text-sm"
        />
        <button onClick={onSearch} className="text-gold hover:text-goldGlow transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY TABS (Market filters)
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function CategoryTabs({ tabs, activeTab, onTabChange, className }: CategoryTabsProps) {
  return (
    <div className={cn('flex gap-3 px-4 overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <motion.button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all',
            activeTab === tab
              ? 'bg-gold text-dark shadow-gold'
              : 'bg-dark text-gold border border-gold hover:bg-gold/10'
          )}
          whileTap={{ scale: 0.95 }}
        >
          {tab}
        </motion.button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD (Market items)
// ─────────────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  image: string;
  brand: string;
  title: string;
  price: string;
  stock?: string;
  onBuy?: () => void;
  onDetails?: () => void;
  className?: string;
}

export function ProductCard({ image, brand, title, price, stock, onBuy, onDetails, className }: ProductCardProps) {
  return (
    <motion.div
      className={cn('bg-gray rounded-lg shadow-gold p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-4 mb-3">
        <img
          src={image}
          alt={title}
          className="w-20 h-20 object-cover rounded-lg border-2 border-gold"
        />
        <div className="flex-1 min-w-0">
          <div className="text-gold font-bold">{brand}</div>
          <div className="text-light font-semibold truncate">{title}</div>
          <div className="text-muted text-sm mt-1">
            {stock && <span>{stock} · </span>}{price}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="primary" size="sm" className="flex-1" onClick={onBuy}>
          Buy Now
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={onDetails}>
          Details
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTER CARD (Map clusters)
// ─────────────────────────────────────────────────────────────────────────────

interface ClusterCardProps {
  name: string;
  distance: string;
  userCount?: number;
  onView?: () => void;
  className?: string;
}

export function ClusterCard({ name, distance, userCount, onView, className }: ClusterCardProps) {
  return (
    <motion.div
      className={cn(
        'bg-gray py-3 px-4 rounded-lg flex justify-between items-center shadow-gold',
        className
      )}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
        </div>
        <div>
          <div className="text-light font-semibold">{name}</div>
          <div className="text-muted text-xs">
            {distance}
            {userCount && <span> · {userCount} nearby</span>}
          </div>
        </div>
      </div>
      <Button variant="primary" size="sm" onClick={onView}>
        View
      </Button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD (Trending/Home)
// ─────────────────────────────────────────────────────────────────────────────

interface EventCardProps {
  image?: string;
  title: string;
  subtitle: string;
  onTap?: () => void;
  className?: string;
}

export function EventCard({ image, title, subtitle, onTap, className }: EventCardProps) {
  return (
    <motion.div
      className={cn(
        'bg-gray rounded-lg shadow-gold p-4 flex flex-col items-center cursor-pointer',
        'hover:shadow-[0_0_20px_#FFC94088] transition-shadow',
        className
      )}
      onClick={onTap}
      whileTap={{ scale: 0.97 }}
    >
      {image && (
        <img src={image} alt={title} className="w-full h-24 object-cover rounded-md mb-2" />
      )}
      <span className="font-semibold text-light text-center">{title}</span>
      <span className="text-accent text-sm mt-1">{subtitle}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE INPUT BAR
// ─────────────────────────────────────────────────────────────────────────────

interface MessageInputBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: () => void;
  onAttach?: () => void;
  placeholder?: string;
  className?: string;
}

export function MessageInputBar({ value, onChange, onSend, onAttach, placeholder = 'Type a message...', className }: MessageInputBarProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 bg-darkest border-t border-borderGlow', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-chatGray text-light rounded-full px-4 py-2.5 border border-borderGlow placeholder-muted outline-none focus:border-gold transition-colors"
      />
      {onAttach && (
        <button onClick={onAttach} className="text-gold hover:text-goldGlow transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
      )}
      {onSend && (
        <button onClick={onSend} className="text-gold hover:text-goldGlow transition-colors">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM SHEET (Modal drawer)
// ─────────────────────────────────────────────────────────────────────────────

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* Sheet */}
      <motion.div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-darkest rounded-t-[1.5em] shadow-gold p-6',
          className
        )}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gold/40 rounded-full mx-auto mb-4" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-gold hover:text-goldGlow transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {title && (
          <h3 className="text-lg font-bold text-light mb-4 text-center">{title}</h3>
        )}
        
        {children}
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE RADIO BAR
// ─────────────────────────────────────────────────────────────────────────────

interface LiveRadioBarProps {
  show: string;
  isLive?: boolean;
  onListen?: () => void;
  onFollow?: () => void;
  className?: string;
}

export function LiveRadioBar({ show, isLive = true, onListen, onFollow, className }: LiveRadioBarProps) {
  return (
    <div className={cn('bg-darkest border-t border-borderGlow shadow-gold flex items-center px-4 py-3 gap-4', className)}>
      {isLive && <Badge variant="pink" pulse>LIVE</Badge>}
      <span className="font-bold text-gold flex-1 truncate">{show}</span>
      <Button variant="primary" size="sm" onClick={onListen}>Listen</Button>
      {onFollow && (
        <Button variant="secondary" size="sm" onClick={onFollow}>Follow</Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT COUNTDOWN CARD
// ─────────────────────────────────────────────────────────────────────────────

interface EventCountdownCardProps {
  title: string;
  timeLeft: string;
  image?: string;
  onNotify?: () => void;
  className?: string;
}

export function EventCountdownCard({ title, timeLeft, image, onNotify, className }: EventCountdownCardProps) {
  return (
    <motion.div
      className={cn('bg-gold rounded-lg shadow-gold p-4 flex flex-col items-center gap-2', className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {image && (
        <img src={image} alt={title} className="w-16 h-16 rounded-lg object-cover" />
      )}
      <div className="font-bold text-dark text-lg text-center">{title}</div>
      <div className="text-dark/80 text-sm">Starts in {timeLeft}</div>
      {onNotify && (
        <Button variant="secondary" size="sm" onClick={onNotify} className="mt-2">
          Get Notified
        </Button>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUAD MEMBER CARD
// ─────────────────────────────────────────────────────────────────────────────

interface SquadMemberCardProps {
  name: string;
  avatar: string;
  role?: string;
  status?: 'online' | 'offline' | 'away';
  onPromote?: () => void;
  onKick?: () => void;
  className?: string;
}

export function SquadMemberCard({ name, avatar, role, status, onPromote, onKick, className }: SquadMemberCardProps) {
  return (
    <div className={cn('flex items-center gap-4 py-2', className)}>
      <Avatar src={avatar} size="md" status={status} />
      <div className="flex-1 min-w-0">
        <span className="font-bold text-light block truncate">{name}</span>
        {role && <span className="text-muted text-xs">{role}</span>}
      </div>
      {onPromote && (
        <button onClick={onPromote} className="text-gold hover:text-goldGlow transition-colors p-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
      {onKick && (
        <button onClick={onKick} className="text-accent hover:text-red-400 transition-colors p-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUAD ACTION BAR
// ─────────────────────────────────────────────────────────────────────────────

interface SquadActionBarProps {
  onInvite?: () => void;
  onChat?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function SquadActionBar({ onInvite, onChat, onSettings, className }: SquadActionBarProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      {onInvite && <Button variant="secondary" size="sm" onClick={onInvite}>Invite</Button>}
      {onChat && <Button variant="secondary" size="sm" onClick={onChat}>Chat</Button>}
      {onSettings && <Button variant="ghost" size="sm" onClick={onSettings}>Settings</Button>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <hr className={cn('border-t border-gold/30 my-4', className)} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL GATE OVERLAY (Content gating)
// ─────────────────────────────────────────────────────────────────────────────

interface LevelGateOverlayProps {
  requiredLevel: number;
  userLevel: number;
  onUpgrade?: () => void;
  children: ReactNode;
  className?: string;
}

export function LevelGateOverlay({ requiredLevel, userLevel, onUpgrade, children, className }: LevelGateOverlayProps) {
  const locked = userLevel < requiredLevel;

  return (
    <div className={cn('relative', className)}>
      {/* Content - blurred when locked */}
      <div className={locked ? 'filter blur-sm grayscale opacity-60 pointer-events-none select-none' : ''}>
        {children}
      </div>

      {/* Lock overlay */}
      {locked && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-darkest/80 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-gold" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </div>
          <span className="text-gold font-bold text-sm mb-1">Level {requiredLevel} Required</span>
          <span className="text-muted text-xs mb-3">You're Level {userLevel}</span>
          {onUpgrade && (
            <Button variant="primary" size="sm" onClick={onUpgrade}>
              Upgrade
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENT DIALOG
// ─────────────────────────────────────────────────────────────────────────────

interface ConsentDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  acceptLabel?: string;
  declineLabel?: string;
  onAccept: () => void;
  onDecline: () => void;
  icon?: ReactNode;
}

export function ConsentDialog({
  isOpen,
  title,
  description,
  acceptLabel = 'Accept',
  declineLabel = 'Decline',
  onAccept,
  onDecline,
  icon,
}: ConsentDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/70 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      {/* Dialog */}
      <motion.div
        className="fixed inset-x-4 bottom-8 z-50 bg-darkest rounded-2xl shadow-gold p-6 max-w-md mx-auto"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Icon */}
        {icon && (
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
            {icon}
          </div>
        )}

        <h2 className="font-bold text-gold text-xl mb-2 text-center">{title}</h2>
        <p className="text-muted text-sm mb-6 text-center leading-relaxed">{description}</p>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onDecline}>
            {declineLabel}
          </Button>
          <Button variant="primary" className="flex-1" onClick={onAccept}>
            {acceptLabel}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION MODAL (Success/Error states)
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'success' | 'error' | 'warning';
  title: string;
  description?: string;
  actionLabel?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  variant = 'success',
  title,
  description,
  actionLabel = 'Done',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const icons = {
    success: (
      <svg className="w-8 h-8 text-gold" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    ),
    error: (
      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
    warning: (
      <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      </svg>
    ),
  };

  const bgColors = {
    success: 'bg-gold/20',
    error: 'bg-red-500/20',
    warning: 'bg-yellow-500/20',
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/70 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* Modal */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="bg-darkest rounded-2xl shadow-gold p-8 max-w-sm w-full text-center">
          <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', bgColors[variant])}>
            {icons[variant]}
          </div>
          <h2 className="font-bold text-light text-xl mb-2">{title}</h2>
          {description && <p className="text-muted text-sm mb-6">{description}</p>}
          <Button variant="primary" onClick={onClose} className="w-full">
            {actionLabel}
          </Button>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-darkest/90 z-50 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <span className="text-gold font-bold mt-4">{message}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH INPUT FIELD (Login/Signup forms)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, iconRight, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-muted text-sm mb-1.5 font-medium">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold">{icon}</span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-chatGray text-light rounded-full px-5 py-3 border-2 transition-colors',
              'placeholder-muted outline-none focus:ring-2 focus:ring-gold/30',
              error ? 'border-red-500 focus:border-red-400' : 'border-borderGlow focus:border-gold',
              icon && 'pl-12',
              iconRight && 'pr-12',
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gold">{iconRight}</span>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);
AuthInput.displayName = 'AuthInput';

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD INPUT (with visibility toggle)
// ─────────────────────────────────────────────────────────────────────────────

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function PasswordInput({ label, error, icon, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-muted text-sm mb-1.5 font-medium">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold">{icon}</span>
        )}
        <input
          type={visible ? 'text' : 'password'}
          className={cn(
            'w-full bg-chatGray text-light rounded-full px-5 py-3 pr-12 border-2 transition-colors',
            'placeholder-muted outline-none focus:ring-2 focus:ring-gold/30',
            error ? 'border-red-500 focus:border-red-400' : 'border-borderGlow focus:border-gold',
            icon && 'pl-12',
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gold hover:text-goldGlow transition-colors"
          tabIndex={-1}
        >
          {visible ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKBOX (Terms/Consent)
// ─────────────────────────────────────────────────────────────────────────────

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  className?: string;
}

export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer', className)}>
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
          checked ? 'bg-gold border-gold' : 'bg-transparent border-borderGlow'
        )}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg className="w-3 h-3 text-dark" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        )}
      </div>
      <span className="text-muted text-sm leading-tight">{label}</span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT LINK (Forgot password, etc.)
// ─────────────────────────────────────────────────────────────────────────────

interface TextLinkProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function TextLink({ children, onClick, href, className }: TextLinkProps) {
  const baseStyles = 'text-gold hover:text-goldGlow transition-colors text-sm font-medium cursor-pointer';
  
  if (href) {
    return <a href={href} className={cn(baseStyles, className)}>{children}</a>;
  }
  
  return (
    <button type="button" onClick={onClick} className={cn(baseStyles, className)}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND HEADER (Welcome/Auth screens)
// ─────────────────────────────────────────────────────────────────────────────

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  className?: string;
}

export function BrandHeader({ title, subtitle, showLogo = true, className }: BrandHeaderProps) {
  return (
    <div className={cn('text-center py-8', className)}>
      {showLogo && (
        <h1 className="text-gold text-4xl font-bold font-mono tracking-wider mb-2 drop-shadow-[0_0_20px_#FFB80066]">
          HOTMESS
        </h1>
      )}
      {title && <h2 className="text-light text-xl font-bold mb-1">{title}</h2>}
      {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR UPLOAD (Profile setup)
// ─────────────────────────────────────────────────────────────────────────────

interface AvatarUploadProps {
  src?: string;
  onUpload: () => void;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarUpload({ src, onUpload, size = 'xl', className }: AvatarUploadProps) {
  const sizes = {
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          sizes[size],
          'rounded-full border-4 border-gold bg-chatGray flex items-center justify-center overflow-hidden shadow-gold'
        )}
      >
        {src ? (
          <img src={src} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-1/2 h-1/2 text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
      <motion.button
        onClick={onUpload}
        className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-gold text-dark flex items-center justify-center shadow-gold"
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          <path d="M9.5 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" opacity="0" />
        </svg>
      </motion.button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE INPUT (Join codes, OTP, verification)
// ─────────────────────────────────────────────────────────────────────────────

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function CodeInput({ length = 6, value, onChange, error, className }: CodeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const char = e.target.value.slice(-1).toUpperCase();
    const newValue = value.split('');
    newValue[index] = char;
    onChange(newValue.join(''));
    
    // Auto-focus next input
    if (char && index < length - 1) {
      const next = e.target.nextElementSibling as HTMLInputElement;
      next?.focus();
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="flex gap-2">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(e, i)}
            className={cn(
              'w-12 h-14 text-center text-2xl font-bold font-mono rounded-lg border-2 transition-colors',
              'bg-chatGray text-gold outline-none',
              error ? 'border-red-500' : 'border-borderGlow focus:border-gold'
            )}
          />
        ))}
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTAINER (Full-screen auth layout)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContainerProps {
  children: ReactNode;
  onBack?: () => void;
  className?: string;
}

export function AuthContainer({ children, onBack, className }: AuthContainerProps) {
  return (
    <div className={cn('min-h-screen bg-dark flex flex-col', className)}>
      {/* Back button */}
      {onBack && (
        <div className="p-4">
          <button onClick={onBack} className="text-gold hover:text-goldGlow transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pb-8">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  motionPresets,
  Button,
  ChatBubble,
  Avatar,
  UserInfoBar,
  Card,
  MapCard,
  TextInput,
  Badge,
  Header,
  UserCard,
  UserGrid,
  SearchBar,
  CategoryTabs,
  ProductCard,
  ClusterCard,
  EventCard,
  MessageInputBar,
  BottomSheet,
  LiveRadioBar,
  EventCountdownCard,
  SquadMemberCard,
  SquadActionBar,
  Divider,
  LevelGateOverlay,
  ConsentDialog,
  ConfirmationModal,
  LoadingOverlay,
  // Auth & Onboarding
  AuthInput,
  PasswordInput,
  Checkbox,
  TextLink,
  BrandHeader,
  AvatarUpload,
  CodeInput,
  AuthContainer,
};
