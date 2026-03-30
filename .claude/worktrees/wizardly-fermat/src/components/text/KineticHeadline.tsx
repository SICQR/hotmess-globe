import { motion } from 'framer-motion';
import { charVariant, motionEnabled } from '@/lib/animations';

interface KineticHeadlineProps {
  text?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'div';
}

/**
 * KineticHeadline - Character-by-character animated text
 * LED Brutalist styling: Monument Extended font, zero radius, snappy springs
 */
export function KineticHeadline({ 
  text = "HOTMESS LONDON",
  className = "",
  as: Component = 'h1',
}: KineticHeadlineProps) {
  const chars = text.split('');

  // Fallback for reduced motion users
  if (!motionEnabled) {
    return (
      <Component className={className}>
        {text}
      </Component>
    );
  }

  return (
    <Component className={`flex flex-wrap justify-center gap-[0.01em] ${className}`}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={charVariant(i)}
          initial="hidden"
          animate="show"
          style={{
            // Prevent layout shift
            minWidth: char === ' ' ? '0.25em' : undefined,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </Component>
  );
}
