/**
 * L2VendorEventSheet — Per-event management for vendors/promoters
 *
 * Phase 3 / S2
 *
 * Props (via SheetContext): beaconId, poolId (optional, auto-selects first pool)
 *
 * Features:
 *   - Realtime guest list via Supabase channel on ticket_orders WHERE beacon_id=X
 *   - Pool CRUD: edit label / price / cap / open-close
 *   - Staff access: grant vendor_event_access to another user by email
 *   - CSV export: calls /api/tickets/export
 *   - Search / filter guest list by name or ticket state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Download, Plus, Pencil, CheckCircle, XCircle,
  Clock, RefreshCw, Search, ChevronRight, X, AlertTriangle,
  UserPlus, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const T = {
  bg:      '#050507',
  card:    '#111116',
  surface: '#1C1C1E',
  gold:    '#C8962C',
  green:   '#22C55E',
  red:     '#EF4444',
  white:   '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.12)',
  border:  'rgba(255,255,255,0.08)',
};

const STATE_CONFIG = {
  issued:       { label: 'Issued',    color: T.gold  },
  valid:        { label: 'Valid',     color: T.green },
  scanned:      { label: 'Scanned',  color: T.muted },
  reissued:     { label: 'Reissued', color: T.gold  },
  resold_void:  { label: 'Resold',   color: T.muted },
  refunded_void:{ label: 'Refunded', color: T.red   },
  expired:      { label: 'Expired',  color: T.muted },
};

// ─────────────────────────────────────────────────────────────────────────────
// POOL API — RLS only lets the service role write ticket_inventory_pools, so all
// pool mutations go through /api/operator/ticket-pool (a client write is dropped).
// ─────────────────────────────────────────────────────────────────────────────
async function poolApi(method, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch('/api/operator/ticket-pool', {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`);
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// POOL EDIT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function PoolEditModal({ pool, onSave, onClose }) {
  const [form, setForm] = useState({
    label:      pool.label || '',
    price:      String(pool.price ?? ''),
    cap:        String(pool.inventory_cap ?? ''),
    resale:     pool.resale_allowed ?? true,
    is_active:  pool.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const update = {
        label:          form.label.trim() || pool.label,
        price:          parseFloat(form.price) || pool.price,
        inventory_cap:  form.cap ? parseInt(form.cap, 10) : null,
        resale_allowed: form.resale,
        is_active:      form.is_active,
      };
      const { pool: saved } = await poolApi('PATCH', { pool_id: pool.id, ...update });
      toast.success('Pool updated');
      onSave(saved || { ...pool, ...update });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: T.muted, fontSize: 12 }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px', color: T.white, fontSize: 14, outline: 'none',
          width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );

  const toggle = (label, key) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: T.white, fontSize: 14 }}>{label}</span>
      <button
        onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: form[key] ? T.gold : T.muted }}
      >
        {form[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: T.card, borderRadius: '20px 20px 0 0', padding: 24,
        width: '100%', maxWidth: 480, paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: T.white, fontWeight: 700, fontSize: 16 }}>Edit Pool</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {field('Label', 'label', 'text', 'e.g. General Admission')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('Price (£)', 'price', 'number', '12.00')}
          {field('Capacity', 'cap', 'number', 'unlimited')}
        </div>
        {toggle('Resale allowed', 'resale')}
        {toggle('Pool active', 'is_active')}

        <button onClick={save} disabled={saving} style={{
          padding: 12, borderRadius: 12, background: T.gold, border: 'none',
          color: '#000', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF GRANT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function StaffGrantModal({ beaconId, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [saving, setSaving] = useState(false);

  const grant = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      // Look up user by email in profiles
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (pErr || !profile?.id) {
        toast.error('User not found');
        return;
      }

      const { error } = await supabase
        .from('vendor_event_access')
        .upsert({ vendor_id: profile.id, beacon_id: beaconId, role }, { onConflict: 'vendor_id,beacon_id' });

      if (error) throw error;
      toast.success(`${role} access granted`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Grant failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: T.card, borderRadius: '20px 20px 0 0', padding: 24,
        width: '100%', maxWidth: 480, paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: T.white, fontWeight: 700, fontSize: 16 }}>Grant Staff Access</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: T.muted, fontSize: 12 }}>Email address</label>
          <input
            type="email"
            value={email}
            placeholder="staff@example.com"
            onChange={e => setEmail(e.target.value)}
            style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: '8px 12px', color: T.white, fontSize: 14, outline: 'none', width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: T.muted, fontSize: 12 }}>Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
              padding: '8px 12px', color: T.white, fontSize: 14, outline: 'none',
            }}
          >
            <option value="scanner-only">Scanner only</option>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <button onClick={grant} disabled={saving || !email.trim()} style={{
          padding: 12, borderRadius: 12, background: T.gold, border: 'none',
          color: '#000', fontWeight: 700, fontSize: 15,
          cursor: saving || !email.trim() ? 'not-allowed' : 'pointer',
          opacity: saving || !email.trim() ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          Grant Access
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GUEST ROW
// ─────────────────────────────────────────────────────────────────────────────
function GuestRow({ order }) {
  const cfg = STATE_CONFIG[order.ticket_state] || { label: order.ticket_state, color: T.muted };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: T.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {order.profiles?.avatar_url
          ? <img src={order.profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
          : <span style={{ color: T.muted, fontSize: 14, fontWeight: 700 }}>
              {(order.profiles?.display_name || '?')[0].toUpperCase()}
            </span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: T.white, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {order.profiles?.display_name || 'Unknown'}
        </div>
        <div style={{ color: T.muted, fontSize: 11 }}>{order.ticket_type}</div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, color: cfg.color,
        background: `${cfg.color}20`, borderRadius: 20, padding: '2px 8px', flexShrink: 0,
      }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function PoolCreateModal({ beaconId, onCreate, onClose }) {
  const [form, setForm] = useState({ label: '', price: '', cap: '', ticket_type: 'paid_ga' });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!form.label.trim()) { toast.error('Label required'); return; }
    if (form.price === '' || isNaN(parseFloat(form.price))) { toast.error('Price required'); return; }
    setSaving(true);
    try {
      const { pool } = await poolApi('POST', {
        beacon_id: beaconId,
        label: form.label.trim(),
        price: parseFloat(form.price),
        inventory_cap: form.cap ? parseInt(form.cap, 10) : null,
        ticket_type: form.ticket_type,
        is_active: true,
      });
      toast.success('Pool created — now selling');
      onCreate(pool);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const inp = (key, type, placeholder) => (
    <input type={type} value={form[key]} placeholder={placeholder}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.white, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, paddingBottom: 'max(24px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: T.white, fontWeight: 700, fontSize: 16 }}>New Ticket Pool</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: T.muted, fontSize: 12 }}>Label</label>
          {inp('label', 'text', 'e.g. General Admission')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: T.muted, fontSize: 12 }}>Price (£)</label>
            {inp('price', 'number', '12.00')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: T.muted, fontSize: 12 }}>Capacity</label>
            {inp('cap', 'number', 'unlimited')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: T.muted, fontSize: 12 }}>Type</label>
          <select value={form.ticket_type} onChange={e => setForm(p => ({ ...p, ticket_type: e.target.value }))}
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.white, fontSize: 14, outline: 'none' }}>
            <option value="paid_ga">Paid · General Admission</option>
            <option value="vip">VIP</option>
            <option value="guestlist">Guestlist</option>
            <option value="guest_comp">Guest / Comp</option>
            <option value="quick_drop">Quick Drop</option>
          </select>
        </div>
        <button onClick={create} disabled={saving} style={{ padding: 12, borderRadius: 12, background: T.gold, border: 'none', color: '#000', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          Create Pool
        </button>
      </div>
    </div>
  );
}

export default function L2VendorEventSheet({ beaconId }) {
  const [beacon, setBeacon]       = useState(null);
  const [pools, setPools]         = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [editPool, setEditPool]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [exporting, setExporting] = useState(false);
  const channelRef                = useRef(null);

  const load = useCallback(async () => {
    if (!beaconId) return;
    setLoading(true);
    try {
      const [{ data: b }, { data: p }, { data: o }] = await Promise.all([
        supabase.from('beacons').select('id, title, event_start_at, ends_at').eq('id', beaconId).maybeSingle(),
        supabase.from('ticket_inventory_pools').select('*').eq('beacon_id', beaconId).order('created_at'),
        supabase.from('ticket_orders')
          .select('id, ticket_type, ticket_state, price_paid, fee_amount, created_at, scanned_at, qr_token, profiles:user_id(display_name, avatar_url, email)')
          .eq('beacon_id', beaconId)
          .order('created_at', { ascending: false }),
      ]);
      setBeacon(b);
      setPools(p || []);
      setOrders(o || []);
    } finally {
      setLoading(false);
    }
  }, [beaconId]);

  // Subscribe realtime
  useEffect(() => {
    load();
    if (!beaconId) return;

    channelRef.current = supabase
      .channel(`vendor-event-${beaconId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ticket_orders',
        filter: `beacon_id=eq.${beaconId}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new, ...prev]);
          // Also bump pool inventory_sold
          setPools(prev => prev.map(p =>
            p.id === payload.new.inventory_pool_id
              ? { ...p, inventory_sold: (p.inventory_sold || 0) + 1 }
              : p
          ));
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [beaconId, load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Not signed in'); return; }

      const res = await fetch(`/api/tickets/export?beacon_id=${beaconId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `tickets-${beaconId}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Filtered orders
  const filtered = orders.filter(o => {
    const matchState = stateFilter === 'all' || o.ticket_state === stateFilter;
    const matchSearch = !search || (o.profiles?.display_name || '').toLowerCase().includes(search.toLowerCase());
    return matchState && matchSearch;
  });

  const scannedCount = orders.filter(o => o.ticket_state === 'scanned').length;
  const totalSold    = orders.filter(o => !['refunded_void', 'resold_void'].includes(o.ticket_state)).length;

  if (!beaconId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.muted }}>
        No event selected
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, color: T.white }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.dim, margin: '0 auto 16px' }} />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={24} style={{ color: T.muted, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
                  {beacon?.title || 'Event'}
                </h2>
                {beacon?.event_start_at && (
                  <div style={{ color: T.muted, fontSize: 12 }}>
                    {new Date(beacon.event_start_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowStaff(true)} style={{
                  padding: '7px 12px', borderRadius: 20, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                }}>
                  <UserPlus size={14} /> Staff
                </button>
                <button onClick={exportCsv} disabled={exporting} style={{
                  padding: '7px 12px', borderRadius: 20, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.muted, cursor: exporting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                }}>
                  {exporting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                  Export
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Sold', value: totalSold },
                { label: 'Scanned', value: scannedCount },
                { label: 'Remaining', value: pools.reduce((acc, p) => acc + Math.max(0, (p.inventory_cap || Infinity) - (p.inventory_sold || 0)), 0) || '∞' },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: T.card, borderRadius: 12, padding: '12px 16px',
                  border: `1px solid ${T.border}`, textAlign: 'center',
                }}>
                  <div style={{ color: T.gold, fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ color: T.muted, fontSize: 11 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Pools */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Ticket Pools
                </div>
                <button onClick={() => setShowCreate(true)} style={{
                  background: T.surface, border: `1px solid ${T.gold}`, borderRadius: 8,
                  padding: '6px 10px', color: T.gold, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                }}>
                  <Plus size={12} /> New pool
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pools.map(pool => (
                  <div key={pool.id} style={{
                    background: T.card, borderRadius: 12, padding: '12px 14px',
                    border: `1px solid ${pool.is_active ? T.border : T.dim}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: pool.is_active ? T.white : T.muted, fontSize: 13, fontWeight: 600 }}>
                        {pool.label} {!pool.is_active && <span style={{ color: T.muted, fontWeight: 400 }}>(closed)</span>}
                      </div>
                      <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>
                        £{Number(pool.price).toFixed(2)} · {pool.inventory_sold || 0}
                        {pool.inventory_cap ? `/${pool.inventory_cap}` : ''} sold
                      </div>
                    </div>
                    <button onClick={() => setEditPool(pool)} style={{
                      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                      padding: '6px 10px', color: T.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                    }}>
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Guest list */}
      {!loading && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
          <div style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10, textTransform: 'uppercase' }}>
            Guest List · {filtered.length}
          </div>

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search guests…"
                style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: '7px 10px 7px 30px', color: T.white, fontSize: 13, outline: 'none', width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '7px 10px', color: T.white, fontSize: 13, outline: 'none',
              }}
            >
              <option value="all">All</option>
              {Object.entries(STATE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ color: T.muted, textAlign: 'center', padding: 40, fontSize: 14 }}>
              No guests yet
            </div>
          ) : (
            filtered.map(o => <GuestRow key={o.id} order={o} />)
          )}
        </div>
      )}

      {/* Modals */}
      {editPool && (
        <PoolEditModal
          pool={editPool}
          onSave={updated => setPools(prev => prev.map(p => p.id === updated.id ? updated : p))}
          onClose={() => setEditPool(null)}
        />
      )}
      {showCreate && (
        <PoolCreateModal
          beaconId={beaconId}
          onCreate={created => setPools(prev => [...prev, created])}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showStaff && (
        <StaffGrantModal beaconId={beaconId} onClose={() => setShowStaff(false)} />
      )}
    </div>
  );
}
