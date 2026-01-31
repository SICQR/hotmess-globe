import { Badge } from '@/components/ui/badge';
import { 
  User, 
  ShoppingBag, 
  Store, 
  Star, 
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_CONFIG, usePrimaryRole, getRoleBadges } from '@/hooks/useUserRoles';

const ROLE_ICONS = {
  social: User,
  buyer: ShoppingBag,
  seller: Store,
  creator: Star,
  organiser: Calendar,
};

const ROLE_COLORS = {
  social: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  buyer: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  seller: 'bg-green-500/20 text-green-300 border-green-500/30',
  creator: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  organiser: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

/**
 * Single role badge
 */
export function RoleBadge({ 
  role, 
  isVerified = false, 
  size = 'sm',
  showLabel = true,
  className 
}) {
  const config = ROLE_CONFIG[role];
  if (!config) return null;
  
  const Icon = ROLE_ICONS[role] || User;
  const colorClass = ROLE_COLORS[role] || ROLE_COLORS.social;
  
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };
  
  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 14,
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'inline-flex items-center font-medium border',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
      {isVerified && (
        <CheckCircle2 size={iconSizes[size]} className="text-green-400" />
      )}
    </Badge>
  );
}

/**
 * Primary role badge for a user (shows highest priority role)
 */
export function PrimaryRoleBadge({ userId, size = 'sm', className }) {
  const { role, isVerified, isLoading } = usePrimaryRole(userId);
  
  if (isLoading || !role || role === 'social') {
    return null;
  }
  
  return (
    <RoleBadge 
      role={role} 
      isVerified={isVerified} 
      size={size}
      className={className}
    />
  );
}

/**
 * All role badges for a user (excluding social)
 */
export function RoleBadges({ roles, size = 'xs', max = 2, className }) {
  const badges = getRoleBadges(roles);
  
  if (!badges.length) return null;
  
  const visibleBadges = badges.slice(0, max);
  const hiddenCount = badges.length - max;
  
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleBadges.map(({ role, is_verified }) => (
        <RoleBadge 
          key={role}
          role={role}
          isVerified={is_verified}
          size={size}
          showLabel={size !== 'xs'}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge 
          variant="outline" 
          className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white/60"
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}

/**
 * Inline role indicator (icon only, for tight spaces)
 */
export function RoleIndicator({ role, isVerified = false, className }) {
  const Icon = ROLE_ICONS[role] || User;
  const config = ROLE_CONFIG[role];
  
  if (!config || role === 'social') return null;
  
  const colorMap = {
    buyer: 'text-blue-400',
    seller: 'text-green-400',
    creator: 'text-purple-400',
    organiser: 'text-orange-400',
  };
  
  return (
    <span 
      className={cn('inline-flex items-center gap-0.5', className)}
      title={`${config.label}${isVerified ? ' (Verified)' : ''}`}
    >
      <Icon size={14} className={colorMap[role]} />
      {isVerified && <CheckCircle2 size={10} className="text-green-400" />}
    </span>
  );
}

export default RoleBadge;
