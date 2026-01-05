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

  const params = new URLSearchParams();
  // Let URLSearchParams do the encoding. SoundCloud expects a single-encoded URL.
  params.set('url', normalized);
  params.set('auto_play', autoPlay ? 'true' : 'false');
  params.set('visual', visual ? 'true' : 'false');

  // Defaults (kept from previous behavior)
  params.set('hide_related', 'true');
  params.set('show_comments', 'false');
  params.set('show_reposts', 'false');
  params.set('show_user', 'true');

  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

function applyWidgetParams(searchParams, widgetParams) {
  if (!widgetParams || typeof widgetParams !== 'object') return;

  const boolParams = [
    'auto_play',
    'buying',
    'sharing',
    'download',
    'show_artwork',
    'show_playcount',
    'show_user',
    'single_active',
  ];

  for (const key of boolParams) {
    if (widgetParams[key] === undefined || widgetParams[key] === null) continue;
    searchParams.set(key, widgetParams[key] ? 'true' : 'false');
  }

  if (widgetParams.color) {
    searchParams.set('color', String(widgetParams.color));
  }

  if (widgetParams.start_track !== undefined && widgetParams.start_track !== null) {
    const n = Number(widgetParams.start_track);
    if (Number.isFinite(n)) searchParams.set('start_track', String(Math.trunc(n)));
  }
}

export default function SoundCloudEmbed({
  urlOrUrn,
  title = 'SoundCloud player',
  autoPlay = false,
  visual = false,
  height,
  className,
  widgetParams,
}) {
  const baseSrc = buildSoundCloudPlayerSrc({ urlOrUrn, autoPlay, visual });
  if (!baseSrc) return null;

  const srcUrl = new URL(baseSrc);
  applyWidgetParams(srcUrl.searchParams, widgetParams);
  const src = srcUrl.toString();
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
