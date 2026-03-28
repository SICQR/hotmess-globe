/**
 * L2LiveLocationWatcherSheet — Trusted contact's live location map view
 *
 * Opens when a trusted contact clicks a notification that someone started
 * sharing their live location. Subscribes to the Supabase Realtime channel
 * `location-share-{shareId}` for instant position updates, with a 15-second
 * DB poll as fallback. Shows a Leaflet map with a moving marker and a
 * countdown to when the share expires.
 *
 * Props (via sheetProps from openSheet):
 *   shareId  - string  - the location_shares.id to watch
 *   sharerName - string - display name of the person sharing (for the header)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer as _MapContainer,
  TileLayer as _TileLayer,
  Marker as _Marker,
  Popup,
  useMap,
} from 'react-leaflet';

// react-leaflet v4 ships its own types that require @types/leaflet which isn't
// installed. Cast to any so the TS compiler doesn't trip on prop names.
const MapContainer = _MapContainer as any;
const TileLayer    = _TileLayer    as any;
const Marker       = _Marker       as any;
import L from 'leaflet';
import { supabase } from '@/components/utils/supabaseClient';
import { MapPin, Radio, Clock, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Fix default Leaflet marker icons (Vite / webpack bundling issue) ─────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom amber pulsing icon for the live sharer
const LIVE_ICON = new L.DivIcon({
  className: '',
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(200,150,44,0.25);animation:ping 1.4s ease-out infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:#C8962C;border:2px solid #fff;box-shadow:0 0 0 2px rgba(200,150,44,0.4);"></div>
    </div>
    <style>
      @keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
    </style>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// ── Helper: auto-pan map when coords change ──────────────────────────────────
function MapPanner({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.panTo(coords, { animate: true, duration: 0.8 });
  }, [coords, map]);
  return null;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface LocationShareRow {
  id: string;
  user_id: string;
  current_lat: number | null;
  current_lng: number | null;
  active: boolean;
  end_time: string;
  start_time: string;
  duration_minutes: number;
}

interface Props {
  shareId: string;
  sharerName?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function L2LiveLocationWatcherSheet({ shareId, sharerName = 'Someone' }: Props) {
  const [share, setShare]           = useState<LocationShareRow | null>(null);
  const [coords, setCoords]         = useState<[number, number] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [remaining, setRemaining]   = useState<number>(0);
  const [status, setStatus]         = useState<'loading' | 'live' | 'ended' | 'error'>('loading');
  const [realtimeOk, setRealtimeOk] = useState(true);

  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load initial share row ────────────────────────────────────────────────
  const loadShare = useCallback(async () => {
    if (!shareId) { setStatus('error'); return; }
    const { data, error } = await supabase
      .from('location_shares')
      .select('id, user_id, current_lat, current_lng, active, end_time, start_time, duration_minutes')
      .eq('id', shareId)
      .single();

    if (error || !data) { setStatus('error'); return; }

    setShare(data);

    if (!data.active || new Date(data.end_time) < new Date()) {
      setStatus('ended');
      return;
    }

    if (data.current_lat && data.current_lng) {
      setCoords([data.current_lat, data.current_lng]);
      setLastUpdated(new Date());
    }

    setStatus('live');
    startCountdown(new Date(data.end_time));
  }, [shareId]);

  // ── Countdown to end_time ─────────────────────────────────────────────────
  const startCountdown = useCallback((endTime: Date) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const secs = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) {
        setStatus('ended');
        clearInterval(countdownRef.current!);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  const subscribeRealtime = useCallback(() => {
    if (!shareId) return;

    channelRef.current = supabase
      .channel(`location-share-${shareId}`)
      .on('broadcast', { event: 'location_update' }, (payload: any) => {
        const { lat, lng, active } = payload.payload ?? {};
        if (!active) { setStatus('ended'); return; }
        if (typeof lat === 'number' && typeof lng === 'number') {
          setCoords([lat, lng]);
          setLastUpdated(new Date());
          setRealtimeOk(true);
        }
      })
      .subscribe((s: string) => {
        if (s === 'SUBSCRIBED') setRealtimeOk(true);
        if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setRealtimeOk(false);
      });
  }, [shareId]);

  // ── DB poll fallback (15 s) ───────────────────────────────────────────────
  const startPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('location_shares')
        .select('current_lat, current_lng, active')
        .eq('id', shareId)
        .single();

      if (!data) return;
      if (!data.active) { setStatus('ended'); return; }
      if (data.current_lat && data.current_lng) {
        setCoords([data.current_lat, data.current_lng]);
        setLastUpdated(new Date());
      }
    }, 15_000);
  }, [shareId]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadShare();
    subscribeRealtime();
    startPoll();

    return () => {
      channelRef.current?.unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [loadShare, subscribeRealtime, startPoll]);

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  };

  const formatLastUpdated = (d: Date | null) => {
    if (!d) return 'Waiting…';
    const secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 10) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
        <p className="text-sm text-white/50">Connecting to live location…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-white font-bold">Share not found</p>
        <p className="text-sm text-white/50">
          This location share may have expired or doesn't exist.
        </p>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-6 text-center">
        <MapPin className="w-10 h-10 text-white/30" />
        <p className="text-white font-bold">Share ended</p>
        <p className="text-sm text-white/50">
          {sharerName}'s live location share has finished.
        </p>
      </div>
    );
  }

  // ── Live view ─────────────────────────────────────────────────────────────
  const defaultCenter: [number, number] = coords ?? [51.505, -0.09]; // London fallback

  return (
    <div className="flex flex-col h-full">

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#39FF14] animate-pulse" />
          <span className="text-sm font-bold text-white">{sharerName} is live</span>
          {!realtimeOk && (
            <span title="Realtime disconnected — using polling">
              <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Countdown */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className={cn(
              'text-xs font-mono',
              remaining < 120 ? 'text-red-400' : 'text-white/60'
            )}>
              {formatCountdown(remaining)}
            </span>
          </div>

          {/* Last update indicator */}
          <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {formatLastUpdated(lastUpdated)}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 320 }}>
        {!coords && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0D0D0D]">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
            <p className="text-xs text-white/40">Waiting for first GPS ping…</p>
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
          />

          {coords && (
            <>
              <MapPanner coords={coords} />
              <Marker position={coords} icon={LIVE_ICON}>
                <Popup>
                  <span style={{ color: '#C8962C', fontWeight: 700 }}>
                    {sharerName}
                  </span>
                  <br />
                  <span style={{ fontSize: 11, color: '#888' }}>
                    Updated {formatLastUpdated(lastUpdated)}
                  </span>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>

      {/* Footer — coordinates (dev/debug use) */}
      {coords && (
        <div className="px-4 py-2 border-t border-white/8 bg-[#0D0D0D]">
          <p className="text-[10px] text-white/20 text-center font-mono">
            {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
          </p>
        </div>
      )}
    </div>
  );
}
