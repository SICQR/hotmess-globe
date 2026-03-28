import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const normalizeHttpUrl = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

export default function OnSiteAudioPlayer({
  src,
  title,
  downloadFileName,
  className,
}) {
  const resolvedSrc = useMemo(() => normalizeHttpUrl(src), [src]);
  if (!resolvedSrc) return null;

  return (
    <div className={className}>
      {title ? (
        <div className="text-xs uppercase tracking-wider text-white/40 mb-2">{title}</div>
      ) : null}

      <audio
        controls
        preload="none"
        src={resolvedSrc}
        className="w-full"
      />

      <div className="mt-3">
        <Button
          asChild
          variant="outline"
          className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
        >
          <a href={resolvedSrc} download={downloadFileName || true}>
            <Download className="w-4 h-4" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}
