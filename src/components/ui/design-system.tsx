/**
 * HOTMESS Design System — Unified Component Library
 * 
 * All UI primitives follow the dark/gold glow theme.
 * Import these instead of creating one-off styles.
 */

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef, ReactNode } from 'react';
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
};
