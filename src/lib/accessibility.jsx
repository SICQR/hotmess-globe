/**
 * Accessibility Utilities
 * 
 * Helper functions and hooks for improving accessibility.
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Trap focus within an element (for modals, dialogs)
 */
export function useFocusTrap(isActive = true) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = container.querySelectorAll(focusableSelector);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Return focus to trigger element when modal closes
 */
export function useFocusReturn() {
  const triggerRef = useRef(null);

  const setTrigger = useCallback((element) => {
    triggerRef.current = element || document.activeElement;
  }, []);

  const returnFocus = useCallback(() => {
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  return { setTrigger, returnFocus };
}

/**
 * Skip to main content link
 */
export function SkipToContent({ href = '#main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-[#E62020] focus:text-black focus:px-4 focus:py-2 focus:font-bold"
    >
      {children}
    </a>
  );
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Handle keyboard navigation in lists/grids
 */
export function useKeyboardNav(itemCount, options = {}) {
  const {
    orientation = 'vertical', // 'vertical', 'horizontal', 'grid'
    columns = 1,
    loop = true,
    onSelect,
    onEscape,
  } = options;

  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback((e) => {
    let newIndex = activeIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          e.preventDefault();
          newIndex = orientation === 'grid' 
            ? activeIndex + columns 
            : activeIndex + 1;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          e.preventDefault();
          newIndex = orientation === 'grid' 
            ? activeIndex - columns 
            : activeIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          e.preventDefault();
          newIndex = activeIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          e.preventDefault();
          newIndex = activeIndex - 1;
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = itemCount - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(activeIndex);
        return;
      case 'Escape':
        onEscape?.();
        return;
      default:
        return;
    }

    // Handle looping
    if (loop) {
      if (newIndex < 0) newIndex = itemCount - 1;
      if (newIndex >= itemCount) newIndex = 0;
    } else {
      newIndex = Math.max(0, Math.min(itemCount - 1, newIndex));
    }

    setActiveIndex(newIndex);
  }, [activeIndex, itemCount, orientation, columns, loop, onSelect, onEscape]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps: (index) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      onKeyDown: handleKeyDown,
      onFocus: () => setActiveIndex(index),
    }),
  };
}

// ============================================================================
// Announcements (Live Regions)
// ============================================================================

/**
 * Announce messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message, priority = 'polite') => {
    const container = document.getElementById('a11y-announcer') || createAnnouncer();
    
    // Clear previous announcement
    container.textContent = '';
    
    // Use timeout to ensure announcement is read
    setTimeout(() => {
      container.setAttribute('aria-live', priority);
      container.textContent = message;
    }, 100);
  }, []);

  return announce;
}

function createAnnouncer() {
  const container = document.createElement('div');
  container.id = 'a11y-announcer';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  container.className = 'sr-only';
  document.body.appendChild(container);
  return container;
}

/**
 * Live region component for dynamic content
 */
export function LiveRegion({ 
  children, 
  priority = 'polite', // 'polite', 'assertive'
  atomic = true,
  relevant = 'additions text',
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  );
}

// ============================================================================
// Reduced Motion
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// Color Contrast
// ============================================================================

/**
 * Check if user prefers high contrast
 */
export function usePrefersHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (e) => setPrefersHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersHighContrast;
}

// ============================================================================
// ARIA Helpers
// ============================================================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function useId(prefix = 'a11y') {
  const [id] = useState(() => `${prefix}-${++idCounter}`);
  return id;
}

/**
 * Common ARIA props for interactive elements
 */
export const ariaProps = {
  button: (isPressed, label) => ({
    role: 'button',
    'aria-pressed': isPressed,
    'aria-label': label,
    tabIndex: 0,
  }),
  
  toggle: (isChecked, label) => ({
    role: 'switch',
    'aria-checked': isChecked,
    'aria-label': label,
    tabIndex: 0,
  }),
  
  menu: (isExpanded, menuId) => ({
    'aria-expanded': isExpanded,
    'aria-haspopup': 'menu',
    'aria-controls': isExpanded ? menuId : undefined,
  }),
  
  tab: (isSelected, panelId) => ({
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': panelId,
    tabIndex: isSelected ? 0 : -1,
  }),
  
  tabPanel: (tabId, isHidden) => ({
    role: 'tabpanel',
    'aria-labelledby': tabId,
    hidden: isHidden,
    tabIndex: 0,
  }),
  
  dialog: (titleId, descId) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': descId,
  }),
};

// ============================================================================
// Visually Hidden (Screen Reader Only)
// ============================================================================

export function VisuallyHidden({ children, as: Component = 'span', ...props }) {
  return (
    <Component className="sr-only" {...props}>
      {children}
    </Component>
  );
}

// ============================================================================
// CSS for Screen Reader Only
// ============================================================================

// Add SR-only styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'a11y-sr-only-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
      .focus\\:not-sr-only:focus {
        position: static;
        width: auto;
        height: auto;
        padding: inherit;
        margin: inherit;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }
    `;
    document.head.appendChild(style);
  }
}

export default {
  useFocusTrap,
  useFocusReturn,
  useKeyboardNav,
  useAnnounce,
  usePrefersReducedMotion,
  usePrefersHighContrast,
  useId,
  ariaProps,
  SkipToContent,
  LiveRegion,
  VisuallyHidden,
};
