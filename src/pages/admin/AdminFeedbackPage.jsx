/**
 * /admin/feedback — Pulse Feedback System V1 admin (Phil locked).
 *
 * Sort priority (Phil 2026-05-27): Unsafe > Broken > Confusing > Idea > Love > Other.
 * Filters: type chips, route grouping, state (open/all/new/investigating/fixed/wont_fix/escalated).
 * Inline state machine. CSV export. Severity badge per item.
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from '@/hooks/useUserContext';
import {
  Wrench, HelpCircle, ShieldAlert, Lightbulb, Heart, MoreHorizontal,
  AlertCircle, Download, ExternalLink,
} from 'lucide-react';

const BG = '#050507', CARD = '#0D0D0F', GOLD = '#C8962C', URGENT = '#FF3D2E';

// Priority order per Phil: unsafe > broken > confusing > idea > love > other
const TYPE_META = {
  unsafe:    { label: 'Unsafe',    icon: ShieldAlert,    color: URGENT,    severity: 'high', priority: 1 },
  broken:    { label: 'Broken',    icon: Wrench,         color: URGENT,    severity: 'mid',  priority: 2 },
  confusing: { label: 'Confusing', icon: HelpCircle,     color: '#FFAB00', severity: 'low',  priority: 3 },
  idea:      { label: 'Idea',      icon: Lightbulb,      color: '#39FF14', severity: 'low',  priority: 4 },
  love:      { label: 'Love',      icon: Heart,          color: '#FF4F9A', severity: 'low',  priority: 5 },
  other:     { label: 'Other',     icon: MoreHorizontal, color: '#FFFFFF', severity: 'low',  priority: 6 },
};
const SEVERITY_COLOR = { high: URGENT, mid: '#FFAB00', low: '#8E8E93' };
const STATES = ['new', 'investigating', 'fixed', 'wont_fix', 'escalated'];

export default function AdminFeedbackPage() {
  const { profile } = useUserContext();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', state: 'open', route: 'all' });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile && !['admin', 'superadmin'].includes(profile.role)) navigate('/');
  }, [profile, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('beta_feedback')
      .select('id, user_id, feedback_type, text, screenshot_url, path, session_id, device_id, state, metadata, emotional_temperature, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (filter.type !== 'all') q = q.eq('feedback_type', filter.type);
    if (filter.state === 'open') q = q.in('state', ['new', 'investigating', 'escalated']);
    else if (filter.state !== 'all') q = q.eq('state', filter.state);
    if (filter.route !== 'all') q = q.like('path', `${filter.route}%`);
    const { data, error: qErr } = await q;
    if (qErr) setError(qErr.message);
    else {
      // Sort by Phil-priority first, then by created_at desc within priority
      const sorted = (data || []).slice().sort((a, b) => {
        const pa = TYPE_META[a.feedback_type]?.priority ?? 99;
        const pb = TYPE_META[b.feedback_type]?.priority ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setItems(sorted);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const routeGroups = useMemo(() => {
    const counts = {};
    items.forEach(i => {
      const root = '/' + (i.path || '').split('/').filter(Boolean)[0] || '/';
      counts[root] = (counts[root] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [items]);

  const counts = useMemo(() => {
    const byType = {}, bySeverity = { high: 0, mid: 0, low: 0 };
    items.forEach(i => {
      byType[i.feedback_type] = (byType[i.feedback_type] || 0) + 1;
      bySeverity[TYPE_META[i.feedback_type]?.severity || 'low']++;
    });
    return { byType, bySeverity, total: items.length };
  }, [items]);

  const updateState = async (id, newState) => {
    const { error: uErr } = await supabase.from('beta_feedback')
      .update({ state: newState, resolved_at: ['fixed', 'wont_fix'].includes(newState) ? new Date().toISOString() : null })
      .eq('id', id);
    if (!uErr) load();
  };

  const exportCsv = () => {
    const header = ['id', 'created_at', 'type', 'state', 'severity', 'temperature', 'text', 'path', 'user_id', 'tier', 'screenshot_url'];
    const rows = items.map(i => header.map(h => {
      let v;
      if (h === 'type') v = i.feedback_type;
      else if (h === 'severity') v = TYPE_META[i.feedback_type]?.severity || 'low';
      else if (h === 'temperature') v = i.emotional_temperature || '';
      else if (h === 'tier') v = i.metadata?.subscription_tier || '';
      else v = i[h];
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-black uppercase" style={{ color: GOLD }}>Pulse Feedback</h1>
          <p className="text-white/40 text-xs mt-0.5">
            {counts.total} · {counts.bySeverity.high} high · {counts.bySeverity.mid} mid · {counts.bySeverity.low} low
          </p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-lg text-white/70 text-xs font-bold">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setFilter(f => ({ ...f, type: 'unsafe', state: 'open' }))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black uppercase"
                style={{ background: `${URGENT}22`, color: URGENT, border: `1px solid ${URGENT}44` }}>
          <AlertCircle className="w-3 h-3" /> Show unsafe ({counts.byType.unsafe || 0})
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
        <button onClick={() => setFilter(f => ({ ...f, type: 'all' }))}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase whitespace-nowrap ${filter.type==='all' ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/60'}`}>All</button>
        {['unsafe','broken','confusing','idea','love','other'].map(k => {
          const m = TYPE_META[k]; const Icon = m.icon; const ct = counts.byType[k] || 0;
          return (
            <button key={k} onClick={() => setFilter(f => ({ ...f, type: k }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase whitespace-nowrap ${filter.type===k ? 'text-black' : 'bg-white/5 text-white/60'}`}
                    style={{ background: filter.type === k ? m.color : undefined }}>
              <Icon className="w-3 h-3" /> {m.label} {ct > 0 && `(${ct})`}
            </button>
          );
        })}
      </div>

      {routeGroups.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
          <button onClick={() => setFilter(f => ({ ...f, route: 'all' }))}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${filter.route==='all' ? 'bg-white/15 text-white' : 'bg-transparent text-white/40'}`}>
            all routes
          </button>
          {routeGroups.map(([rt, ct]) => (
            <button key={rt} onClick={() => setFilter(f => ({ ...f, route: rt }))}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono ${filter.route===rt ? 'bg-white/15 text-white' : 'bg-transparent text-white/40'}`}>
              {rt} ({ct})
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {['open', 'all', ...STATES].map(s => (
          <button key={s} onClick={() => setFilter(f => ({ ...f, state: s }))}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${filter.state===s ? 'bg-white/15 text-white' : 'bg-transparent text-white/40'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {loading && <p className="text-white/40 text-xs">Loading…</p>}

      <div className="space-y-2">
        {items.map(item => {
          const meta = TYPE_META[item.feedback_type] || TYPE_META.other;
          const Icon = meta.icon;
          const sev = meta.severity;
          return (
            <div key={item.id} style={{ background: CARD }}
                 className={`rounded-xl p-3.5 border ${sev === 'high' ? 'border-[#FF3D2E]/40' : 'border-white/5'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: meta.color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: `${SEVERITY_COLOR[sev]}22`, color: SEVERITY_COLOR[sev] }}>{sev}</span>
                  {item.emotional_temperature && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                      {item.emotional_temperature}
                    </span>
                  )}
                  {item.path && <span className="text-white/30 text-[10px] truncate font-mono">{item.path}</span>}
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

              {item.metadata?.subscription_tier && (
                <p className="text-white/30 text-[10px] mt-2">
                  tier: <span className="text-white/60 font-bold">{item.metadata.subscription_tier}</span>
                  {item.metadata.beta_active && <span className="ml-2 text-[#C8962C]">· beta</span>}
                </p>
              )}

              <div className="flex items-center gap-1 mt-3 flex-wrap">
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
          <p className="text-white/30 text-sm text-center py-12">No feedback matching these filters.</p>
        )}
      </div>
    </div>
  );
}
