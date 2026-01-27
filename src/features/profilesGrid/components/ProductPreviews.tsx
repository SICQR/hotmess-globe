import React from 'react';

type Props = {
  productPreviewUrls: string[];
  onShopClick: (e: React.MouseEvent) => void;
};

/**
 * Displays product preview thumbnails for seller profiles
 */
export function ProductPreviews({ productPreviewUrls, onShopClick }: Props) {
  if (productPreviewUrls.length === 0) return null;

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onShopClick}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
      >
        <div className="flex items-center -space-x-2">
          {productPreviewUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt="Product preview"
              className="h-8 w-8 rounded-md border border-black/60 object-cover"
              draggable={false}
              loading="lazy"
            />
          ))}
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider text-white/80">Drops</div>
      </button>
      <div className="text-[10px] font-black uppercase tracking-wider text-white/50">Tap to shop</div>
    </div>
  );
}
