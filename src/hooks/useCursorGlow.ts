import { useEffect, RefObject } from 'react';

/**
 * useCursorGlow - Add a glowing spotlight effect that follows the cursor
 * 
 * Usage:
 * ```tsx
 * function Card() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   useCursorGlow(ref);
 *   return <div ref={ref} className="cursor-glow">Content</div>;
 * }
 * ```
 * 
 * Required CSS:
 * ```css
 * .cursor-glow {
 *   position: relative;
 *   overflow: hidden;
 * }
 * .cursor-glow::before {
 *   content: '';
 *   position: absolute;
 *   width: 200px;
 *   height: 200px;
 *   background: radial-gradient(circle, rgba(255, 20, 147, 0.15) 0%, transparent 70%);
 *   transform: translate(-50%, -50%);
 *   left: var(--glow-x, 50%);
 *   top: var(--glow-y, 50%);
 *   pointer-events: none;
 *   opacity: 0;
 *   transition: opacity 0.3s;
 * }
 * .cursor-glow:hover::before {
 *   opacity: 1;
 * }
 * ```
 */
export function useCursorGlow(
  ref: RefObject<HTMLElement>,
  options: {
    color?: string;
    size?: number;
    disabled?: boolean;
  } = {}
) {
  const { disabled = false } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--glow-x', `${x}px`);
      el.style.setProperty('--glow-y', `${y}px`);
    };

    const handleEnter = () => {
      el.style.setProperty('--glow-opacity', '1');
    };

    const handleLeave = () => {
      el.style.setProperty('--glow-opacity', '0');
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [ref, disabled]);
}

/**
 * useCursorGlowMultiple - Apply cursor glow to multiple elements
 * Useful for grids of cards
 */
export function useCursorGlowMultiple(
  containerRef: RefObject<HTMLElement>,
  selector: string = '.cursor-glow'
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const elements = container.querySelectorAll(selector);
      elements.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (el as HTMLElement).style.setProperty('--glow-x', `${x}px`);
        (el as HTMLElement).style.setProperty('--glow-y', `${y}px`);
      });
    };

    container.addEventListener('mousemove', handleMove);
    return () => container.removeEventListener('mousemove', handleMove);
  }, [containerRef, selector]);
}

/**
 * useBorderGlow - Border glow effect that follows cursor along the edge
 */
export function useBorderGlow(
  ref: RefObject<HTMLElement>,
  options: {
    color?: string;
    width?: number;
    disabled?: boolean;
  } = {}
) {
  const { color = '#FF1493', width = 2, disabled = false } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate position as percentage
      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;
      
      el.style.setProperty('--border-x', `${xPercent}%`);
      el.style.setProperty('--border-y', `${yPercent}%`);
    };

    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, [ref, color, width, disabled]);
}

/**
 * CSS for cursor glow effects - add to your global CSS
 */
export const cursorGlowCSS = `
/* Basic cursor glow */
.cursor-glow {
  position: relative;
  overflow: hidden;
}

.cursor-glow::before {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(
    circle,
    rgba(255, 20, 147, 0.15) 0%,
    transparent 70%
  );
  transform: translate(-50%, -50%);
  left: var(--glow-x, 50%);
  top: var(--glow-y, 50%);
  pointer-events: none;
  transition: opacity 0.3s;
  opacity: var(--glow-opacity, 0);
}

.cursor-glow:hover::before {
  opacity: 1;
}

/* Cyan variant */
.cursor-glow-cyan::before {
  background: radial-gradient(
    circle,
    rgba(0, 217, 255, 0.15) 0%,
    transparent 70%
  );
}

/* Gold variant */
.cursor-glow-gold::before {
  background: radial-gradient(
    circle,
    rgba(255, 215, 0, 0.15) 0%,
    transparent 70%
  );
}

/* Purple variant */
.cursor-glow-purple::before {
  background: radial-gradient(
    circle,
    rgba(176, 38, 255, 0.15) 0%,
    transparent 70%
  );
}

/* Border glow effect */
.border-glow {
  position: relative;
}

.border-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(
    calc(var(--border-x, 50%) * 3.6deg),
    transparent,
    #FF1493,
    transparent
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.border-glow:hover::after {
  opacity: 1;
}

/* Holographic shine effect */
.holographic {
  position: relative;
  overflow: hidden;
}

.holographic::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.1) 45%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 55%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.holographic:hover::after {
  transform: translateX(100%);
}
`;

export default useCursorGlow;
