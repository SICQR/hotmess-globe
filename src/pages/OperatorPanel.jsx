/**
 * OperatorPanel — Night Operator Panel page.
 * Flag: v6_night_operator_panel
 * Route: /operator (add to router as needed)
 * Access: profiles.role = 'admin' OR active operator_venues row
 *
 * 4 tabs: LIVE · SIGNALS · ZONES · CONTROL
 * All data from Supabase. No mock state. No window.confirm.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { useV6Flag as useFlag } from '@/hooks/useV6Flag';
import { ConfirmProvider, useConfirm } from '@/components/operator/ConfirmModal';

const T = {
  black:  '#000',
  white:  '#fff',
  gold:   '#C8962C',
  red:    '#FF3B30',
  green:  '#34C759',
  card:   '#0d0d0d',
  border: '#1a1a1a',
  muted:  'rgba(255,255,255,0.3)',
  warn:   '#FF9500',
};

const TABS = ['LIVE', 'SIGNALS', 'ZONES', 'CONTROL'];

const MOMENTUM_STATES = ['EARLY', 'LIVE', 'PEAK', 'WINDING_DOWN'];

const ZONE_SIGNALS = ['busy', 'active', 'quiet', 'empty'];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
  return json;
}

async function apiGet(path) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(path, {
    headers: { 'Authorization': `Bearer ${session?.access_token}` },
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
  return json;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '14px 16px', flex: 1, minWidth: 0,
    }}>
      <p style={{ color: T.muted, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ color: color || T.white, fontSize: 28, fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>
        {value ?? '—'}
      </p>
      {sub && <p style={{ color: T.muted, fontSize: 11, margin: 0 }}>{sub}</p>}
    </div>
  );
}

function ActionButton({ label, color = T.gold, disabled, onClick, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'rgba(255,255,255,0.06)' : color,
        color: disabled ? T.muted : T.black,
        border: 'none', borderRadius: 8,
        padding: small ? '8px 16px' : '12px 20px',
        fontWeight: 700, fontSize: small ? 12 : 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: 0.5,
        transition: 'opacity 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ── Live Tab ──────────────────────────────────────────────────────────────────

function LiveTab({ venueId, eventId, stats, onStatsRefresh, auditEntries }) {
  const { prompt } = useConfirm();
  const [advancing, setAdvancing] = useState(false);

  const currentMomentumIdx = MOMENTUM_STATES.indexOf(stats?.momentum_state ?? 'LIVE');
  const nextMomentumState = MOMENTUM_STATES[currentMomentumIdx + 1];

  const handleMomentumAdvance = async () => {
    if (!nextMomentumState) return;
    const level = nextMomentumState === 'PEAK' ? 'medium' : 'low';
    const ok = await prompt({
      level,
      title: `Advance to ${nextMomentumState}`,
      description: `This will update the event energy signal to ${nextMomentumState} for all users in this venue.`,
    });
    if (!ok) return;
    setAdvancing(true);
    try {
      await apiPost('/api/operator/momentum', { venue_id: venueId, new_state: nextMomentumState, event_id: eventId });
      onStatsRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div>
      {/* Stats grid */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <StatCard label="In Room" value={stats?.cluster_size} color={T.gold} />
        <StatCard label="RSVPs" value={stats?.rsvp_count} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Scanned" value={stats?.scan_count} />
        <StatCard label="Beacons" value={`${stats?.beacons_active ?? 0}/${stats?.beacon_limit ?? '—'}`} />
      </div>

      {/* Momentum */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: 0 }}>
            Momentum
          </p>
          <span style={{
            color: T.gold, fontWeight: 700, fontSize: 14, letterSpacing: 1,
          }}>
            {stats?.momentum_state ?? 'LIVE'}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, marginBottom: 14 }}>
          <div style={{
            width: `${(stats?.momentum_intensity ?? 0.5) * 100}%`,
            height: '100%', background: T.gold, borderRadius: 4,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {nextMomentumState && (
            <ActionButton
              label={advancing ? '...' : `→ ${nextMomentumState}`}
              disabled={advancing}
              onClick={handleMomentumAdvance}
            />
          )}
        </div>
      </div>

      {/* Activity feed */}
      <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 8px' }}>
        Recent Activity
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(auditEntries ?? []).slice(0, 8).map((entry) => (
          <div key={entry.id} style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '10px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: T.white, fontSize: 13 }}>
              {entry.action_type.replace(/_/g, ' ')}
            </span>
            <span style={{
              color: entry.outcome === 'success' ? T.green : T.red,
              fontSize: 11,
            }}>
              {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {!(auditEntries?.length) && (
          <p style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No activity yet
          </p>
        )}
      </div>
    </div>
  );
}

// ── Signals Tab ───────────────────────────────────────────────────────────────

function SignalsTab({ venueId, eventId, beacons, onRefresh }) {
  const { prompt } = useConfirm();
  const [type, setType] = useState('vibe');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [reward, setReward] = useState('');
  const [dropping, setDropping] = useState(false);

  const handleDrop = async () => {
    if (!title.trim()) return;
    const ok = await prompt({ level: 'low' });
    if (!ok) return;
    setDropping(true);
    try {
      await apiPost('/api/operator/beacon/drop', {
        venue_id: venueId, event_id: eventId, type, title: title.trim(), duration_minutes: duration,
      });
      setTitle('');
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setDropping(false); }
  };

  const handleIncentive = async () => {
    if (!title.trim() || !reward.trim()) return;
    const ok = await prompt({
      level: 'medium',
      title: 'Push Incentive Beacon',
      description: `Reward: "${reward}". Visible to all users at this venue.`,
    });
    if (!ok) return;
    setDropping(true);
    try {
      await apiPost('/api/operator/incentive-beacon', {
        venue_id: venueId, event_id: eventId, title: title.trim(), reward: reward.trim(), duration_minutes: duration,
      });
      setTitle(''); setReward('');
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setDropping(false); }
  };

  const handleExpire = async (beaconId) => {
    const ok = await prompt({ level: 'low' });
    if (!ok) return;
    try {
      await apiPost('/api/operator/beacon/expire', { venue_id: venueId, beacon_id: beaconId });
      onRefresh();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      {/* Quick drop */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 12px' }}>
          Quick Drop
        </p>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: '100%', background: '#111', border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.white, fontSize: 13, marginBottom: 8 }}
        >
          <option value="vibe">Vibe</option>
          <option value="crowd">Crowd</option>
          <option value="promo">Promo</option>
          <option value="info">Info</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Beacon text…"
          style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.white, fontSize: 13, marginBottom: 8, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ flex: 1, background: '#111', border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.muted, fontSize: 12 }}
          >
            {[15, 30, 45, 60, 90, 120].map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
          <ActionButton label={dropping ? '...' : 'Drop'} disabled={!title.trim() || dropping} onClick={handleDrop} />
        </div>
      </div>

      {/* Incentive beacon */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
        <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 12px' }}>
          Incentive Beacon
        </p>
        <input
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          placeholder="Reward (e.g. Free drink at bar)"
          style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.white, fontSize: 13, marginBottom: 8, outline: 'none' }}
        />
        <ActionButton label={dropping ? '...' : 'Push Incentive'} color={T.warn} disabled={!title.trim() || !reward.trim() || dropping} onClick={handleIncentive} />
      </div>

      {/* Active beacons */}
      <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 8px' }}>
        Active Beacons
      </p>
      {beacons?.filter(b => b.status === 'active' && b.beacon_category !== 'momentum' && b.beacon_category !== 'zone').map(b => (
        <div key={b.id} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
        }}>
          <div>
            <p style={{ color: T.white, fontSize: 13, margin: '0 0 2px', fontWeight: 600 }}>{b.title}</p>
            <p style={{ color: T.muted, fontSize: 11, margin: 0 }}>
              {b.beacon_category} · expires {new Date(b.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <ActionButton label="Expire" color={T.red} small onClick={() => handleExpire(b.id)} />
        </div>
      ))}
      {!beacons?.filter(b => b.status === 'active' && b.beacon_category !== 'momentum' && b.beacon_category !== 'zone').length && (
        <p style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No active beacons</p>
      )}
    </div>
  );
}

// ── Zones Tab ─────────────────────────────────────────────────────────────────

function ZonesTab({ venueId, beacons, onRefresh }) {
  const { prompt } = useConfirm();
  const zoneBeacons = beacons?.filter(b => b.beacon_category === 'zone') ?? [];

  const handleZoneUpdate = async (zoneId, signal) => {
    const ok = await prompt({ level: 'low' });
    if (!ok) return;
    try {
      await apiPost('/api/operator/zone/update', { venue_id: venueId, zone_id: zoneId, signal });
      onRefresh();
    } catch (e) { alert(e.message); }
  };

  const intensityColors = { busy: T.red, active: T.gold, quiet: T.green, empty: T.muted };

  return (
    <div>
      {zoneBeacons.length === 0 && (
        <p style={{ color: T.muted, fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          No zone beacons configured for this venue.
        </p>
      )}
      {zoneBeacons.map(zone => (
        <div key={zone.id} style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ color: T.white, fontWeight: 700, fontSize: 15, margin: 0 }}>{zone.title}</p>
            <span style={{ color: intensityColors[zone.title?.toLowerCase()] ?? T.muted, fontSize: 12, fontWeight: 600 }}>
              {zone.title?.toLowerCase()}
            </span>
          </div>
          {/* Intensity bar */}
          <div style={{ background: '#1a1a1a', borderRadius: 4, height: 4, marginBottom: 14 }}>
            <div style={{
              width: `${(zone.intensity ?? 0.5) * 100}%`,
              height: '100%', background: intensityColors[zone.title?.toLowerCase()] ?? T.gold,
              borderRadius: 4, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ZONE_SIGNALS.map(sig => (
              <button
                key={sig}
                onClick={() => handleZoneUpdate(zone.id, sig)}
                style={{
                  padding: '6px 14px',
                  background: zone.title?.toLowerCase() === sig ? T.gold : '#111',
                  color: zone.title?.toLowerCase() === sig ? T.black : T.muted,
                  border: `1px solid ${T.border}`, borderRadius: 6,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {sig}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Control Tab ───────────────────────────────────────────────────────────────

function ControlTab({ venueId, eventId, onRefresh }) {
  const { prompt } = useConfirm();
  const [switches, setSwitches] = useState([]);
  const [loading, setLoading] = useState(false);

  const KILL_SWITCH_DEFS = [
    { key: 'ghosted_grid', label: 'Ghosted Grid', description: 'Disables the discovery grid for this venue.' },
    { key: 'beacon_drops', label: 'Beacon Drops', description: 'Prevents new beacons from being dropped.' },
    { key: 'new_messages', label: 'New Messages', description: 'Blocks new message creation for this venue.' },
  ];

  const isActive = (key) => switches.some(s => s.key === key && s.active && s.scope_id === venueId);

  const handleKillSwitch = async (key, currentlyActive) => {
    const action = currentlyActive ? 'off' : 'on';
    const def = KILL_SWITCH_DEFS.find(d => d.key === key);
    const ok = await prompt({
      level: 'high',
      title: `${action === 'on' ? 'Activate' : 'Deactivate'} Kill Switch: ${def?.label}`,
      description: def?.description,
      risk: action === 'on'
        ? `This will immediately affect all users at your venue. Auto-expires in 4 hours.`
        : 'This will restore normal operation for this feature.',
    });
    if (!ok) return;
    setLoading(true);
    try {
      await apiPost('/api/operator/kill-switch', {
        venue_id: venueId, key, scope: 'venue', scope_id: venueId, action,
      });
      onRefresh();
      // Re-fetch switches from DB directly
      const { data } = await supabase
        .from('safety_switches')
        .select('key, scope, scope_id, active, auto_expires_at')
        .eq('scope_id', venueId);
      setSwitches(data ?? []);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    supabase
      .from('safety_switches')
      .select('key, scope, scope_id, active, auto_expires_at')
      .eq('scope_id', venueId)
      .then(({ data }) => setSwitches(data ?? []));
  }, [venueId]);

  const handleSOS = async () => {
    const ok = await prompt({
      level: 'high',
      title: 'SOS Broadcast',
      description: 'Sends an immediate safety alert to all users within 500m of this venue.',
      risk: 'This action cannot be undone. Only use in genuine safety situations. One broadcast per event per 30 minutes.',
    });
    if (!ok) return;
    try {
      await apiPost('/api/operator/sos', { venue_id: venueId, event_id: eventId });
      alert('SOS broadcast sent.');
    } catch (e) { alert(e.message); }
  };

  const handleEndEvent = async () => {
    const ok = await prompt({
      level: 'high',
      title: 'End Event Now',
      description: 'Sets momentum to WINDING DOWN and expires all active beacons for this venue.',
      risk: 'This action signals the end of the event to all users and cannot be reversed.',
    });
    if (!ok) return;
    try {
      await apiPost('/api/operator/end-event', { venue_id: venueId, event_id: eventId });
      onRefresh();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      {/* Kill switches */}
      <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 10px' }}>
        Kill Switches
      </p>
      {KILL_SWITCH_DEFS.map(def => {
        const active = isActive(def.key);
        const sw = switches.find(s => s.key === def.key && s.scope_id === venueId);
        return (
          <div key={def.key} style={{
            background: T.card,
            border: `1px solid ${active ? 'rgba(255,59,48,0.4)' : T.border}`,
            borderRadius: 10, padding: '14px 16px', marginBottom: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ color: active ? T.red : T.white, fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>
                {def.label}
              </p>
              {active && sw?.auto_expires_at && (
                <p style={{ color: T.muted, fontSize: 11, margin: 0 }}>
                  Auto-expires {new Date(sw.auto_expires_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button
              onClick={() => !loading && handleKillSwitch(def.key, active)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: active ? T.red : 'rgba(255,59,48,0.1)',
                color: active ? T.white : T.red,
                border: `1px solid ${active ? T.red : 'rgba(255,59,48,0.3)'}`,
                borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {active ? 'ON — Deactivate' : 'Activate'}
            </button>
          </div>
        );
      })}

      {/* Emergency actions */}
      <p style={{ color: T.muted, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', margin: '20px 0 10px' }}>
        Emergency
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={handleSOS}
          style={{
            padding: '14px 0', background: 'rgba(255,59,48,0.1)',
            border: `1px solid rgba(255,59,48,0.4)`, borderRadius: 10,
            color: T.red, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer',
          }}
        >
          SOS Broadcast
        </button>
        <button
          onClick={handleEndEvent}
          style={{
            padding: '14px 0', background: 'rgba(255,149,0,0.08)',
            border: `1px solid rgba(255,149,0,0.3)`, borderRadius: 10,
            color: T.warn, fontWeight: 700, fontSize: 15, letterSpacing: 1, cursor: 'pointer',
          }}
        >
          End Event Now
        </button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

function OperatorPanelInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const venueId = searchParams.get('venue_id');
  const eventId = searchParams.get('event_id');

  const [tab, setTab] = useState('LIVE');
  const [stats, setStats] = useState(null);
  const [beacons, setBeacons] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [access, setAccess] = useState(null); // null=loading, false=denied, true=ok
  const pollRef = useRef(null);

  const fetchStats = useCallback(async () => {
    if (!venueId) return;
    try {
      const data = await apiGet(`/api/operator/status?venue_id=${venueId}${eventId ? `&event_id=${eventId}` : ''}`);
      setStats(data);
    } catch {}
  }, [venueId, eventId]);

  const fetchBeacons = useCallback(async () => {
    if (!venueId) return;
    const { data } = await supabase
      .from('beacons')
      .select('id, title, beacon_type, beacon_category, status, intensity, ends_at, meta')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setBeacons(data ?? []);
  }, [venueId]);

  const fetchAudit = useCallback(async () => {
    if (!venueId) return;
    try {
      const data = await apiGet(`/api/operator/audit?venue_id=${venueId}&limit=10`);
      setAuditEntries(data.entries ?? []);
    } catch {}
  }, [venueId]);

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchBeacons();
    fetchAudit();
  }, [fetchStats, fetchBeacons, fetchAudit]);

  // Access check + initial load
  useEffect(() => {
    if (!venueId) { setAccess(false); return; }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { navigate('/'); return; }
      const [{ data: profile }, { data: opRow }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('operator_venues').select('id').eq('user_id', user.id).eq('venue_id', venueId).is('revoked_at', null).single(),
      ]);
      if (profile?.role === 'admin' || opRow) {
        setAccess(true);
        refreshAll();
      } else {
        setAccess(false);
      }
    });
  }, [venueId, navigate, refreshAll]);

  // Poll stats every 30s, beacons realtime
  useEffect(() => {
    if (!access) return;
    pollRef.current = setInterval(fetchStats, 30000);
    const channel = supabase
      .channel(`nop-beacons-${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beacons', filter: `venue_id=eq.${venueId}` }, fetchBeacons)
      .subscribe();
    return () => {
      clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [access, venueId, fetchStats, fetchBeacons]);

  if (!venueId) return (
    <div style={{ minHeight: '100vh', background: T.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.muted }}>No venue_id in URL</p>
    </div>
  );

  if (access === null) return (
    <div style={{ minHeight: '100vh', background: T.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.muted }}>Checking access…</p>
    </div>
  );

  if (access === false) return (
    <div style={{ minHeight: '100vh', background: T.black, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.red, fontWeight: 700 }}>Access denied</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.black, color: T.white, fontFamily: 'Barlow, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: 17, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            HOT<span style={{ color: T.gold }}>MESS</span>
          </p>
          <span style={{
            background: 'rgba(52,199,89,0.12)', color: T.green,
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
            padding: '4px 10px', borderRadius: 20,
          }}>
            LIVE
          </span>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === t ? T.gold : 'transparent'}`,
                color: tab === t ? T.gold : T.muted,
                fontSize: 12, fontWeight: 700, letterSpacing: 1.2,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'LIVE' && (
              <LiveTab
                venueId={venueId}
                eventId={eventId}
                stats={stats}
                onStatsRefresh={refreshAll}
                auditEntries={auditEntries}
              />
            )}
            {tab === 'SIGNALS' && (
              <SignalsTab
                venueId={venueId}
                eventId={eventId}
                beacons={beacons}
                onRefresh={refreshAll}
              />
            )}
            {tab === 'ZONES' && (
              <ZonesTab
                venueId={venueId}
                beacons={beacons}
                onRefresh={refreshAll}
              />
            )}
            {tab === 'CONTROL' && (
              <ControlTab
                venueId={venueId}
                eventId={eventId}
                onRefresh={refreshAll}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OperatorPanel() {
  const f5Enabled = useFlag('v6_night_operator_panel');
  if (!f5Enabled) return null;
  return (
    <ConfirmProvider>
      <OperatorPanelInner />
    </ConfirmProvider>
  );
}
