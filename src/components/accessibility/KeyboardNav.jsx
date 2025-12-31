import { useEffect } from 'react';

/**
 * Custom hook for keyboard navigation
 * Adds keyboard shortcuts for common actions
 */
export function useKeyboardNav() {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Skip if user is typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      
      // Ctrl/Cmd + K - Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('[data-search-trigger]')?.click();
      }
      
      // ESC - Close modals/panels
      if (e.key === 'Escape') {
        const closeButtons = document.querySelectorAll('[data-close-button]');
        closeButtons[closeButtons.length - 1]?.click();
      }
      
      // / - Focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector('input[type="search"]')?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}

/**
 * Trap focus within a container (for modals, drawers)
 * @param {React.RefObject} containerRef - Container ref
 * @param {boolean} isActive - Whether trap is active
 */
export function useFocusTrap(containerRef, isActive = true) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
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
    
    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [containerRef, isActive]);
}

/**
 * Announce to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' | 'assertive' (default: 'polite')
 */
export function announce(message, priority = 'polite') {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
}

/**
 * A11y Announcer Component
 * Add this to your Layout or App root
 */
export function A11yAnnouncer() {
  return (
    <div
      id="a11y-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}