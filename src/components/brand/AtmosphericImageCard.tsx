/**
 * AtmosphericImageCard — image-led "inhabited not decorated" card.
 *
 * Phil 2026-05-30: "Imagery should make HOTMESS feel INHABITED, not decorated."
 *
 * The image is treated as a complete designed composition — Phil's PNG comps
 * have copy, CTAs and chip rows baked in. When the image loads we render it
 * flat. The `copy` prop is used ONLY for the aria-label and the fallback
 * overlay (imgFailed) so the surface still reads if the asset 404s
 * mid-rollout.
 *
 * Optional children render above the image — used for invisible click-grids
 * positioned over interactive areas baked into the comp.
 *
 * No new design tokens. Reuses rounded-2xl + border-white/5.
 */
import React from 'react';

interface AtmosphericImageCardProps {
  imageUrl: string;
  copy: string;
  ariaLabel?: string;
  aspect?: '16/9' | '21/9' | '3/2' | '4/5' | '1/1';
  className?: string;
  children?: React.ReactNode;
}

const ASPECT_MAP: Record<NonNullable<AtmosphericImageCardProps['aspect']>, string> = {
  '16/9': '16 / 9',
  '21/9': '21 / 9',
  '3/2':  '3 / 2',
  '4/5':  '4 / 5',
  '1/1':  '1 / 1',
};

export function AtmosphericImageCard({
  imageUrl,
  copy,
  ariaLabel,
  aspect = '16/9',
  className = '',
  children,
}: AtmosphericImageCardProps) {
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      role="img"
      aria-label={ariaLabel || copy}
      className={`relative w-full overflow-hidden rounded-2xl border border-white/5 ${className}`}
      style={{
        aspectRatio: ASPECT_MAP[aspect],
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

      {/* Fallback overlay — ONLY rendered when the image fails. Keeps the
          surface reading as intentional, not broken, while assets propagate. */}
      {imgFailed && (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.92) 100%)',
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
        </>
      )}

      {/* Children render above the image — interactive click-grids for
          actionable areas baked into the comp. */}
      {children}
    </div>
  );
}

export default AtmosphericImageCard;
