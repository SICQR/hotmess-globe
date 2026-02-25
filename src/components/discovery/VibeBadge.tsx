/**
 * VibeBadge - Shield-shaped intent badge
 * Shows HUNG / RAW / HIGH / HOOKUP / FOR SALE / CREATOR overlaid on globe
 */

interface VibeBadgeProps {
  label: string;
  onClick?: () => void;
  className?: string;
}

const VIBE_STYLES: Record<string, { bg: string; text: string }> = {
  HUNG:    { bg: '#C8962C', text: '#000' },
  RAW:     { bg: '#C8962C', text: '#000' },
  HIGH:    { bg: '#2D6A4F', text: '#fff' },
  HOOKUP:  { bg: '#8B1A1A', text: '#fff' },
  'FOR SALE': { bg: '#C8962C', text: '#000' },
  CREATOR: { bg: '#6B21A8', text: '#fff' },
};

const DEFAULT_STYLE = { bg: '#1C1C1E', text: '#fff' };

export function VibeBadge({ label, onClick, className = '' }: VibeBadgeProps) {
  const upper = label.toUpperCase();
  const style = VIBE_STYLES[upper] ?? DEFAULT_STYLE;

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ minWidth: 56 }}
    >
      {/* Shield SVG background */}
      <svg
        viewBox="0 0 56 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-14 h-16 absolute inset-0"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
      >
        <path
          d="M28 2L4 10V34C4 48 16 58 28 62C40 58 52 48 52 34V10L28 2Z"
          fill={style.bg}
        />
      </svg>
      {/* Label */}
      <span
        className="relative z-10 font-black text-[9px] tracking-wide uppercase leading-tight text-center px-1"
        style={{ color: style.text, marginTop: -4 }}
      >
        {upper}
      </span>
    </button>
  );
}

export default VibeBadge;
