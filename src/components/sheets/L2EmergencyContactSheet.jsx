/**
 * L2EmergencyContactSheet — Manage emergency contacts
 *
 * Lets users add / delete emergency contacts.
 * These contacts receive an SMS link when SOS is triggered.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Plus, Loader2, User, Phone, Users } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const RELATIONS = ['Friend', 'Partner', 'Family', 'Other'];

export default function L2EmergencyContactSheet() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', phone: '', relation: 'Friend' });

  // ─── Load contacts ────────────────────────────────────────────────────────
  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error: fetchError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!fetchError && data) setContacts(data);
    setLoading(false);
  }

  // ─── Save new contact ─────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.phone.trim()) { setError('Phone number is required.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setError('Not signed in.'); return; }

    const { error: insertError } = await supabase
      .from('emergency_contacts')
      .insert({ user_id: user.id, name: form.name.trim(), phone: form.phone.trim(), relation: form.relation });

    setSaving(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('That phone number is already saved.');
      } else {
        setError('Could not save contact. Please try again.');
      }
      return;
    }

    setForm({ name: '', phone: '', relation: 'Friend' });
    setShowForm(false);
    loadContacts();
  }

  // ─── Delete contact ───────────────────────────────────────────────────────
  async function handleDelete(contactId) {
    setDeleting(contactId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(null); return; }

    await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id);

    setDeleting(null);
    setContacts(prev => prev.filter(c => c.id !== contactId));
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Hero banner */}
      <div className="px-4 pt-4 pb-5">
        <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div>
            <p className="text-[#C8962C] font-black text-sm">Emergency Contact</p>
            <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
              Always get notified if you trigger SOS. They'll receive a text with your alert.
            </p>
          </div>
        </div>
      </div>

      {/* Contacts list */}
      <div className="px-4 pb-4">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Saved Contacts</p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-6 flex flex-col items-center text-center">
            <Users className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-white/50 text-sm font-bold">No contacts yet</p>
            <p className="text-white/30 text-xs mt-1">Add someone who'll be alerted if you trigger SOS.</p>
          </div>
        ) : (
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#C8962C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{contact.name}</p>
                  <p className="text-white/50 text-xs">{contact.phone} · {contact.relation}</p>
                </div>
                <button
                  onClick={() => handleDelete(contact.id)}
                  disabled={deleting === contact.id}
                  className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 active:bg-red-500/20 transition-colors"
                  aria-label={`Remove ${contact.name}`}
                >
                  {deleting === contact.id
                    ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                    : <Trash2 className="w-4 h-4 text-red-400" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add contact */}
      <div className="px-4 pb-6">
        <AnimatePresence>
          {showForm ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onSubmit={handleSave}
              className="bg-[#1C1C1E] rounded-2xl p-4 space-y-3"
            >
              <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-1">Add Contact</p>

              {/* Name */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50"
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-white/5 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50"
                />
              </div>

              {/* Relation */}
              <select
                value={form.relation}
                onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50 appearance-none"
              >
                {RELATIONS.map(r => (
                  <option key={r} value={r} className="bg-[#1C1C1E]">{r}</option>
                ))}
              </select>

              {/* Error */}
              {error && (
                <p className="text-red-400 text-xs font-bold">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(''); setForm({ name: '', phone: '', relation: 'Friend' }); }}
                  className="flex-1 py-3 bg-white/5 rounded-xl text-white/60 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-[#C8962C] rounded-xl text-black font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowForm(true); setError(''); }}
              className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
