import React from 'react';

/**
 * Skip to Content Link
 * Accessibility feature for keyboard navigation
 */
export function SkipToContent({ targetId = 'main-content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="
        sr-only focus:not-sr-only
        fixed top-0 left-0 z-[100]
        bg-[#FF1493] text-black
        px-4 py-2 font-bold
        focus:outline-none focus:ring-2 focus:ring-white
        transition-transform -translate-y-full focus:translate-y-0
      "
    >
      Skip to main content
    </a>
  );
}

/**
 * Visually Hidden Component
 * Hides content visually but keeps it accessible to screen readers
 */
export function VisuallyHidden({ children, as: Component = 'span' }) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

/**
 * Focus Visible Ring
 * Consistent focus ring for accessibility
 */
export function useFocusVisible() {
  return 'focus:outline-none focus:ring-2 focus:ring-[#FF1493] focus:ring-offset-2 focus:ring-offset-black';
}

/**
 * Announce to Screen Readers
 * For dynamic content updates
 */
export function Announce({ message, politeness = 'polite' }) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * High Contrast Toggle
 */
export function HighContrastToggle() {
  const [highContrast, setHighContrast] = React.useState(() => {
    return localStorage.getItem('highContrast') === 'true';
  });

  const toggle = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('highContrast', String(newValue));
    document.documentElement.classList.toggle('high-contrast', newValue);
  };

  React.useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    }
  }, []);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
      aria-pressed={highContrast}
    >
      <span className="text-lg" aria-hidden="true">◐</span>
      <span>High Contrast</span>
    </button>
  );
}

/**
 * Reduce Motion Preference Hook
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Focus Trap Hook
 * Traps focus within a container (useful for modals)
 */
export function useFocusTrap(containerRef, isActive = true) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

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
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}

/**
 * ARIA Live Region Component
 * For announcing dynamic updates
 */
export function LiveRegion({ children, assertive = false }) {
  return (
    <div
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

export default SkipToContent;
