/**
 * DataPrivacyHub — GDPR data rights: export, delete, manage consents, legal links.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download, Trash2, Shield, FileText, ChevronRight,
  CheckCircle, Clock, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AMBER = '#C8962C';

interface DataRequest {
  id: string;
  type: 'export' | 'delete';
  status: 'pending' | 'processing' | 'complete' | 'failed';
  created_at: string;
}

interface ConsentRecord {
  consent_type: string;
  granted: boolean;
  granted_at: string;
}

export default function DataPrivacyHub() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [reqRes, conRes] = await Promise.all([
        supabase.from('user_data_requests').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('user_consents').select('consent_type, granted, granted_at').eq('user_id', session.user.id),
      ]);

      setRequests((reqRes.data || []) as DataRequest[]);
      setConsents((conRes.data || []) as ConsentRecord[]);
      setLoading(false);
    })();
  }, []);

  const requestExport = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Call GDPR API
      await fetch('/api/gdpr/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: 'export' }),
      });

      // Also persist locally
      await supabase.from('user_data_requests').insert({
        user_id: session.user.id,
        type: 'export',
        status: 'pending',
      });

      toast.success('Data export requested. We\u2019ll email you when it\u2019s ready.');
      setRequests((prev) => [{ id: 'new', type: 'export', status: 'pending', created_at: new Date().toISOString() }, ...prev]);
    } catch {
      toast.error('Could not request export. Try again.');
    }
    setSubmitting(false);
  };

  const requestDelete = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      await fetch('/api/gdpr/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: 'delete' }),
      });

      await supabase.from('user_data_requests').insert({
        user_id: session.user.id,
        type: 'delete',
        status: 'pending',
      });

      toast.success('Account deletion requested. This takes up to 30 days.');
      setShowDeleteConfirm(false);
      setRequests((prev) => [{ id: 'new', type: 'delete', status: 'pending', created_at: new Date().toISOString() }, ...prev]);
    } catch {
      toast.error('Could not request deletion. Try again.');
    }
    setSubmitting(false);
  };

  const toggleConsent = async (consentType: string, currentGranted: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const newGranted = !currentGranted;
    await supabase.from('user_consents').upsert({
      user_id: session.user.id,
      consent_type: consentType,
      granted: newGranted,
      accepted: newGranted,
      granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,consent_type' }).catch(() => {});

    setConsents((prev) =>
      prev.map((c) => c.consent_type === consentType ? { ...c, granted: newGranted } : c)
    );
    toast.success(newGranted ? 'Consent granted' : 'Consent revoked');
  };

  const statusIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'processing') return <Clock className="w-4 h-4 text-yellow-500" />;
    if (status === 'failed') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-white/30" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#C8962C] rounded-full animate-spin" />
      </div>
    );
  }

  const CONSENT_LABELS: Record<string, string> = {
    location: 'Location services',
    presence: 'Presence on map',
    social_visibility: 'Social visibility',
    ai_features: 'AI suggestions',
    analytics: 'Performance analytics',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-4 h-4" style={{ color: AMBER }} />
        <p className="text-white/40 text-xs">Your data. Your rules.</p>
      </div>

      {/* ── Download my data ── */}
      <div>
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2">Your data</p>
        <button
          onClick={requestExport}
          disabled={submitting}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl active:scale-[0.99] transition-transform disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Download className="w-5 h-5 text-white/30" />
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-semibold">Download my data</p>
            <p className="text-white/35 text-xs mt-0.5">Request a copy of everything we hold about you</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/20" />
        </button>
      </div>

      {/* ── Delete account ── */}
      <div>
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2">Account</p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl active:scale-[0.99] transition-transform"
            style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)' }}
          >
            <Trash2 className="w-5 h-5 text-red-400/60" />
            <div className="flex-1 text-left">
              <p className="text-red-400 text-sm font-semibold">Delete my account</p>
              <p className="text-white/35 text-xs mt-0.5">Permanently remove your profile and data</p>
            </div>
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)' }}
          >
            <p className="text-red-400 text-sm font-bold">Are you sure?</p>
            <p className="text-white/40 text-xs leading-relaxed">
              This will permanently delete your profile, messages, listings, and all associated data.
              This cannot be undone. Processing takes up to 30 days.
            </p>
            <div className="flex gap-2">
              <button
                onClick={requestDelete}
                disabled={submitting}
                className="flex-1 h-10 rounded-xl text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-40"
                style={{ background: 'rgba(255,59,48,0.2)', color: '#FF3B30' }}
              >
                {submitting ? 'Requesting...' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 rounded-xl text-sm font-medium text-white/40 active:scale-[0.97] transition-transform"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Manage consents ── */}
      {consents.length > 0 && (
        <div>
          <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2">Consents</p>
          <div className="space-y-1">
            {consents.filter(c => c.consent_type).map((c) => (
              <button
                key={c.consent_type}
                onClick={() => toggleConsent(c.consent_type, c.granted)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-transform"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex-1 text-left">
                  <p className="text-white text-sm">{CONSENT_LABELS[c.consent_type] || c.consent_type}</p>
                </div>
                <span className={`text-xs font-bold ${c.granted ? 'text-green-400' : 'text-white/30'}`}>
                  {c.granted ? 'Granted' : 'Revoked'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent requests ── */}
      {requests.length > 0 && (
        <div>
          <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2">Recent requests</p>
          <div className="space-y-1">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {statusIcon(r.status)}
                <div className="flex-1">
                  <p className="text-white text-sm">{r.type === 'export' ? 'Data export' : 'Account deletion'}</p>
                  <p className="text-white/30 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs text-white/30 capitalize">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Legal links ── */}
      <div>
        <p className="text-white/25 text-[10px] font-bold uppercase tracking-[0.15em] px-1 mb-2">Legal</p>
        {[
          { label: 'Privacy Policy', path: '/legal/privacy' },
          { label: 'Terms of Service', path: '/legal/terms' },
          { label: 'Location & Presence', path: '/legal/location' },
          { label: 'AI Disclosure', path: '/legal/ai' },
        ].map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.99] transition-transform"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <FileText className="w-4 h-4 text-white/20" />
            <span className="flex-1 text-left text-white/50 text-sm">{link.label}</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/15" />
          </button>
        ))}
      </div>
    </div>
  );
}
