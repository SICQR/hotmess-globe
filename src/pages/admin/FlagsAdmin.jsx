/**
 * FlagsAdmin — v6 Feature Flag Management
 *
 * Route:  /admin/flags
 * Access: profiles.role = 'admin' only
 *
 * 00A Safety Rule enforced:
 *   - Flags with requires_phil_signoff_for_ramp=true cannot be expanded
 *     beyond phil_only until a signoff note is saved.
 *   - Every flip writes a row to feature_flag_audit_log.
 *
 * 00B Kill Switch:
 *   - v6_all_off toggle rendered at the very top with a red banner when active.
 *   - When ON: all other flag resolution returns false (enforced in v6Flags.js).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { logFlagFlip, bustFlagCache } from '@/lib/v6Flags';
import {
  Shield, ShieldAlert, ArrowLeft, Loader2, ToggleLeft, ToggleRight,
  AlertTriangle, Users, ChevronDown, ChevronUp, Plus, X, ScrollText,
  CheckCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Constants ────────────────────────────────────────────────────────────────

const COHORT_OPTIONS = [
  { value: 'phil_only', label: 'Phil only',       desc: 'Single user — you' },
  { value: 'admins',    label: 'Admins',           desc: 'All admin-role users' },
  { value: 'beta_5',    label: 'Trusted 5',        desc: 'Beta cohort — 5 users' },
  { value: 'beta_25',   label: 'Trusted 25',       desc: 'Beta cohort — 25 users' },
  { value: 'all',       label: 'Everyone',         desc: 'All authenticated users' },
];

const GOLD   = '#C8962C';
const BG     = '#050507';
const CARD   = '#0E0E10';
const BORDER = 'rgba(255,255,255,0.08)';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Kill Switch Banner ───────────────────────────────────────────────────────

function KillSwitchBanner() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 text-sm font-bold"
      style={{ background: '#FF3B30', color: '#fff' }}
    >
      <ShieldAlert className="w-5 h-5 shrink-0" />
      <span>🚨 v6 KILL SWITCH ACTIVE — all v6 features disabled for all users. Toggle off when incident is resolved.</span>
    </div>
  );
}

// ── Flag Card ────────────────────────────────────────────────────────────────

function FlagCard({ flag, actorId, onUpdate }) {
  const isKillSwitch = flag.flag_key === 'v6_all_off';
  const [expanded,   setExpanded]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [newUid,     setNewUid]     = useState('');
  const [signoffNote, setSignoffNote] = useState(flag.phil_signoff_note ?? '');
  const [cohort,     setCohort]     = useState(flag.enabled_for_cohort);

  const needsSignoff =
    flag.requires_phil_signoff_for_ramp &&
    !flag.phil_signoff_note &&
    flag.enabled_for_cohort !== 'phil_only';

  // ── Toggle globally (kill switch uses enabled_globally, flags use cohort='all') ──

  async function handleKillSwitchToggle() {
    if (!isKillSwitch) return;
    const next = !flag.enabled_globally;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled_globally: next })
        .eq('flag_key', 'v6_all_off');
      if (error) throw error;
      bustFlagCache('v6_all_off');
      await logFlagFlip(
        'v6_all_off', actorId,
        next ? 'kill_switch_on' : 'kill_switch_off',
        { enabled_globally: !next },
        { enabled_globally: next },
      );
      toast.success(next ? '🚨 Kill switch ON — all v6 features disabled' : '✅ Kill switch OFF — flags resume normal resolution');
      onUpdate();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Change cohort ────────────────────────────────────────────────────────

  async function handleCohortChange(next) {
    // Safety rule: block ramp beyond phil_only if no signoff
    if (
      flag.requires_phil_signoff_for_ramp &&
      !flag.phil_signoff_note &&
      next !== 'phil_only'
    ) {
      toast.error('00A Safety Rule: save a Phil signoff note before expanding beyond phil_only.');
      return;
    }
    setSaving(true);
    try {
      const globalNow = next === 'all';
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled_for_cohort: next, enabled_globally: globalNow })
        .eq('flag_key', flag.flag_key);
      if (error) throw error;
      bustFlagCache(flag.flag_key);
      await logFlagFlip(
        flag.flag_key, actorId, 'cohort_change',
        { cohort: flag.enabled_for_cohort },
        { cohort: next },
      );
      setCohort(next);
      toast.success(`Cohort → ${next}`);
      onUpdate();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Add user UUID ────────────────────────────────────────────────────────

  async function handleAddUser() {
    const uid = newUid.trim();
    if (!uid || uid.length < 36) { toast.error('Enter a valid UUID'); return; }
    if (flag.enabled_for_user_ids?.includes(uid)) { toast.error('Already in list'); return; }
    setSaving(true);
    try {
      const next = [...(flag.enabled_for_user_ids ?? []), uid];
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled_for_user_ids: next })
        .eq('flag_key', flag.flag_key);
      if (error) throw error;
      bustFlagCache(flag.flag_key);
      await logFlagFlip(flag.flag_key, actorId, 'add_user', null, { user_id: uid });
      setNewUid('');
      toast.success('User added');
      onUpdate();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Remove user UUID ─────────────────────────────────────────────────────

  async function handleRemoveUser(uid) {
    setSaving(true);
    try {
      const next = (flag.enabled_for_user_ids ?? []).filter(u => u !== uid);
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled_for_user_ids: next })
        .eq('flag_key', flag.flag_key);
      if (error) throw error;
      bustFlagCache(flag.flag_key);
      await logFlagFlip(flag.flag_key, actorId, 'remove_user', { user_id: uid }, null);
      toast.success('User removed');
      onUpdate();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Save signoff note ────────────────────────────────────────────────────

  async function handleSaveSignoff() {
    if (!signoffNote.trim()) { toast.error('Note cannot be empty'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ phil_signoff_note: signoffNote.trim() })
        .eq('flag_key', flag.flag_key);
      if (error) throw error;
      bustFlagCache(flag.flag_key);
      await logFlagFlip(flag.flag_key, actorId, 'signoff_note_saved', null, { note: signoffNote.trim() });
      toast.success('Signoff note saved — flag can now be ramped');
      onUpdate();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const isOn = isKillSwitch
    ? flag.enabled_globally
    : (flag.enabled_globally || flag.enabled_for_cohort === 'all' || (flag.enabled_for_user_ids?.length > 0));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: CARD,
        border: isKillSwitch
          ? `1px solid ${isOn ? '#FF3B30' : BORDER}`
          : `1px solid ${isOn ? GOLD + '40' : BORDER}`,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => !isKillSwitch && setExpanded(e => !e)}
      >
        {/* Toggle (kill switch) or status dot */}
        {isKillSwitch ? (
          <button
            onClick={e => { e.stopPropagation(); handleKillSwitchToggle(); }}
            disabled={saving}
            className="shrink-0"
            aria-label="Toggle kill switch"
          >
            {isOn
              ? <ToggleRight className="w-8 h-8" style={{ color: '#FF3B30' }} />
              : <ToggleLeft  className="w-8 h-8 text-white/30" />
            }
          </button>
        ) : (
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: isOn ? GOLD : 'rgba(255,255,255,0.15)' }}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white/90">{flag.flag_key}</span>
            {isKillSwitch && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ background: '#FF3B3020', color: '#FF3B30' }}>KILL SWITCH</span>
            )}
            {needsSignoff && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ background: '#FF950020', color: '#FF9500' }}>needs signoff</span>
            )}
          </div>
          <p className="text-white/40 text-xs mt-0.5 truncate">{flag.description}</p>
        </div>

        {!isKillSwitch && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: GOLD + '18', color: GOLD }}
            >
              {cohort}
            </span>
            <span className="text-white/30 text-xs">{flag.enabled_for_user_ids?.length ?? 0} users</span>
            {expanded
              ? <ChevronUp   className="w-4 h-4 text-white/30" />
              : <ChevronDown className="w-4 h-4 text-white/30" />
            }
          </div>
        )}
      </div>

      {/* Expanded detail (non-kill-switch flags) */}
      {!isKillSwitch && expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${BORDER}` }}>

          {/* Cohort selector */}
          <div className="pt-3">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Cohort level</p>
            <div className="flex flex-wrap gap-2">
              {COHORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleCohortChange(opt.value)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: cohort === opt.value ? GOLD : 'rgba(255,255,255,0.05)',
                    color:      cohort === opt.value ? '#000' : 'rgba(255,255,255,0.5)',
                    border:     `1px solid ${cohort === opt.value ? GOLD : BORDER}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* User UUIDs */}
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
              Selected user IDs ({flag.enabled_for_user_ids?.length ?? 0})
            </p>
            <div className="space-y-1 mb-2">
              {(flag.enabled_for_user_ids ?? []).map(uid => (
                <div
                  key={uid}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
                >
                  <span className="font-mono text-xs text-white/60 truncate">{uid}</span>
                  <button
                    onClick={() => handleRemoveUser(uid)}
                    disabled={saving}
                    className="shrink-0 text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newUid}
                onChange={e => setNewUid(e.target.value)}
                placeholder="Paste user UUID…"
                className="flex-1 bg-transparent text-white text-xs px-3 py-2 rounded-lg outline-none"
                style={{ border: `1px solid ${BORDER}` }}
              />
              <button
                onClick={handleAddUser}
                disabled={saving || !newUid.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: GOLD + '20', color: GOLD, border: `1px solid ${GOLD}40` }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Signoff note (00A) */}
          {flag.requires_phil_signoff_for_ramp && (
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">
                Phil signoff note
                <span className="ml-1 text-white/25 normal-case font-normal">(required before ramping beyond phil_only)</span>
              </p>
              {flag.phil_signoff_note ? (
                <div
                  className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-white/60"
                  style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span>{flag.phil_signoff_note}</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={signoffNote}
                    onChange={e => setSignoffNote(e.target.value)}
                    placeholder="e.g. Tested on phone 2026-05-01 — ready to ramp to admins"
                    className="flex-1 bg-transparent text-white text-xs px-3 py-2 rounded-lg outline-none"
                    style={{ border: `1px solid ${BORDER}` }}
                  />
                  <button
                    onClick={handleSaveSignoff}
                    disabled={saving || !signoffNote.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: GOLD + '20', color: GOLD, border: `1px solid ${GOLD}40` }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Audit Log ────────────────────────────────────────────────────────────────

function AuditLog() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('feature_flag_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  return (
    <div>
      <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
        Audit log (last 50)
      </p>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-white/25 text-xs text-center py-6">No flips yet.</p>
      ) : (
        <div className="space-y-1">
          {rows.map(row => (
            <div
              key={row.id}
              className="flex items-start gap-3 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <Clock className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white/70 font-semibold">{row.flag_key}</span>
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: GOLD + '15', color: GOLD }}
                  >
                    {row.action}
                  </span>
                </div>
                {row.note && <p className="text-white/35 text-xs mt-0.5">{row.note}</p>}
                <p className="text-white/25 text-[10px] mt-0.5">{timeAgo(row.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function FlagsAdmin() {
  const [authState, setAuthState] = useState('checking'); // checking | ready | denied
  const [actorId,   setActorId]   = useState(null);
  const [flags,     setFlags]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAudit, setShowAudit] = useState(false);

  const killSwitch = flags.find(f => f.flag_key === 'v6_all_off');
  const v6Flags    = flags.filter(f => f.flag_key !== 'v6_all_off');

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setAuthState('denied'); return; }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (data?.role === 'admin') {
        setActorId(session.user.id);
        setAuthState('ready');
      } else {
        setAuthState('denied');
      }
    })();
  }, []);

  // ── Load flags ─────────────────────────────────────────────────────────────
  const loadFlags = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag_key');
    setFlags(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authState === 'ready') loadFlags();
  }, [authState, loadFlags]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8" style={{ background: BG }}>
        <Shield className="w-12 h-12 text-red-500" />
        <p className="text-white font-bold text-lg">Access denied</p>
        <p className="text-white/40 text-sm text-center">Admin role required.</p>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 text-sm font-semibold"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>

      {/* Kill switch active banner */}
      {killSwitch?.enabled_globally && <KillSwitchBanner />}

      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 pt-12 pb-4"
        style={{ background: 'rgba(5,5,7,0.95)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }}
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div>
            <h1 className="text-xl font-black">v6 Feature Flags</h1>
            <p className="text-white/40 text-xs">
              {flags.length} flags · Phil-only until manually ramped
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 max-w-2xl mx-auto">

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : (
          <>
            {/* Kill switch card */}
            {killSwitch && (
              <div>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                  00B — Kill Switch
                </p>
                <FlagCard
                  key={killSwitch.id}
                  flag={killSwitch}
                  actorId={actorId}
                  onUpdate={loadFlags}
                />
              </div>
            )}

            {/* v6 flags */}
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                v6 flags ({v6Flags.length}) — tap to expand
              </p>
              <div className="space-y-2">
                {v6Flags.map(flag => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    actorId={actorId}
                    onUpdate={loadFlags}
                  />
                ))}
              </div>
            </div>

            {/* Audit log toggle */}
            <div>
              <button
                onClick={() => setShowAudit(s => !s)}
                className="flex items-center gap-2 text-white/40 text-sm font-semibold"
              >
                <ScrollText className="w-4 h-4" />
                {showAudit ? 'Hide' : 'Show'} audit log
                {showAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showAudit && (
                <div className="mt-3">
                  <AuditLog />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
