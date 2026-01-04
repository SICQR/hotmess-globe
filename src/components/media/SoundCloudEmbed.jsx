import React from 'react';

function normalizeSoundCloudRef(urlOrUrn) {
  if (!urlOrUrn || typeof urlOrUrn !== 'string') return null;
  const value = urlOrUrn.trim();
  if (!value) return null;

  // URN formats we support (Bible: URN-first):
  // - soundcloud:tracks:123
  // - soundcloud:playlists:123
  const urnMatch = value.match(/^soundcloud:(tracks|playlists):(\d+)$/i);
  if (urnMatch) {
    const kind = urnMatch[1].toLowerCase();
    const id = urnMatch[2];
    return `https://api.soundcloud.com/${kind}/${id}`;
  }

  // Already a URL (track, playlist, or api url)
  if (/^https?:\/\//i.test(value)) return value;

  return null;
}

function buildSoundCloudPlayerSrc({ urlOrUrn, autoPlay, visual }) {
  const normalized = normalizeSoundCloudRef(urlOrUrn);
  if (!normalized) return null;

  const url = encodeURIComponent(normalized);
  const params = new URLSearchParams({
    url,
    auto_play: autoPlay ? 'true' : 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    visual: visual ? 'true' : 'false',
  });

  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

export default function SoundCloudEmbed({
  urlOrUrn,
  title = 'SoundCloud player',
  autoPlay = false,
  visual = false,
  height,
  className,
}) {
  const src = buildSoundCloudPlayerSrc({ urlOrUrn, autoPlay, visual });
  if (!src) return null;

  const resolvedHeight = height ?? (visual ? 450 : 166);

  return (
    <iframe
      title={title}
      width="100%"
      height={resolvedHeight}
      scrolling="no"
      frameBorder="no"
      allow="autoplay"
      src={src}
      className={className}
    />
  );
}
