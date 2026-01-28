import { useCallback, useState } from 'react';

/**
 * Hook for card hover interactions
 * Provides smooth hover state with lift and shadow effects
 */
export function useCardHover() {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: useCallback(() => setIsHovered(false), []),
    style: {
      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      boxShadow: isHovered 
        ? '0 10px 40px rgba(255, 20, 147, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3)'
        : '0 2px 8px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
    },
  };

  return { isHovered, hoverProps };
}

/**
 * Hook for button press interactions
 * Provides scale feedback on press
 */
export function useButtonPress() {
  const [isPressed, setIsPressed] = useState(false);

  const pressProps = {
    onMouseDown: useCallback(() => setIsPressed(true), []),
    onMouseUp: useCallback(() => setIsPressed(false), []),
    onMouseLeave: useCallback(() => setIsPressed(false), []),
    onTouchStart: useCallback(() => setIsPressed(true), []),
    onTouchEnd: useCallback(() => setIsPressed(false), []),
    style: {
      transform: isPressed ? 'scale(0.97)' : 'scale(1)',
      transition: 'transform 0.1s ease-out',
    },
  };

  return { isPressed, pressProps };
}

/**
 * Hook for focus ring interactions
 * Provides visible focus states for accessibility
 */
export function useFocusRing(options = {}) {
  const { color = '#FF1493', offset = 2 } = options;
  const [isFocused, setIsFocused] = useState(false);

  const focusProps = {
    onFocus: useCallback(() => setIsFocused(true), []),
    onBlur: useCallback(() => setIsFocused(false), []),
    style: {
      outline: isFocused ? `2px solid ${color}` : 'none',
      outlineOffset: isFocused ? `${offset}px` : 0,
      transition: 'outline 0.2s ease-out, outline-offset 0.2s ease-out',
    },
  };

  return { isFocused, focusProps };
}

/**
 * Hook for magnetic hover effect
 * Element subtly follows cursor on hover
 */
export function useMagneticHover(strength = 0.3) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    setPosition({ x, y });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  const magneticProps = {
    onMouseMove: handleMouseMove,
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: handleMouseLeave,
    style: {
      transform: `translate(${position.x}px, ${position.y}px)`,
      transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out',
    },
  };

  return { position, isHovered, magneticProps };
}

/**
 * Hook for tilt effect on cards
 * Provides 3D tilt effect based on mouse position
 */
export function useTilt(options = {}) {
  const { maxTilt = 10, scale = 1.02, speed = 400 } = options;
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const rotateY = ((mouseX / width) - 0.5) * maxTilt * 2;
    const rotateX = -((mouseY / height) - 0.5) * maxTilt * 2;
    setTilt({ rotateX, rotateY });
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  }, []);

  const tiltProps = {
    onMouseMove: handleMouseMove,
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: handleMouseLeave,
    style: {
      transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${isHovered ? scale : 1})`,
      transition: `transform ${speed}ms ease-out`,
    },
  };

  return { tilt, isHovered, tiltProps };
}

/**
 * Hook for glow effect on hover
 * Creates a subtle glow that follows the cursor
 */
export function useGlowHover(options = {}) {
  const { color = 'rgba(255, 20, 147, 0.3)', size = 200 } = options;
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  }, []);

  const glowProps = {
    onMouseMove: handleMouseMove,
    onMouseEnter: useCallback(() => setIsHovered(true), []),
    onMouseLeave: useCallback(() => setIsHovered(false), []),
    style: {
      position: 'relative',
      overflow: 'hidden',
    },
  };

  const glowStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: isHovered 
      ? `radial-gradient(${size}px circle at ${position.x}% ${position.y}%, ${color}, transparent 50%)`
      : 'transparent',
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease-out',
    opacity: isHovered ? 1 : 0,
  };

  return { position, isHovered, glowProps, glowStyle };
}

/**
 * Combined hook for interactive cards
 * Combines hover, tilt, and glow effects
 */
export function useInteractiveCard(options = {}) {
  const { 
    enableTilt = true, 
    enableGlow = true, 
    enableLift = true,
    tiltOptions = {},
    glowOptions = {},
  } = options;

  const { tilt, isHovered: tiltHovered, tiltProps } = useTilt(tiltOptions);
  const { glowProps, glowStyle, isHovered: glowHovered } = useGlowHover(glowOptions);
  const { hoverProps, isHovered: liftHovered } = useCardHover();

  const isHovered = tiltHovered || glowHovered || liftHovered;

  const combinedProps = {
    ...(enableTilt && tiltProps),
    ...(enableGlow && glowProps),
    onMouseEnter: (e) => {
      enableTilt && tiltProps.onMouseEnter?.(e);
      enableGlow && glowProps.onMouseEnter?.(e);
      enableLift && hoverProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e) => {
      enableTilt && tiltProps.onMouseLeave?.(e);
      enableGlow && glowProps.onMouseLeave?.(e);
      enableLift && hoverProps.onMouseLeave?.(e);
    },
    onMouseMove: (e) => {
      enableTilt && tiltProps.onMouseMove?.(e);
      enableGlow && glowProps.onMouseMove?.(e);
    },
    style: {
      ...(enableTilt && tiltProps.style),
      ...(enableGlow && glowProps.style),
      ...(enableLift && {
        transform: isHovered 
          ? `${enableTilt ? tiltProps.style.transform : ''} translateY(-4px)`.trim()
          : tiltProps.style?.transform || '',
        boxShadow: isHovered
          ? '0 10px 40px rgba(255, 20, 147, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
      }),
      transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
    },
  };

  return { 
    isHovered, 
    combinedProps, 
    glowStyle: enableGlow ? glowStyle : null,
  };
}

export default {
  useCardHover,
  useButtonPress,
  useFocusRing,
  useMagneticHover,
  useTilt,
  useGlowHover,
  useInteractiveCard,
};
