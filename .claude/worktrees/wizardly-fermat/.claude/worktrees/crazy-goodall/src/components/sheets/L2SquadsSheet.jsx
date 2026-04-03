/**
 * L2SquadsSheet — Squad management
 *
 * Shows squads the user belongs to, lets them discover/join squads,
 * and create new ones.
 * DB: squads + squad_members (user_email based)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Loader2, Crown, Hash, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

const TABS = ['My Squads', 'Discover'];

function SquadRow({ squad, role, memberCount, onPress }) {
  const isOwner = role === 'owner' || role === 'admin';
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-4 text-left active:bg-white/5 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-[#C8962C]/15 flex items-center justify-center flex-shrink-0">
        <Hash className="w-5 h-5 text-[#C8962C]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white font-bold text-sm truncate">{squad.name}</p>
          {isOwner && <Crown className="w-3 h-3 text-[#C8962C] flex-shrink-0" />}
        </div>
        <p className="text-white/40 text-xs mt-0.5 truncate">
          {squad.interest && `${squad.interest} · `}{memberCount} member{memberCount !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
    </button>
  );
}

export default function L2SquadsSheet() {
  const [tab, setTab] = useState('My Squads');
  const [mySquads, setMySquads] = useState([]);
  const [allSquads, setAllSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', interest: '' });
  const [saving, setSaving] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUser(user);

    const [membershipsRes, allRes] = await Promise.all([
      supabase
        .from('squad_members')
        .select('squad_id, role, squads(*)')
        .eq('user_email', user.email),
      supabase
        .from('squads')
        .select('id, name, description, interest, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const myMemberships = membershipsRes.data || [];
    const mySquadIds = new Set(myMemberships.map(m => m.squad_id));

    // Enrich my squads with member count
    const mySquadList = await Promise.all(
      myMemberships.map(async m => {
        const { count } = await supabase
          .from('squad_members')
          .select('*', { count: 'exact', head: true })
          .eq('squad_id', m.squad_id);
        return { ...m.squads, role: m.role, memberCount: count || 0 };
      })
    );
    setMySquads(mySquadList);

    // Discover: squads not already joined
    const discoverList = (allRes.data || []).filter(s => !mySquadIds.has(s.id));
    setAllSquads(discoverList);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Squad name is required.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Insert squad
    const { data: squad, error: squadErr } = await supabase
      .from('squads')
      .insert({ name: form.name.trim(), description: form.description.trim(), interest: form.interest.trim(), created_by: user.email })
      .select()
      .single();

    if (squadErr) { setError('Could not create squad.'); setSaving(false); return; }

    // Add creator as owner
    await supabase
      .from('squad_members')
      .insert({ squad_id: squad.id, user_email: user.email, role: 'owner', created_by: user.email });

    setSaving(false);
    setShowCreate(false);
    setForm({ name: '', description: '', interest: '' });
    loadData();
  }

  async function handleJoin(squad) {
    if (!currentUser) return;
    setJoiningId(squad.id);
    await supabase
      .from('squad_members')
      .insert({ squad_id: squad.id, user_email: currentUser.email, role: 'member', created_by: currentUser.email });
    setJoiningId(null);
    loadData();
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0D0D0D]">

      {/* Hero */}
      <div className="px-4 pt-4 pb-3">
        <div className="bg-[#C8962C]/10 border border-[#C8962C]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[#C8962C]" />
          </div>
          <div>
            <p className="text-[#C8962C] font-black text-sm">Squads</p>
            <p className="text-white/60 text-xs mt-0.5">Find your people. Build your crew.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-black transition-colors ${
                tab === t ? 'bg-[#C8962C] text-black' : 'text-white/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
        </div>
      )}

      {/* My Squads tab */}
      {!loading && tab === 'My Squads' && (
        <div className="px-4 pb-4 space-y-3">
          {mySquads.length === 0 ? (
            <div className="bg-[#1C1C1E] rounded-2xl p-6 flex flex-col items-center text-center">
              <Users className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-white/50 font-bold text-sm">No squads yet</p>
              <p className="text-white/30 text-xs mt-1">Create one or discover squads in the Discover tab.</p>
            </div>
          ) : (
            <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
              {mySquads.map(s => (
                <SquadRow key={s.id} squad={s} role={s.role} memberCount={s.memberCount} onPress={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discover tab */}
      {!loading && tab === 'Discover' && (
        <div className="px-4 pb-4">
          {allSquads.length === 0 ? (
            <div className="bg-[#1C1C1E] rounded-2xl p-6 flex flex-col items-center text-center">
              <Hash className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-white/50 font-bold text-sm">No squads to discover</p>
              <p className="text-white/30 text-xs mt-1">You're in all of them, or none exist yet.</p>
            </div>
          ) : (
            <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
              {allSquads.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5 text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{s.name}</p>
                    {s.interest && <p className="text-white/40 text-xs">{s.interest}</p>}
                  </div>
                  <button
                    onClick={() => handleJoin(s)}
                    disabled={joiningId === s.id}
                    className="px-3 py-1.5 bg-[#C8962C] text-black text-xs font-black rounded-xl disabled:opacity-60 flex items-center gap-1"
                  >
                    {joiningId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Squad */}
      <div className="px-4 pb-6">
        <AnimatePresence>
          {showCreate ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onSubmit={handleCreate}
              className="bg-[#1C1C1E] rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-widest text-white/30 font-black">Create Squad</p>
                <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Squad name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50"
              />
              <input
                type="text"
                placeholder="Interest / vibe (e.g. house music, leather, bears)"
                value={form.interest}
                onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50"
              />
              <textarea
                placeholder="Short description (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#C8962C]/50 resize-none"
              />

              {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(''); }}
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
                  Create
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.button
              key="create-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(true)}
              className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Squad
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
