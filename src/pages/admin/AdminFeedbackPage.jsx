/**
 * /admin/feedback — Pulse Feedback System dashboard.
 *
 * Phil 2026-05-27 — read the signal, ship the changes, close the loop.
 *
 * Filters: type, state, route. Inline state machine (new → investigating →
 * fixed / wont_fix / escalated). Screenshot preview. CSV export.
 *
 * Admin-only (profiles.role IN ('admin','superadmin')).
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from '@/hooks/useUserContext';
import { Bug, HelpCircle, ShieldAlert, Sparkles, Lightbulb, Heart, Filter, Download, ExternalLink } from 'lucide-react';

const BG = '#050507';
const CARD = '#0D0D0F';
const GOLD = '#C8962C';

const TYPE_META = {
  bug:       { label: 'Bug',       icon: Bug,         color: '#FF3D2E' },
  confusing: { label: 'Confusing', icon: HelpCircle,  color: '#FFAB00' },
  unsafe:    { label: 'Unsafe',    icon: ShieldAlert, color: '#FF3D2E' },
  vibe:      { label: 'Vibe',      icon: Sparkles,    color: '#C8962C' },
  idea:      { label: 'Idea',      icon: Lightbulb,   color: '#39FF14' },
  love:      { label: 'Love',      icon: Heart,       color: '#FF4F9A' },
};

const STATES = ['new', 'investigating', 'fixed', 'wont_fix', 'escalated'];

export default function AdminFeedbackPage() {
  const { profile } = useUserContext();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('open'); // 'open' = not fixed/won't fix
  const [error, setError] = useState(null);

  // Admin gate
  useEffect(() => {
    if (profile && !['admin', 'superadmin'].includes(profile.role)) {
      navigate('/');
    }
  }, [profile, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('beta_feedback')
      .select('id, user_id, feedback_type, text, rating, screenshot_url, path, session_id, device_id, state, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (typeFilter !== 'all') q = q.eq('feedback_type', typeFilter);
    if (stateFilter === 'open') q = q.in('state', ['new', 'investigating', 'escalated']);
    else if (stateFilter !== 'all') q = q.eq('state', stateFilter);
    const { data, error: qErr } = await q;
    if (qErr) setError(qErr.message); else setItems(data || []);
    setLoading(false);
  }, [typeFilter, stateFilter]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const byType = {};
    const byState = {};
    for (const i of items) {
      byType[i.feedback_type] = (byType[i.feedback_type] || 0) + 1;
      byState[i.state] = (byState[i.state] || 0) + 1;
    }
    return { byType, byState, total: items.length };
  }, [items]);

  const updateState = async (id, newState) => {
    const { error: uErr } = await supabase.from('beta_feedback')
      .update({ state: newState, resolved_at: ['fixed', 'wont_fix'].includes(newState) ? new Date().toISOString() : null })
      .eq('id', id);
    if (!uErr) load();
  };

  const exportCsv = () => {
    const header = ['id', 'created_at', 'type', 'state', 'text', 'rating', 'path', 'user_id', 'screenshot_url'];
    const rows = items.map(i => header.map(h => {
      const v = h === 'type' ? i.feedback_type : i[h];
      return v == null ? '' : String(v).replace(/"/g, '""');
    }));
    const csv = [header.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hotmess-feedback-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', padding: '20px 16px 80px', fontFamily: 'Barlow, sans-serif' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black uppercase" style={{ color: GOLD }}>Pulse Feedback</h1>
          <p className="text-white/40 text-xs mt-0.5">{counts.total} items · {counts.byState['new'] || 0} new</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-lg text-white/70 text-xs font-bold">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase whitespace-nowrap ${typeFilter==='all' ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/60'}`}>All</button>
        {Object.entries(TYPE_META).map(([k, m]) => {
          const Icon = m.icon;
          const count = counts.byType[k] || 0;
          return (
            <button key={k} onClick={() => setTypeFilter(k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase whitespace-nowrap ${typeFilter===k ? 'text-black' : 'bg-white/5 text-white/60'}`}
                    style={{ background: typeFilter === k ? m.color : undefined }}>
              <Icon className="w-3 h-3" /> {m.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* State filter */}
      <div className="flex gap-1.5 mb-4">
        {['open', 'all', ...STATES].map(s => (
          <button key={s} onClick={() => setStateFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${stateFilter===s ? 'bg-white/15 text-white' : 'bg-transparent text-white/40'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {loading && <p className="text-white/40 text-xs">Loading…</p>}

      <div className="space-y-2">
        {items.map(item => {
          const meta = TYPE_META[item.feedback_type] || TYPE_META.bug;
          const Icon = meta.icon;
          return (
            <div key={item.id} style={{ background: CARD }} className="rounded-xl p-3.5 border border-white/5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
                  {item.path && <span className="text-white/30 text-[10px] truncate">{item.path}</span>}
                </div>
                <span className="text-white/30 text-[10px] flex-shrink-0">
                  {new Date(item.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {item.text && <p className="text-white/85 text-sm mt-2 whitespace-pre-wrap">{item.text}</p>}

              {item.screenshot_url && (
                <a href={item.screenshot_url} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#C8962C] font-bold">
                  <ExternalLink className="w-3 h-3" /> screenshot
                </a>
              )}

              <div className="flex items-center gap-1 mt-3">
                {STATES.map(s => (
                  <button key={s} onClick={() => updateState(item.id, s)}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${item.state===s ? 'bg-white/15 text-white' : 'bg-white/3 text-white/40 hover:text-white/70'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!loading && items.length === 0 && (
          <p className="text-white/30 text-sm text-center py-12">No feedback yet matching these filters.</p>
        )}
      </div>
    </div>
  );
}
