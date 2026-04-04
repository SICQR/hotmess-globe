/**
 * ModerationPage — Preloved admin moderation dashboard
 *
 * Route: /admin/moderation
 * Access: Admin / Moderator users only (role = 'admin' | 'moderator')
 *
 * 4 tabs: Queue, Reports, Sellers, Log
 * Tables: moderation_cases, moderation_actions, preloved_listings,
 *         preloved_listing_reports, seller_restrictions, profiles
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Loader2,
  Flag,
  ArrowLeft,
  Eye,
  Trash2,
  Users,
  ScrollText,
  Image,
  Ban,
  FileWarning,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

const MOD_STATES = {
  all: 'All',
  flagged: 'Flagged',
  under_review: 'Under review',
  removed: 'Removed',
};

const ACTION_COLORS = {
  clear: '#30D158',
  warn: '#FF9500',
  remove: '#FF3B30',
  restrict: '#FF3B30',
  suspend: '#FF3B30',
  dismiss: '#8E8E93',
  investigate: '#FF9500',
  under_review: '#C8962C',
};

// ── Shared button ────────────────────────────────────────────────────────────

function ActionBtn({ onClick, disabled, color, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

// ── Moderation badge ─────────────────────────────────────────────────────────

function ModerationBadge({ state }) {
  const map = {
    clear: { bg: '#30D15820', fg: '#30D158', label: 'Clear' },
    flagged: { bg: '#FF950020', fg: '#FF9500', label: 'Flagged' },
    under_review: { bg: '#C8962C20', fg: '#C8962C', label: 'Under review' },
    removed: { bg: '#FF3B3020', fg: '#FF3B30', label: 'Removed' },
  };
  const s = map[state] || { bg: '#8E8E9320', fg: '#8E8E93', label: state || 'Unknown' };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

// ── Tab: Queue ───────────────────────────────────────────────────────────────

function QueueTab({ userId }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('preloved_listings')
        .select('id, seller_id, title, category, item_condition, price_gbp, status, moderation, cover_image_url, created_at, profiles!preloved_listings_seller_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'flagged') q = q.eq('moderation', 'flagged');
      else if (filter === 'under_review') q = q.eq('moderation', 'under_review');
      else if (filter === 'removed') q = q.eq('moderation', 'removed');
      else q = q.in('moderation', ['flagged', 'under_review', 'removed']);

      const { data, error } = await q;
      if (error) throw error;

      // Fetch report counts per listing
      const ids = (data || []).map(l => l.id);
      let reportCounts = {};
      if (ids.length > 0) {
        const { data: counts } = await supabase
          .from('preloved_listing_reports')
          .select('listing_id')
          .in('listing_id', ids);
        if (counts) {
          counts.forEach(r => {
            reportCounts[r.listing_id] = (reportCounts[r.listing_id] || 0) + 1;
          });
        }
      }

      setListings((data || []).map(l => ({ ...l, report_count: reportCounts[l.id] || 0 })));
    } catch (err) {
      toast.error('Failed to load queue');
      console.error('[Moderation] queue load:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const logAction = async (listingId, actionType, reasonCode, note) => {
    await supabase.from('moderation_actions').insert({
      target_type: 'listing',
      target_id: listingId,
      action_type: actionType,
      reason_code: reasonCode || actionType,
      note: note || null,
      actor_id: userId,
    });
  };

  const handleClear = async (listing) => {
    setActing(listing.id);
    const { error } = await supabase
      .from('preloved_listings')
      .update({ moderation: 'clear' })
      .eq('id', listing.id);
    if (error) { toast.error('Failed to clear'); setActing(null); return; }
    await logAction(listing.id, 'clear', 'manual_clear', `Cleared by moderator`);
    setListings(prev => prev.filter(l => l.id !== listing.id));
    toast.success('Listing cleared');
    setActing(null);
  };

  const handleUnderReview = async (listing) => {
    setActing(listing.id);
    const { error } = await supabase
      .from('preloved_listings')
      .update({ moderation: 'under_review' })
      .eq('id', listing.id);
    if (error) { toast.error('Failed to update'); setActing(null); return; }
    await logAction(listing.id, 'under_review', 'review_started', 'Put under review');
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, moderation: 'under_review' } : l));
    toast.success('Under review');
    setActing(null);
  };

  const handleRemove = async (listing) => {
    setActing(listing.id);
    const { error } = await supabase
      .from('preloved_listings')
      .update({ moderation: 'removed', status: 'removed' })
      .eq('id', listing.id);
    if (error) { toast.error('Failed to remove'); setActing(null); return; }
    await logAction(listing.id, 'remove', 'listing_removed', `Removed listing: ${listing.title}`);
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, moderation: 'removed', status: 'removed' } : l));
    toast.success('Listing removed');
    setActing(null);
  };

  const handleWarnSeller = async (listing) => {
    setActing(listing.id);
    await supabase.from('seller_restrictions').insert({
      seller_id: listing.seller_id,
      restriction_type: 'warned',
      reason_code: 'moderation_warning',
      note: `Warning issued for listing: ${listing.title}`,
      created_by: userId,
    });
    await logAction(listing.id, 'warn', 'seller_warned', `Warned seller for listing: ${listing.title}`);
    toast.success('Seller warned');
    setActing(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(MOD_STATES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: filter === key ? '#C8962C' : '#1C1C1E',
              color: filter === key ? '#000' : 'rgba(255,255,255,0.5)',
              border: '1px solid ' + (filter === key ? '#C8962C' : 'rgba(255,255,255,0.08)'),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <CheckCircle className="w-12 h-12 text-white/10" />
          <p className="text-white/40 font-semibold">Queue is clear</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_120px_80px_90px_80px_80px_180px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-white/30 font-bold">
            <span></span>
            <span>Title / Seller</span>
            <span>Category</span>
            <span>Status</span>
            <span>Moderation</span>
            <span>Reports</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          <AnimatePresence mode="popLayout">
            {listings.map(listing => (
              <motion.div
                key={listing.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-[48px_1fr_120px_80px_90px_80px_80px_180px] gap-3 items-center px-4 py-3 rounded-xl"
                style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#0D0D0D] flex items-center justify-center flex-shrink-0">
                  {listing.cover_image_url ? (
                    <img src={listing.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-4 h-4 text-white/20" />
                  )}
                </div>

                {/* Title + seller */}
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{listing.title || 'Untitled'}</p>
                  <p className="text-white/40 text-xs truncate">{listing.profiles?.display_name || 'Unknown seller'}</p>
                </div>

                {/* Category */}
                <span className="text-white/50 text-xs truncate">{listing.category || '-'}</span>

                {/* Status */}
                <span className="text-white/50 text-xs">{listing.status || '-'}</span>

                {/* Moderation */}
                <ModerationBadge state={listing.moderation} />

                {/* Reports */}
                <span className={`text-xs font-bold ${listing.report_count > 0 ? 'text-[#FF9500]' : 'text-white/30'}`}>
                  {listing.report_count}
                </span>

                {/* Created */}
                <span className="text-white/30 text-xs">{timeAgo(listing.created_at)}</span>

                {/* Actions */}
                <div className="flex gap-1.5 flex-wrap">
                  {listing.moderation !== 'clear' && (
                    <ActionBtn onClick={() => handleClear(listing)} disabled={acting === listing.id} color="#30D158" icon={CheckCircle}>
                      Clear
                    </ActionBtn>
                  )}
                  {listing.moderation !== 'under_review' && listing.moderation !== 'removed' && (
                    <ActionBtn onClick={() => handleUnderReview(listing)} disabled={acting === listing.id} color="#C8962C" icon={Eye}>
                      Review
                    </ActionBtn>
                  )}
                  {listing.moderation !== 'removed' && (
                    <ActionBtn onClick={() => handleRemove(listing)} disabled={acting === listing.id} color="#FF3B30" icon={Trash2}>
                      Remove
                    </ActionBtn>
                  )}
                  <ActionBtn onClick={() => handleWarnSeller(listing)} disabled={acting === listing.id} color="#FF9500" icon={AlertTriangle}>
                    Warn
                  </ActionBtn>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Tab: Reports ─────────────────────────────────────────────────────────────

