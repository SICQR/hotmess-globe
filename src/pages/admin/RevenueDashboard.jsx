/**
 * RevenueDashboard.jsx — D3
 * Revenue + platform health dashboard at /admin/revenue.
 * Admin-only: requires profiles.role = 'admin' | 'superadmin'
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserContext } from '@/hooks/useUserContext';
import {
  TrendingUp, Users, Zap, Shield, Radio,
  ShoppingBag, RefreshCw, AlertTriangle, CheckCircle,
} from 'lucide-react';

const GOLD  = '#C8962C';
const GREEN = '#22c55e';
const RED   = '#ef4444';
const BG    = '#050507';
const CARD  = '#0D0D0F';
const BORDER = 'rgba(255,255,255,0.06)';

const TIER_LABELS = {
  hotmess:   'HOTMESS',
  connected: 'Connected',
  promoter:  'Promoter',
  venue:     'Venue',
};

const TIER_COLORS = {
  hotmess:   '#FF1493',
  connected: '#00D9FF',
  promoter:  '#B026FF',
  venue:     GOLD,
};

function pence(p) {
  if (!p && p !== 0) return '—';
  return `£${(p / 100).toFixed(2)}`;
}

function StatCard({ icon: Icon, label, value, sub, color = 'white', accent = false }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${accent ? GOLD : BORDER}`,
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} style={{ color: color === 'white' ? 'rgba(255,255,255,0.4)' : color }} />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color === 'white' ? '#fff' : color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
      )}
    </div>
  );
}

function TierRow({ tier, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = TIER_COLORS[tier] || '#fff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{TIER_LABELS[tier] || tier}</span>
      <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, width: 24, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

export default function RevenueDashboard() {
  const { profile } = useUserContext();
  const navigate    = useNavigate();
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Admin gate
  useEffect(() => {
    if (!profile) return;
    if (!['admin', 'superadmin'].includes(profile.role)) navigate('/');
  }, [profile, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/revenue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastFetch(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revenue   = data?.revenue  || {};
  const health    = data?.health   || {};
  const paying    = data?.paying   || { total: 0, by_tier: {}, by_provider: {}, recent: [] };
  const ai        = data?.ai       || { total_30d: 0, by_feature: {} };
  const mod       = data?.moderation || { review: 0, blocked: 0 };

  const totalPayingTiers = Object.values(paying.by_tier || {}).reduce((a, b) => a + b, 0);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: `1px solid ${BORDER}`,
        background: `${BG}f5`,
        backdropFilter: 'blur(12px)',
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.05em', margin: 0 }}>
            REVENUE
          </h1>
          {lastFetch && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
              Updated {lastFetch.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`,
            background: 'transparent', color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{ background: '#1a0000', border: '1px solid #f00', borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: RED, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* ── Top metrics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
          <StatCard
            icon={TrendingUp}
            label="MRR"
            value={pence(revenue.mrr_pence)}
            sub="Monthly recurring"
            color={GOLD}
            accent
          />
          <StatCard
            icon={Users}
            label="Paying Members"
            value={paying.total}
            sub={`of ${health.profiles || 0} total`}
          />
          <StatCard
            icon={Users}
            label="Onboarded"
            value={health.onboarded || 0}
            sub={`${health.profiles ? Math.round((health.onboarded / health.profiles) * 100) : 0}% of signups`}
          />
          <StatCard
            icon={Users}
            label="Online Now"
            value={health.currently_online || 0}
            sub="Active sessions"
            color={GREEN}
          />
          <StatCard
            icon={ShoppingBag}
            label="Orders"
            value={health.total_orders || 0}
            sub="All time"
          />
          <StatCard
            icon={Radio}
            label="Radio Shows"
            value={health.radio_shows || 0}
            sub={`${health.music_tracks || 0} tracks`}
          />
        </div>

        {/* ── Tier breakdown + Provider + AI ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          {/* Paid tier breakdown */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
              Paid Tiers
            </h3>
            {Object.entries(paying.by_tier || {}).map(([tier, count]) => (
              <TierRow key={tier} tier={tier} count={count} total={totalPayingTiers} />
            ))}
            {totalPayingTiers === 0 && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '16px 0' }}>
                No paid members yet — open for business ✦
              </p>
            )}
          </div>

          {/* AI usage + moderation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* AI */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, flex: 1 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
                AI Usage (30d)
              </h3>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{ai.total_30d}</div>
              {Object.entries(ai.by_feature || {}).map(([feat, count]) => (
                <div key={feat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '4px 0' }}>
                  <span>{feat}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{count}</span>
                </div>
              ))}
              {ai.total_30d === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No AI usage this month</p>
              )}
            </div>

            {/* Moderation */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
                Image Moderation
              </h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Review</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{mod.review}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={14} style={{ color: RED }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Blocked</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: RED }}>{mod.blocked}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment provider breakdown ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 32 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
            Payment Providers
          </h3>
          <div style={{ display: 'flex', gap: 32 }}>
            {Object.entries(paying.by_provider || {}).map(([provider, count]) => (
              <div key={provider}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize', marginTop: 2 }}>{provider}</div>
              </div>
            ))}
            {Object.values(paying.by_provider || {}).every(v => v === 0) && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No paid transactions yet</p>
            )}
          </div>
        </div>

        {/* ── Recent paid memberships ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
            Recent Paid Members
          </h3>
          {(paying.recent || []).length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              No paid members yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>
                  <th style={{ paddingBottom: 8, fontWeight: 600 }}>User</th>
                  <th style={{ paddingBottom: 8, fontWeight: 600 }}>Tier</th>
                  <th style={{ paddingBottom: 8, fontWeight: 600 }}>Provider</th>
                  <th style={{ paddingBottom: 8, fontWeight: 600 }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {(paying.recent || []).map((m, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.5)' }}>
                      {m.user_id?.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '8px 0' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        color: TIER_COLORS[m.tier] || '#fff',
                        background: `${TIER_COLORS[m.tier] || '#fff'}20`,
                        padding: '2px 8px', borderRadius: 4,
                      }}>
                        {TIER_LABELS[m.tier] || m.tier}
                      </span>
                    </td>
                    <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                      {m.payment_provider || 'stripe'}
                    </td>
                    <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.3)' }}>
                      {m.started_at ? new Date(m.started_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── New signups ── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>New Signups 7d</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{health.new_signups_7d ?? '—'}</div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>New Signups 24h</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{health.new_signups_24h ?? '—'}</div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Active Beacons</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{health.active_beacons ?? '—'}</div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total Taps</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{health.total_taps ?? '—'}</div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
