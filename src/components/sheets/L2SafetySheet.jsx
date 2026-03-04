/**
 * L2SafetySheet — Full Safety Centre
 *
 * Features:
 * - Trusted contacts (add / delete) — notify_on_sos
 * - Safety check-in logger (record you're heading out)
 * - Safety tips + UK crisis lines
 * - Link through to SOS emergency contacts + blocked users
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Phone, Lock, ChevronRight, ExternalLink,
  Plus, Trash2, Loader2, User, Users, Clock,
  CheckCircle, AlertTriangle, X,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

// ── UK Crisis lines ─────────────────────────────────────────────────────────
const CRISIS_LINES = [
  { name: 'Emergency Services', number: '999',           label: 'Police · Fire · Ambulance', urgent: true },
  { name: 'Switchboard LGBT+',  number: '0300 330 0630', label: '10am–10pm daily',            urgent: false },
  { name: 'Samaritans',         number: '116 123',        label: '24/7 — free to call',        urgent: false },
  { name: 'Galop (hate crime)', number: '0800 999 5428', label: 'LGBT+ anti-violence',         urgent: false },
];

// ── Safety tips ─────────────────────────────────────────────────────────────
const TIPS = [
  { icon: '📍', title: 'Meet in public first',     body: 'Choose a well-lit public place for first meets.' },
  { icon: '💬', title: 'Tell a trusted friend',    body: 'Share your plans before meeting someone new.' },
  { icon: '🔒', title: 'Keep details private',     body: "Don't share your home address until you're comfortable." },
  { icon: '🚨', title: 'Trust your instincts',     body: 'If something feels off, leave. Your safety comes first.' },
];

// ── Check-in durations ──────────────────────────────────────────────────────
const DURATIONS = [
  { label: '1 hour',  minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: 'Tonight', minutes: 480 },
];

const RELATIONS = ['Friend', 'Partner', 'Family', 'Other'];

export default function L2SafetySheet() {
  const { openSheet } = useSheet();
  const [tab, setTab] = useState('contacts');

  // ── Trusted contacts state ──────────────────────────────────────────────
  const [contacts, setContacts]           = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState(null);
  const [formError, setFormError]         = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', relation: 'Friend' });

  // ── Check-in state ──────────────────────────────────────────────────────
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [checkInsLoading, setCheckInsLoading] = useState(false);
  const [logging, setLogging]             = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(120);

  // ── Load trusted contacts ───────────────────────────────────────────────
  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setContactsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setContactsLoading(false); return; }
    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) setContacts(data);
    setContactsLoading(false);
  }

  // ── Load recent check-ins ───────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'checkin') return;
    loadCheckIns();
  }, [tab]);

  async function loadCheckIns() {
    setCheckInsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCheckInsLoading(false); return; }
    const { data, error } = await supabase
      .from('safety_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error && data) setRecentCheckIns(data);
    setCheckInsLoading(false);
  }

  // ── Add trusted contact ─────────────────────────────────────────────────
  async function handleAddContact(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim())                          { setFormError('Name is required.'); return; }
    if (!form.phone.trim() && !form.email.trim())   { setFormError('Add a phone or email.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setFormError('Not signed in.'); return; }

    const { error } = await supabase.from('trusted_contacts').insert({
      user_id:        user.id,
      contact_name:  form.name.trim(),
      contact_phone: form.phone.trim() || null,
      contact_email: form.email.trim() || null,
      relationship:  form.relation,
      notify_on_sos: true,
    });

    setSaving(false);
    if (error) { setFormError('Could not save. Try again.'); return; }

    toast.success(`${form.name} added`);
    setForm({ name: '', phone: '', email: '', relation: 'Friend' });
    setShowAddForm(false);
    loadContacts();
  }

  // ── Delete trusted contact ──────────────────────────────────────────────
  async function handleDelete(id, name) {
    setDeleting(id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(null); return; }
    const { error } = await supabase.from('trusted_contacts').delete().eq('id', id).eq('user_id', user.id);
    setDeleting(null);
    if (!error) { setContacts(prev => prev.filter(c => c.id !== id)); toast.success(`${name} removed`); }
  }

  // ── Log check-in ────────────────────────────────────────────────────────
  async function handleLogCheckIn() {
    setLogging(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLogging(false); return; }

    let location = null;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* location denied — log anyway */ }

    const label = DURATIONS.find(d => d.minutes === selectedDuration)?.label ?? `${selectedDuration}m`;
    const { error } = await supabase.from('safety_checkins').insert({
      user_id:            user.id,
      status:             'scheduled',
      location,
      message:            `Safety check-in — ${label}`,
      notified_contacts:  contacts.filter(c => c.notify_on_sos).map(c => c.id),
    });

    setLogging(false);
    if (!error) { toast.success("Check-in logged. Stay safe ✨"); loadCheckIns(); }
    else toast.error('Could not log check-in.');
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0D0D0D]">

      {/* Hero */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div>
            <p className="text-[#C8962C] font-black text-sm">Safety Centre</p>
            <p className="text-white/50 text-xs mt-0.5">Trusted contacts, check-ins &amp; crisis lines</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 flex-shrink-0">
        {[
          { id: 'contacts', label: 'Contacts' },
          { id: 'checkin',  label: 'Check-in' },
          { id: 'tips',     label: 'Tips & Lines' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              tab === t.id ? 'bg-[#C8962C] text-black' : 'bg-white/5 text-white/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ─── CONTACTS ─────────────────────────────────────────────────── */}
        {tab === 'contacts' && (
          <div className="px-4 pb-6 space-y-3">

            {/* SOS contacts shortcut */}
            <button
              onClick={() => openSheet('emergency-contact', {})}
              className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 active:bg-red-500/15 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-red-400 font-black text-sm">SOS Emergency Contacts</p>
                <p className="text-white/40 text-xs">Alerted when you trigger the SOS button</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/60" />
            </button>

            {/* Trusted contacts header */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs uppercase tracking-widest text-white/30 font-black">Trusted Contacts</p>
              <p className="text-white/20 text-[10px]">Notified on check-ins</p>
            </div>

            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#C8962C] animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="bg-[#1C1C1E] rounded-2xl p-6 flex flex-col items-center text-center">
                <Users className="w-8 h-8 text-white/20 mb-2" />
                <p className="text-white/50 text-sm font-bold">No trusted contacts</p>
                <p className="text-white/30 text-xs mt-1 leading-relaxed">Add friends who should know when you're out.</p>
              </div>
            ) : (
              <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-[#C8962C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{c.contact_name}</p>
                      <p className="text-white/40 text-xs truncate">
                        {[c.contact_phone, c.contact_email].filter(Boolean).join(' · ')}
                        {c.relationship ? ` · ${c.relationship}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id, c.contact_name)}
                      disabled={deleting === c.id}
                      className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 active:bg-red-500/20"
                    >
                      {deleting === c.id
                        ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                        : <Trash2 className="w-4 h-4 text-red-400" />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add form */}
            <AnimatePresence>
              {showAddForm ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onSubmit={handleAddContact}
                  className="bg-[#1C1C1E] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs uppercase tracking-widest text-white/30 font-black">Add Contact</p>
                    <button type="button" onClick={() => { setShowAddForm(false); setFormError(''); }}>
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    <input type="text" placeholder="Full name *" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    <input type="tel" placeholder="Phone number" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50" />
                  </div>
                  <input type="email" placeholder="Email (optional)" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50" />
                  <select value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                    className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50 appearance-none">
                    {RELATIONS.map(r => <option key={r} value={r} className="bg-[#1C1C1E]">{r}</option>)}
                  </select>
                  {formError && <p className="text-red-400 text-xs font-bold">{formError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => { setShowAddForm(false); setFormError(''); }}
                      className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 font-bold text-sm">Cancel</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-3 bg-[#C8962C] rounded-xl text-black font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />Add Trusted Contact
                </motion.button>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* ─── CHECK-IN ─────────────────────────────────────────────────── */}
        {tab === 'checkin' && (
          <div className="px-4 pb-6 space-y-4">
            <div className="bg-[#1C1C1E] rounded-2xl p-4">
              <p className="text-white font-black text-sm mb-1">Log a safety check-in</p>
              <p className="text-white/40 text-xs leading-relaxed mb-4">
                Tell your trusted contacts you're heading out. They'll know to expect you back within your chosen time.
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">How long will you be out?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {DURATIONS.map(d => (
                  <button key={d.minutes} onClick={() => setSelectedDuration(d.minutes)}
                    className={`py-3 rounded-xl text-sm font-black transition-all ${
                      selectedDuration === d.minutes
                        ? 'bg-[#C8962C] text-black'
                        : 'bg-black/40 border border-white/10 text-white/60'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <button onClick={handleLogCheckIn} disabled={logging}
                className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                {logging
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Logging...</>
                  : <><CheckCircle className="w-4 h-4" />I'm heading out — I'm safe</>}
              </button>
            </div>

            {checkInsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[#C8962C] animate-spin" />
              </div>
            ) : recentCheckIns.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">Recent Check-ins</p>
                <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
                  {recentCheckIns.map(ci => (
                    <div key={ci.id} className="flex items-center gap-3 p-3">
                      <Clock className="w-4 h-4 text-white/30 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs truncate">{ci.message || 'Check-in logged'}</p>
                        <p className="text-white/30 text-[10px]">
                          {new Date(ci.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        ci.status === 'sos'       ? 'bg-red-500/20 text-red-400' :
                        ci.status === 'safe'      ? 'bg-green-500/20 text-green-400' :
                        ci.status === 'scheduled' ? 'bg-[#C8962C]/20 text-[#C8962C]' :
                        'bg-white/10 text-white/40'
                      }`}>{ci.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TIPS & CRISIS LINES ──────────────────────────────────────── */}
        {tab === 'tips' && (
          <div className="px-4 pb-6 space-y-4">
            <div className="space-y-2">
              {TIPS.map(tip => (
                <div key={tip.title} className="bg-[#1C1C1E] rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">{tip.icon}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{tip.title}</p>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">{tip.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">Crisis Lines (UK)</p>
              <div className="space-y-2">
                {CRISIS_LINES.map(line => (
                  <a key={line.name} href={`tel:${line.number.replace(/\s/g, '')}`}
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 active:opacity-75 transition-opacity ${
                      line.urgent ? 'bg-red-500/15 border border-red-500/20' : 'bg-[#1C1C1E]'
                    }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      line.urgent ? 'bg-red-500/20' : 'bg-[#C8962C]/15'
                    }`}>
                      <Phone className={`w-4 h-4 ${line.urgent ? 'text-red-400' : 'text-[#C8962C]'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-black text-sm ${line.urgent ? 'text-red-400' : 'text-white'}`}>{line.name}</p>
                      <p className="text-white/40 text-xs">{line.number} · {line.label}</p>
                    </div>
                    <ExternalLink className={`w-4 h-4 ${line.urgent ? 'text-red-400/60' : 'text-white/20'}`} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">Moderation</p>
              <button onClick={() => openSheet('blocked')}
                className="w-full bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 active:bg-white/5 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-white/60" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold text-sm">Blocked Users</p>
                  <p className="text-white/40 text-xs">Manage your block list</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
