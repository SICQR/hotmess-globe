/**
 * AtmosphericImageCard — image-led "inhabited not decorated" card.
 *
 * Phil 2026-05-30: "Imagery should make HOTMESS feel INHABITED, not decorated."
 * Used on surfaces that are currently icon-led and feel under-bodied (Care
 * landing, Ghosted empty-state). The image fills the card; a dark
 * gradient overlay sits bottom-to-top so the copy reads in the lower-left.
 *
 * Graceful image-fail: if the image 404s (e.g. the Ghosted asset is in
 * transit), the <img> is hidden and the card falls back to a solid
 * HOTMESS-dark surface with the copy still readable — looks intentional,
 * not broken.
 *
 * No new design tokens. Reuses the existing rounded-2xl + border-white/5
 * pattern already used by CareSuiteCard / GhostedCard.
 */
import React from 'react';

interface AtmosphericImageCardProps {
  imageUrl: string;
  copy: string;
  ariaLabel?: string;
  /** 16/9 by default; pass '21/9' for hero-strip surfaces. */
  aspect?: '16/9' | '21/9';
  className?: string;
}

export function AtmosphericImageCard({
  imageUrl,
  copy,
  ariaLabel,
  aspect = '16/9',
  className = '',
}: AtmosphericImageCardProps) {
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      role="img"
      aria-label={ariaLabel || copy}
      className={`relative w-full overflow-hidden rounded-2xl border border-white/5 ${className}`}
      style={{
        aspectRatio: aspect === '21/9' ? '21 / 9' : '16 / 9',
        background: '#0a0a0a',
      }}
    >
      {!imgFailed && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      )}
      {/* Dark gradient overlay — bottom-to-top so copy in lower-left reads.
          Stronger when the image is missing so the solid card still looks
          intentional. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: imgFailed
            ? 'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.92) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <p
        className="absolute left-5 bottom-4 right-5 text-white font-black text-lg sm:text-xl leading-snug"
        style={{
          textShadow: '0 2px 14px rgba(0,0,0,0.6)',
          letterSpacing: '-0.01em',
        }}
      >
        {copy}
      </p>
    </div>
  );
}

export default AtmosphericImageCard;
