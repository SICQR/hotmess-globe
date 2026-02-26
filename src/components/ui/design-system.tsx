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
};
