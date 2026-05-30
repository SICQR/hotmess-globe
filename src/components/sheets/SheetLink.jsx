/**
 * SheetLink — A link component that opens sheets instead of navigating
 * 
 * Usage:
 *   <SheetLink type="profile" props={{ email: 'user@example.com' }}>
 *     View Profile
 *   </SheetLink>
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';

// Map old routes to sheet types
const ROUTE_TO_SHEET = {
  '/profile': SHEET_TYPES.PROFILE,
  '/social/inbox': SHEET_TYPES.CHAT,
  '/social/t/': SHEET_TYPES.CHAT,
  '/market': SHEET_TYPES.SHOP,
  '/vault': SHEET_TYPES.VAULT,
  '/events/': SHEET_TYPES.EVENT,
};

// Get sheet type from route
function getSheetFromRoute(to) {
  if (!to) return null;
  
  for (const [route, sheetType] of Object.entries(ROUTE_TO_SHEET)) {
    if (to === route || to.startsWith(route)) {
      return sheetType;
    }
  }
  return null;
}

// Extract props from route
function getPropsFromRoute(to) {
  if (!to) return {};
  
  // /profile?email=X
  if (to.includes('/profile')) {
    const params = new URLSearchParams(to.split('?')[1] || '');
    const email = params.get('email');
    return email ? { email } : {};
  }
  
  // /events/:id
  if (to.startsWith('/events/')) {
    const id = to.split('/events/')[1]?.split('?')[0];
    return id ? { id: decodeURIComponent(id) } : {};
  }
  
  // /social/t/:id
  if (to.startsWith('/social/t/')) {
    const thread = to.split('/social/t/')[1]?.split('?')[0];
    return thread ? { thread } : {};
  }
  
  // /market/p/:handle
  if (to.startsWith('/market/p/')) {
    const handle = to.split('/market/p/')[1]?.split('?')[0];
    return handle ? { handle } : {};
  }
  
  return {};
}

/**
 * SheetLink - Use this to create links that open sheets
 * 
 * Props:
 * - type: Sheet type (SHEET_TYPES.PROFILE, etc) - if not provided, inferred from `to`
 * - props: Props to pass to the sheet
 * - to: Legacy route (optional) - for fallback if sheet context not available
 * - children: Link content
 * - className: CSS classes
 * - as: Component to render as (default: button/Link)
 */
export default function SheetLink({ 
  type, 
  props = {}, 
  to, 
  children, 
  className,
  as: Component,
  ...rest 
}) {
  let openSheet;
  try {
    const sheetContext = useSheet();
    openSheet = sheetContext?.openSheet;
  } catch {
    openSheet = null;
  }

  // Infer sheet type from route if not provided
  const sheetType = type || getSheetFromRoute(to);
  const sheetProps = { ...getPropsFromRoute(to), ...props };

  const handleClick = (e) => {
    if (openSheet && sheetType) {
      e.preventDefault();
      openSheet(sheetType, sheetProps);
    }
  };

  // If we have a sheet context and sheet type, use button
  if (openSheet && sheetType) {
    const Comp = Component || 'button';
    return (
      <Comp 
        onClick={handleClick} 
        className={className}
        {...rest}
      >
        {children}
      </Comp>
    );
  }

  // Fallback to regular Link
  if (to) {
    return (
      <Link to={to} className={className} {...rest}>
        {children}
      </Link>
    );
  }

  // No link at all, just render children
  const Comp = Component || 'span';
  return (
    <Comp className={className} {...rest}>
      {children}
    </Comp>
  );
}

/**
 * Convenience components for common sheet links
 */

export function ProfileLink({ email, children, className, ...rest }) {
  return (
    <SheetLink 
      type={SHEET_TYPES.PROFILE} 
      props={{ email }}
      to={email ? `/profile?email=${encodeURIComponent(email)}` : '/profile'}
      className={className}
      {...rest}
    >
      {children}
    </SheetLink>
  );
}

export function EventLink({ id, event, children, className, ...rest }) {
  return (
    <SheetLink 
      type={SHEET_TYPES.EVENT} 
      props={{ id, event }}
      to={`/events/${encodeURIComponent(id)}`}
      className={className}
      {...rest}
    >
      {children}
    </SheetLink>
  );
}

export function ChatLink({ thread, to: toEmail, children, className, ...rest }) {
  return (
    <SheetLink 
      type={SHEET_TYPES.CHAT} 
      props={{ thread, to: toEmail }}
      to={thread ? `/social/t/${thread}` : '/social/inbox'}
      className={className}
      {...rest}
    >
      {children}
    </SheetLink>
  );
}

export function ShopLink({ handle, children, className, ...rest }) {
  return (
    <SheetLink 
      type={SHEET_TYPES.SHOP} 
      props={{ handle }}
      to={handle ? `/market/p/${handle}` : '/market'}
      className={className}
      {...rest}
    >
      {children}
    </SheetLink>
  );
}

export function VaultLink({ children, className, ...rest }) {
  return (
    <SheetLink 
      type={SHEET_TYPES.VAULT} 
      to="/vault"
      className={className}
      {...rest}
    >
      {children}
    </SheetLink>
  );
}

export function GhostedLink({ children, className, ...rest }) {
  return (
    <SheetLink 
      type={SHEET_TYPES.GHOSTED} 
      to="/social"
      className={className}
      {...rest}
    >
      {children}
    </SheetLink>
  );
}
