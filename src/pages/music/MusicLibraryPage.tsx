/**
 * MusicLibraryPage — /music/library
 *
 * Modern library browse experience. Sister page to MusicTab (which is the
 * curated feed). This page is the full catalogue with search, sort, filter,
 * and direct linking to /music/release/:id for share-friendly URLs.
 *
 * Data: label_releases + tracks (Supabase). Routing: react-router.
 * Design: dark-only, gold #C8962C accents, OS root bg #050507.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Disc3, X, Play, Lock } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const GOLD = '#C8962C';
const BG = '#050507';
const CARD = '#1C1C1E';
const MUTED = '#8E8E93';

type Release = {
  id: string;
  title: string;
  artwork_url: string | null;
  release_date: string | null;
  genre: string | null;
  preview_url: string | null;
  download_url: string | null;
  is_preview_only?: boolean | null;
};

type SortKey = 'newest' | 'oldest' | 'alpha';
type AccessFilter = 'all' | 'full' | 'preview';

function classifyRelease(r: Release): AccessFilter {
  if (r.download_url || (r.preview_url && !r.is_preview_only)) return 'full';
  if (r.preview_url) return 'preview';
  return 'preview'; // coming_soon collapses to preview for filtering
}

function badgeStyle(access: AccessFilter): { color: string; bg: string; label: string } {
  if (access === 'full') return { color: '#fff', bg: 'rgba(48,209,88,0.15)', label: 'FULL' };
  return { color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)', label: 'PREVIEW' };
}

export default function MusicLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('q') || '';
  const sort = (searchParams.get('sort') as SortKey) || 'newest';
  const filter = (searchParams.get('filter') as AccessFilter) || 'all';

  // ── Data load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const relRes = await supabase.from('label_releases').select('*').eq('is_active', true);
      if (!mounted) return;
      setReleases((relRes.data as Release[]) || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // ── URL param updaters ─────────────────────────────────────────────────────
  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    let list = releases;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.genre || '').toLowerCase().includes(q),
      );
    }
    if (filter !== 'all') {
      list = list.filter(r => classifyRelease(r) === filter);
    }
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'alpha':  return (a.title || '').localeCompare(b.title || '');
        case 'oldest': return (a.release_date || '').localeCompare(b.release_date || '');
        case 'newest':
        default:
          return (b.release_date || '').localeCompare(a.release_date || '');
      }
    });
    return list;
  }, [releases, search, filter, sort]);

  const filterCounts = useMemo(() => {
    const c = { all: releases.length, full: 0, preview: 0 };
    releases.forEach(r => {
      const k = classifyRelease(r);
      if (k === 'full') c.full++;
      else c.preview++;
    });
    return c;
  }, [releases]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full pb-32" style={{ backgroundColor: BG }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-black/80 border-b border-white/5">
        <div className="h-14 px-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition-transform" aria-label="Back">
            <ArrowLeft className="w-5 h-5 text-white/80" />
          </button>
          <h1 className="text-base font-black tracking-wider uppercase text-white">Music Library</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={e => setParam('q', e.target.value)}
              placeholder="Search releases, genres..."
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 border-0"
              style={{ fontSize: '16px', ['--tw-ring-color' as string]: GOLD }}
            />
            {search && (
              <button onClick={() => setParam('q', null)} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center" aria-label="Clear">
                <X className="w-3 h-3 text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {([
            { k: 'all',     label: `All · ${filterCounts.all}` },
            { k: 'full',    label: `Full · ${filterCounts.full}` },
            { k: 'preview', label: `Preview · ${filterCounts.preview}` },
          ] as { k: AccessFilter; label: string }[]).map(({ k, label }) => {
            const active = filter === k;
            return (
              <button
                key={k}
                onClick={() => setParam('filter', k === 'all' ? null : k)}
                className="h-8 px-3 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap active:scale-95 transition-transform border"
                style={
                  active
                    ? { backgroundColor: GOLD, color: '#000', borderColor: GOLD }
                    : { backgroundColor: CARD, color: MUTED, borderColor: 'rgba(255,255,255,0.08)' }
                }
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="px-4 pb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider">
          <span className="text-white/30 font-bold">Sort:</span>
          {(['newest','alpha','oldest'] as SortKey[]).map(s => (
            <button
              key={s}
              onClick={() => setParam('sort', s === 'newest' ? null : s)}
              className="font-bold active:opacity-60"
              style={{ color: sort === s ? GOLD : 'rgba(255,255,255,0.4)' }}
            >
              {s === 'newest' ? 'Newest' : s === 'alpha' ? 'A–Z' : 'Oldest'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-3 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl animate-pulse" style={{ backgroundColor: CARD }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: CARD }}>
              <Disc3 className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white font-black text-lg uppercase">No matches</p>
            <p className="text-white/40 text-sm mt-2 max-w-[260px]">
              {search ? 'Try a different search term.' : 'No releases in this filter yet.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setParam('q', null); setParam('filter', null); }}
                className="mt-5 h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-transform"
                style={{ backgroundColor: GOLD, color: '#000' }}
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((r, i) => {
              const access = classifyRelease(r);
              const badge = badgeStyle(access);
              return (
                <motion.button
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/music/release/${r.id}`)}
                  className="text-left focus:outline-none"
                  aria-label={`Open ${r.title}`}
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black">
                    {r.artwork_url ? (
                      <img src={r.artwork_url} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg,#1C1C1E,#0D0D0D)' }}>
                        <Disc3 className="w-10 h-10 text-[#C8962C]/30 mb-1" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/15">RCR</span>
                      </div>
                    )}
                    <span
                      className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest backdrop-blur-sm"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    {access === 'preview' && (
                      <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center" aria-hidden>
                        <Lock className="w-3 h-3 text-white/70" />
                      </span>
                    )}
                    {access !== 'preview' && (
                      <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: GOLD }} aria-hidden>
                        <Play className="w-3 h-3 text-black fill-black" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-white truncate mt-2">{r.title || 'Untitled'}</p>
                  <p className="text-[10px] text-white/40 truncate">
                    {r.genre || 'Smash Daddys'}{r.release_date ? ` · ${(r.release_date || '').slice(0, 4)}` : ''}
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
