import { useEffect, useCallback, RefObject } from 'react';

/**
 * Hook to add cursor-following glow effect to an element
 * Creates a spotlight effect that follows the mouse
 */
export function useCursorGlow(
  ref: RefObject<HTMLElement>,
  options: {
    enabled?: boolean;
    glowColor?: string;
    glowSize?: number;
    intensity?: number;
  } = {}
) {
  const {
    enabled = true,
    glowColor = 'rgba(255, 20, 147, 0.15)',
    glowSize = 200,
    intensity = 1,
  } = options;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = ref.current;
      if (!el || !enabled) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if mouse is within element bounds
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        el.style.setProperty('--glow-opacity', '0');
        return;
      }

      el.style.setProperty('--glow-x', `${x}px`);
      el.style.setProperty('--glow-y', `${y}px`);
      el.style.setProperty('--glow-color', glowColor);
      el.style.setProperty('--glow-size', `${glowSize}px`);
      el.style.setProperty('--glow-opacity', String(intensity));
    },
    [ref, enabled, glowColor, glowSize, intensity]
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--glow-opacity', '0');
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, enabled, handleMouseMove, handleMouseLeave]);
}

/**
 * CSS to be added for cursor glow effect:
 * 
 * .cursor-glow {
 *   position: relative;
 *   overflow: hidden;
 * }
 * 
 * .cursor-glow::before {
 *   content: '';
 *   position: absolute;
 *   width: var(--glow-size, 200px);
 *   height: var(--glow-size, 200px);
 *   background: radial-gradient(
 *     circle,
 *     var(--glow-color, rgba(255, 20, 147, 0.15)) 0%,
 *     transparent 70%
 *   );
 *   transform: translate(-50%, -50%);
 *   left: var(--glow-x, 50%);
 *   top: var(--glow-y, 50%);
 *   pointer-events: none;
 *   opacity: var(--glow-opacity, 0);
 *   transition: opacity 0.3s ease;
 *   z-index: 1;
 * }
 */

export default useCursorGlow;