function ReportsTab({ userId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('preloved_listing_reports')
          .select('id, reporter_id, listing_id, reason, details, created_at, profiles!preloved_listing_reports_reporter_id_fkey(display_name), preloved_listings!preloved_listing_reports_listing_id_fkey(title)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        setReports(data || []);
      } catch (err) {
        toast.error('Failed to load reports');
        console.error('[Moderation] reports load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const logAction = async (reportId, listingId, actionType, note) => {
    await supabase.from('moderation_actions').insert({
      target_type: 'report',
      target_id: reportId,
      action_type: actionType,
      reason_code: actionType,
      note,
      actor_id: userId,
    });
  };

  const handleDismiss = async (report) => {
    setActing(report.id);
    await logAction(report.id, report.listing_id, 'dismiss', `Dismissed report: ${report.reason}`);
    setReports(prev => prev.filter(r => r.id !== report.id));
    toast.success('Report dismissed');
    setActing(null);
  };

  const handleInvestigate = async (report) => {
    setActing(report.id);
    // Put the listing under review
    await supabase
      .from('preloved_listings')
      .update({ moderation: 'under_review' })
      .eq('id', report.listing_id);
    await logAction(report.id, report.listing_id, 'investigate', `Investigating report: ${report.reason}`);
    toast.success('Listing under review');
    setActing(null);
  };

  const handleActionReport = async (report) => {
    setActing(report.id);
    await supabase
      .from('preloved_listings')
      .update({ moderation: 'removed', status: 'removed' })
      .eq('id', report.listing_id);
    await logAction(report.id, report.listing_id, 'remove', `Actioned report: removed listing`);
    setReports(prev => prev.filter(r => r.id !== report.id));
    toast.success('Listing removed');
    setActing(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <Flag className="w-12 h-12 text-white/10" />
        <p className="text-white/40 font-semibold">No reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {reports.map(report => (
          <motion.div
            key={report.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-xl overflow-hidden"
            style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => setExpanded(e => e === report.id ? null : report.id)}
              className="w-full grid grid-cols-[1fr_120px_120px_80px] gap-3 items-center px-4 py-3 text-left active:bg-white/5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{report.reason || 'No reason'}</p>
                <p className="text-white/40 text-xs truncate">{truncate(report.details, 60)}</p>
              </div>
              <span className="text-white/50 text-xs truncate">{report.profiles?.display_name || 'Unknown'}</span>
              <span className="text-white/50 text-xs truncate">{report.preloved_listings?.title || 'Unknown listing'}</span>
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-xs">{timeAgo(report.created_at)}</span>
                <ChevronDown
                  className="w-4 h-4 text-white/30 transition-transform"
                  style={{ transform: expanded === report.id ? 'rotate(180deg)' : undefined }}
                />
              </div>
            </button>

            <AnimatePresence>
              {expanded === report.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/[0.06]">
                    {report.details && (
                      <p className="text-white/60 text-sm">{report.details}</p>
                    )}
                    <div className="text-xs text-white/20 space-y-0.5">
                      <p>Report ID: <span className="text-white/40">{report.id}</span></p>
                      <p>Listing ID: <span className="text-white/40">{report.listing_id}</span></p>
                      <p>Reporter ID: <span className="text-white/40">{report.reporter_id}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <ActionBtn onClick={() => handleDismiss(report)} disabled={acting === report.id} color="#8E8E93" icon={XCircle}>
                        Dismiss
                      </ActionBtn>
                      <ActionBtn onClick={() => handleInvestigate(report)} disabled={acting === report.id} color="#FF9500" icon={Search}>
                        Investigate
                      </ActionBtn>
                      <ActionBtn onClick={() => handleActionReport(report)} disabled={acting === report.id} color="#FF3B30" icon={Trash2}>
                        Action
                      </ActionBtn>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Sellers ─────────────────────────────────────────────────────────────

function SellersTab({ userId }) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get all unique sellers from preloved_listings
        const { data: listingsData, error: listingsErr } = await supabase
          .from('preloved_listings')
          .select('seller_id, status, moderation');
        if (listingsErr) throw listingsErr;

        // Aggregate per seller
        const sellerMap = {};
        (listingsData || []).forEach(l => {
          if (!sellerMap[l.seller_id]) {
            sellerMap[l.seller_id] = { live: 0, removed: 0 };
          }
          if (l.status === 'removed' || l.moderation === 'removed') {
            sellerMap[l.seller_id].removed++;
          } else {
            sellerMap[l.seller_id].live++;
          }
        });

        const sellerIds = Object.keys(sellerMap);
        if (sellerIds.length === 0) { setSellers([]); setLoading(false); return; }

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', sellerIds);

        // Fetch report counts per seller (via listings)
        const { data: reports } = await supabase
          .from('preloved_listing_reports')
          .select('listing_id, preloved_listings!preloved_listing_reports_listing_id_fkey(seller_id)');

        const reportsBySeller = {};
        (reports || []).forEach(r => {
          const sid = r.preloved_listings?.seller_id;
          if (sid) reportsBySeller[sid] = (reportsBySeller[sid] || 0) + 1;
        });

        // Fetch restriction counts
        const { data: restrictions } = await supabase
          .from('seller_restrictions')
          .select('seller_id')
          .in('seller_id', sellerIds);

        const restrictionsBySeller = {};
        (restrictions || []).forEach(r => {
          restrictionsBySeller[r.seller_id] = (restrictionsBySeller[r.seller_id] || 0) + 1;
        });

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        const result = sellerIds.map(sid => ({
          id: sid,
          display_name: profileMap[sid]?.display_name || 'Unknown',
          avatar_url: profileMap[sid]?.avatar_url || null,
          live_count: sellerMap[sid].live,
          removed_count: sellerMap[sid].removed,
          report_count: reportsBySeller[sid] || 0,
          restriction_count: restrictionsBySeller[sid] || 0,
        }));

        // Sort by report count desc
        result.sort((a, b) => b.report_count - a.report_count);
        setSellers(result);
      } catch (err) {
        toast.error('Failed to load sellers');
        console.error('[Moderation] sellers load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const logAction = async (sellerId, actionType, note) => {
    await supabase.from('moderation_actions').insert({
      target_type: 'seller',
      target_id: sellerId,
      action_type: actionType,
      reason_code: actionType,
      note,
      actor_id: userId,
    });
  };

  const handleWarn = async (seller) => {
    setActing(seller.id);
    await supabase.from('seller_restrictions').insert({
      seller_id: seller.id,
      restriction_type: 'warned',
      reason_code: 'moderation_warning',
      note: 'Warning issued by moderator',
      created_by: userId,
    });
    await logAction(seller.id, 'warn', `Warned seller: ${seller.display_name}`);
    setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, restriction_count: s.restriction_count + 1 } : s));
    toast.success('Seller warned');
    setActing(null);
  };

  const handleRestrict = async (seller) => {
    setActing(seller.id);
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('seller_restrictions').insert({
      seller_id: seller.id,
      restriction_type: 'restricted',
      reason_code: 'listing_violation',
      note: '7-day restriction applied by moderator',
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      created_by: userId,
    });
    await logAction(seller.id, 'restrict', `Restricted seller: ${seller.display_name} for 7 days`);
    setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, restriction_count: s.restriction_count + 1 } : s));
    toast.success('Seller restricted for 7 days');
    setActing(null);
  };

  const handleSuspend = async (seller) => {
    setActing(seller.id);
    await supabase.from('seller_restrictions').insert({
      seller_id: seller.id,
      restriction_type: 'suspended',
      reason_code: 'account_suspension',
      note: 'Account suspended by moderator',
      starts_at: new Date().toISOString(),
      created_by: userId,
    });
    await logAction(seller.id, 'suspend', `Suspended seller: ${seller.display_name}`);
    setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, restriction_count: s.restriction_count + 1 } : s));
    toast.success('Seller suspended');
    setActing(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (sellers.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <Users className="w-12 h-12 text-white/10" />
        <p className="text-white/40 font-semibold">No sellers found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_60px_60px_60px_60px_180px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-white/30 font-bold">
        <span></span>
        <span>Seller</span>
        <span>Live</span>
        <span>Removed</span>
        <span>Reports</span>
        <span>Flags</span>
        <span>Actions</span>
      </div>

      {sellers.map(seller => (
        <motion.div
          key={seller.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-[40px_1fr_60px_60px_60px_60px_180px] gap-3 items-center px-4 py-3 rounded-xl"
          style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0D0D0D] flex items-center justify-center flex-shrink-0">
            {seller.avatar_url ? (
              <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-4 h-4 text-white/20" />
            )}
          </div>

          {/* Name */}
          <p className="text-white text-sm font-semibold truncate">{seller.display_name}</p>

          {/* Live count */}
          <span className="text-white/60 text-xs font-bold">{seller.live_count}</span>

          {/* Removed count */}
          <span className={`text-xs font-bold ${seller.removed_count > 0 ? 'text-[#FF3B30]' : 'text-white/30'}`}>
            {seller.removed_count}
          </span>

          {/* Reports */}
          <span className={`text-xs font-bold ${seller.report_count > 0 ? 'text-[#FF9500]' : 'text-white/30'}`}>
            {seller.report_count}
          </span>

          {/* Restrictions */}
          <span className={`text-xs font-bold ${seller.restriction_count > 0 ? 'text-[#FF3B30]' : 'text-white/30'}`}>
            {seller.restriction_count}
          </span>

          {/* Actions */}
          <div className="flex gap-1.5 flex-wrap">
            <ActionBtn onClick={() => handleWarn(seller)} disabled={acting === seller.id} color="#FF9500" icon={AlertTriangle}>
              Warn
            </ActionBtn>
            <ActionBtn onClick={() => handleRestrict(seller)} disabled={acting === seller.id} color="#FF3B30" icon={Ban}>
              Restrict
            </ActionBtn>
            <ActionBtn onClick={() => handleSuspend(seller)} disabled={acting === seller.id} color="#FF3B30" icon={ShieldAlert}>
              Suspend
            </ActionBtn>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tab: Log ─────────────────────────────────────────────────────────────────

function LogTab() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('moderation_actions')
          .select('id, action_type, target_type, target_id, reason_code, note, actor_id, created_at, profiles!moderation_actions_actor_id_fkey(display_name)')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setActions(data || []);
      } catch (err) {
        toast.error('Failed to load log');
        console.error('[Moderation] log load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <ScrollText className="w-12 h-12 text-white/10" />
        <p className="text-white/40 font-semibold">No actions logged</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[100px_80px_100px_1fr_120px_80px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-white/30 font-bold">
        <span>Action</span>
        <span>Target</span>
        <span>Reason</span>
        <span>Note</span>
        <span>Actor</span>
        <span>When</span>
      </div>

      {actions.map(action => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-[100px_80px_100px_1fr_120px_80px] gap-3 items-center px-4 py-3 rounded-xl"
          style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Action type */}
          <span
            className="text-xs font-bold uppercase"
            style={{ color: ACTION_COLORS[action.action_type] || '#8E8E93' }}
          >
            {action.action_type}
          </span>

          {/* Target type */}
          <span className="text-white/50 text-xs">{action.target_type}</span>

          {/* Reason */}
          <span className="text-white/50 text-xs truncate">{action.reason_code || '-'}</span>

          {/* Note */}
          <span className="text-white/40 text-xs truncate">{action.note || '-'}</span>

          {/* Actor */}
          <span className="text-white/60 text-xs truncate">{action.profiles?.display_name || 'System'}</span>

          {/* When */}
          <span className="text-white/30 text-xs">{timeAgo(action.created_at)}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'queue', label: 'Queue', icon: Flag },
  { key: 'reports', label: 'Reports', icon: FileWarning },
  { key: 'sellers', label: 'Sellers', icon: Users },
  { key: 'log', label: 'Log', icon: ScrollText },
];

export default function ModerationPage() {
  const [tab, setTab] = useState('queue');
  const [authState, setAuthState] = useState('checking'); // checking | denied | ready
  const [userId, setUserId] = useState(null);

  // ── Auth + role check ──────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setAuthState('denied'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (data?.role === 'admin' || data?.role === 'moderator') {
        setUserId(session.user.id);
        setAuthState('ready');
      } else {
        setAuthState('denied');
      }
    };
    check();
  }, []);

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  // ── Denied guard ───────────────────────────────────────────────────────────
  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center gap-4 p-8">
        <Shield className="w-12 h-12 text-[#FF3B30]" />
        <p className="text-white font-bold text-lg">Access denied</p>
        <p className="text-white/40 text-sm text-center">Admin or moderator role required.</p>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 text-sm font-semibold"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 pt-12 pb-4"
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
            <h1 className="text-xl font-black">Preloved Moderation</h1>
            <p className="text-white/40 text-xs">Listings, reports, sellers, actions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#1C1C1E' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
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

      {/* Tab content */}
      <div className="px-6 py-4">
        {tab === 'queue' && <QueueTab userId={userId} />}
        {tab === 'reports' && <ReportsTab userId={userId} />}
        {tab === 'sellers' && <SellersTab userId={userId} />}
        {tab === 'log' && <LogTab />}
      </div>
    </div>
  );
}
