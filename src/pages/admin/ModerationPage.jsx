/**
 * ModerationPage — Admin moderation queue UI
 *
 * Route: /admin/moderation
 * Access: Admin users only (is_admin = true on User table)
 *
 * Shows:
 * - Pending reports queue with priority sorting
 * - Review actions: Approve / Strike / Ban
 * - User strikes tracker
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  Loader2,
  Flag,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  urgent: '#FF3B30',
  high: '#FF9500',
  standard: '#C8962C',
};


// ── Priority badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority = 'standard' }) {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.standard;
  return (
    <span
      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
      style={{ background: `${color}20`, color }}
    >
      {priority}
    </span>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({ report, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [actioning, setActioning] = useState(false);

  const handleAction = async (action) => {
    setActioning(true);
    try {
      await onAction(report.id, action);
    } finally {
      setActioning(false);
    }
  };

  const age = report.created_at
    ? Math.round((Date.now() - new Date(report.created_at).getTime()) / 60000)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 p-4 text-left active:bg-white/5 transition-colors"
        aria-expanded={expanded}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0D0D0D' }}>
          <Flag className="w-5 h-5 text-[#C8962C]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityBadge priority={report.priority} />
            <span className="text-white/30 text-xs">
              {report.content_type}
            </span>
            {age !== null && (
              <span className="text-white/20 text-xs ml-auto">
                {age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`}
              </span>
            )}
          </div>
          <p className="text-white text-sm font-semibold truncate">
            {report.report_reason || 'No reason given'}
          </p>
          {report.content_preview && (
            <p className="text-white/40 text-xs mt-0.5 truncate">
              "{report.content_preview}"
            </p>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4 text-white/30 flex-shrink-0 mt-1 transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {/* Expanded detail + actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
              {/* Media thumbnails */}
              {report.media_urls?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {report.media_urls.slice(0, 4).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-white/10"
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}

              {/* IDs */}
              <div className="text-xs text-white/20 space-y-0.5">
                {report.content_id && <p>Content: <span className="text-white/40">{report.content_id}</span></p>}
                {report.reported_by && <p>Reporter: <span className="text-white/40">{report.reported_by}</span></p>}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('dismiss')}
                  disabled={actioning}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                >
                  {actioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  Dismiss
                </Button>
                <Button
                  onClick={() => handleAction('strike')}
                  disabled={actioning}
                  size="sm"
                  className="flex-1"
                  style={{ background: '#FF9500', color: '#000' }}
                >
                  {actioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  Strike
                </Button>
                <Button
                  onClick={() => handleAction('ban')}
                  disabled={actioning}
                  size="sm"
                  style={{ background: '#FF3B30', color: '#fff' }}
                  className="flex-1"
                >
                  {actioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                  Ban
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModerationPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending'); // 'pending' | 'actioned'
  const [isAdmin, setIsAdmin] = useState(null); // null = checking

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from('User')
        .select('is_admin')
        .eq('email', user.email)
        .single();
      setIsAdmin(data?.is_admin === true);
    };
    checkAdmin();
  }, []);

  // ── Load queue ────────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const q = supabase
        .from('moderation_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (tab === 'pending') {
        q.eq('status', 'pending');
      } else {
        q.in('status', ['approved', 'actioned', 'dismissed']);
      }

      const { data, error } = await q;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      toast.error('Failed to load reports');
      console.error('[Moderation] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (isAdmin) loadReports();
  }, [isAdmin, loadReports]);

  // ── Realtime: new reports pop in ──────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('moderation-queue-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moderation_queue',
      }, (payload) => {
        if (tab === 'pending') {
          setReports(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAdmin, tab]);

  // ── Action handler ────────────────────────────────────────────────────────
  const handleAction = useCallback(async (reportId, action) => {
    const { data: { user } } = await supabase.auth.getUser();

    let newStatus = 'dismissed';
    let actionTaken = action;

    if (action === 'strike') {
      newStatus = 'actioned';
      // Create strike record
      const report = reports.find(r => r.id === reportId);
      if (report?.reported_by) {
        await supabase.from('user_strikes').insert({
          user_id: report.reported_by,
          reason: report.report_reason || 'Community guidelines violation',
          moderation_queue_id: reportId,
        });
      }
    } else if (action === 'ban') {
      newStatus = 'actioned';
      actionTaken = 'banned';
      const report = reports.find(r => r.id === reportId);
      if (report?.reported_by) {
        await supabase.from('User').update({ is_banned: true }).eq('id', report.reported_by);
        await supabase.from('user_strikes').insert({
          user_id: report.reported_by,
          reason: 'Banned: ' + (report.report_reason || 'Severe violation'),
          moderation_queue_id: reportId,
        });
      }
    }

    const { error } = await supabase
      .from('moderation_queue')
      .update({
        status: newStatus,
        action_taken: actionTaken,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      toast.error('Action failed');
      return;
    }

    setReports(prev => prev.filter(r => r.id !== reportId));
    toast.success(
      action === 'dismiss' ? 'Report dismissed' :
      action === 'strike' ? 'Strike issued' :
      'User banned'
    );
  }, [reports]);

  // ── Loading / auth guards ─────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center gap-4 p-8">
        <Shield className="w-12 h-12 text-[#FF3B30]" />
        <p className="text-white font-bold text-lg">Admin access only</p>
        <p className="text-white/40 text-sm text-center">You don't have permission to view this page.</p>
        <Button onClick={() => window.history.back()} variant="outline" className="border-white/20 text-white/60">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const pendingCount = tab === 'pending' ? reports.length : null;

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{ background: 'rgba(5,5,7,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 active:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div>
            <h1 className="text-xl font-black">Moderation</h1>
            {pendingCount !== null && (
              <p className="text-white/40 text-xs">{pendingCount} pending report{pendingCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1C1C1E' }}>
          {[
            { key: 'pending', label: 'Pending', icon: Clock },
            { key: 'actioned', label: 'Actioned', icon: CheckCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === key ? '#C8962C' : 'transparent',
                color: tab === key ? '#000' : 'rgba(255,255,255,0.4)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <CheckCircle className="w-12 h-12 text-white/10" />
            <p className="text-white/40 font-semibold">
              {tab === 'pending' ? 'Queue is clear' : 'No actioned reports'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {reports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
