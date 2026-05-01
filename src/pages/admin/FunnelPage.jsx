/**
 * src/pages/admin/FunnelPage.jsx — Chunk 17c
 *
 * Funnel dashboard at /admin/funnel.
 * Reads analytics_events via Supabase service-role RPC or direct query.
 * Admin-only: requires profiles.role = 'admin' | 'superadmin'.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from '@/hooks/useUserContext';
import { useNavigate } from 'react-router-dom';

const GOLD  = '#C8962C';
const BG    = '#050507';
const CARD  = '#0D0D0F';

const FUNNEL_STEPS = [
  { key: 'age_gate_passed',          label: 'Age Gate Passed',         category: 'onboarding' },
  { key: 'signup',                    label: 'Signed Up',               category: 'onboarding' },
  { key: 'onboarding_stage_completed',label: 'Onboarding Stage Done',   category: 'onboarding' },
  { key: 'profile_complete',          label: 'Profile Complete',        category: 'onboarding' },
  { key: 'first_message_sent',        label: 'First Message Sent',      category: 'activation' },
  { key: 'first_meet_committed',      label: 'First Meet Committed',    category: 'activation' },
  { key: 'first_purchase',            label: 'First Purchase',          category: 'conversion' },
];

const FLAG_EXPOSURE_KEY = 'flag_exposure';

export default function FunnelPage() {
  const { profile } = useUserContext();
  const navigate    = useNavigate();

  const [counts,       setCounts]       = useState({});
  const [flagCounts,   setFlagCounts]   = useState([]);
  const [dateRange,    setDateRange]    = useState(7); // days
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  // Gate: admin / superadmin only
  useEffect(() => {
    if (!profile) return;
    if (!['admin', 'superadmin'].includes(profile.role)) {
      navigate('/');
    }
  }, [profile, navigate]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - dateRange * 86400 * 1000).toISOString();

      // ── Funnel event counts (unique users per event) ──────────────────────
      const { data: rows, error: qErr } = await supabase
        .from('analytics_events')
        .select('event_name, user_id')
        .in('event_name', FUNNEL_STEPS.map(s => s.key))
        .gte('created_at', since);

      if (qErr) throw qErr;

      const newCounts = {};
      for (const step of FUNNEL_STEPS) {
        const stepRows = rows.filter(r => r.event_name === step.key);
        const unique   = new Set(stepRows.map(r => r.user_id)).size;
        const total    = stepRows.length;
        newCounts[step.key] = { unique, total };
      }
      setCounts(newCounts);

      // ── Flag exposure counts ──────────────────────────────────────────────
      const { data: flagRows, error: fErr } = await supabase
        .from('analytics_events')
        .select('properties')
        .eq('event_name', FLAG_EXPOSURE_KEY)
        .gte('created_at', since);

      if (fErr) throw fErr;

      const flagMap = {};
      for (const r of flagRows) {
        const key = r.properties?.flag_key;
        if (key) flagMap[key] = (flagMap[key] ?? 0) + 1;
      }
      const sorted = Object.entries(flagMap)
        .sort((a, b) => b[1] - a[1])
        .map(([flag_key, exposures]) => ({ flag_key, exposures }));
      setFlagCounts(sorted);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const firstCount  = counts['age_gate_passed']?.unique ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', padding: '24px 16px', fontFamily: 'Barlow, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontFamily: 'Oswald, sans-serif', fontWeight: 700, color: GOLD, margin: 0 }}>
            FUNNEL
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
            Analytics · v6 Build
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDateRange(d)}
              style={{
                padding:         '6px 12px',
                borderRadius:    '8px',
                fontSize:        12,
                fontFamily:      'Oswald, sans-serif',
                fontWeight:      600,
                cursor:          'pointer',
                backgroundColor: dateRange === d ? GOLD : 'rgba(255,255,255,0.05)',
                color:           dateRange === d ? '#000' : 'rgba(255,255,255,0.6)',
                border:          'none',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,60,60,0.1)', borderRadius: 8, color: '#ff6b6b', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Funnel steps */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 12 }}>
          Acquisition Funnel
        </h2>
        {FUNNEL_STEPS.map((step, i) => {
          const { unique = 0, total = 0 } = counts[step.key] ?? {};
          const pct = firstCount > 0 ? Math.round((unique / firstCount) * 100) : 0;
          const prevStep = i > 0 ? FUNNEL_STEPS[i - 1] : null;
          const prevUnique = prevStep ? (counts[prevStep.key]?.unique ?? 0) : firstCount;
          const dropPct = prevUnique > 0 ? Math.round(((prevUnique - unique) / prevUnique) * 100) : 0;

          return (
            <div
              key={step.key}
              style={{
                background:    CARD,
                border:        '1px solid rgba(255,255,255,0.06)',
                borderRadius:  10,
                padding:       '14px 16px',
                marginBottom:  8,
                position:      'relative',
                overflow:      'hidden',
              }}
            >
              {/* progress fill */}
              <div style={{
                position:        'absolute',
                top: 0, left: 0, bottom: 0,
                width:           `${pct}%`,
                backgroundColor: 'rgba(200,150,44,0.08)',
                transition:      'width 0.4s ease',
              }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{step.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', letterSpacing: '0.03em' }}>
                    {step.key}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontFamily: 'Oswald, sans-serif', fontWeight: 700, color: GOLD, margin: 0 }}>
                    {loading ? '—' : unique.toLocaleString()}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>uniq</span>
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                    {loading ? '' : `${pct}% of top${i > 0 && dropPct > 0 ? ` · −${dropPct}% step` : ''}`}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flag exposures */}
      {flagCounts.length > 0 && (
        <div>
          <h2 style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 12 }}>
            Flag Exposures ({dateRange}d)
          </h2>
          <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
            {flagCounts.map((row, i) => (
              <div
                key={row.flag_key}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'space-between',
                  padding:       '12px 16px',
                  borderTop:     i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  {row.flag_key}
                </p>
                <p style={{ fontSize: 14, fontFamily: 'Oswald, sans-serif', fontWeight: 700, color: GOLD, margin: 0 }}>
                  {row.exposures.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
