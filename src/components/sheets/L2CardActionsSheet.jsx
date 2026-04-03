/**
 * L2CardActionsSheet -- Universal card action sheet
 *
 * Opened by tapping the 3-dot menu on event, product, beacon, or release cards.
 * Actions: Share, Save, Hide, Report, Block (if profile), Copy link
 */

import React, { useState } from 'react';
import { Share2, Bookmark, EyeOff, Flag, Ban, Link2, Check } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { supabase } from '@/components/utils/supabaseClient';
import { hapticLight } from '@/lib/haptics';

const GOLD = '#C8962C';
const CARD = '#1C1C1E';

function ActionRow({ icon: Icon, label, sublabel, color, onTap, disabled }) {
  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-white/5 active:scale-[0.98] transition-all disabled:opacity-40"
      style={{ background: CARD }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-white text-sm font-semibold">{label}</p>
        {sublabel && <p className="text-white/40 text-xs mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

export default function L2CardActionsSheet({ itemType, itemId, profileId, title }) {
  const { closeSheet } = useSheet();
  const { session } = useBootGuard();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);

  const userId = session?.user?.id;

  const buildShareUrl = () => {
    const base = window.location.origin;
    if (itemType === 'event') return `${base}/pulse?sheet=event&id=${itemId}`;
    if (itemType === 'product') return `${base}/market?sheet=product&productId=${itemId}`;
    if (itemType === 'beacon') return `${base}/pulse?sheet=beacon&beaconId=${itemId}`;
    if (itemType === 'release') return `${base}/music?release=${itemId}`;
    return `${base}?ref=${itemId}`;
  };

  const handleShare = async () => {
    hapticLight();
    const url = buildShareUrl();
    const shareData = {
      title: title || 'Check this out on HOTMESS',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share
    }
  };

  const handleCopyLink = async () => {
    hapticLight();
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleSave = async () => {
    hapticLight();
    if (!userId) return;
    try {
      await supabase.from('saved_items').insert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId,
      });
      setSaved(true);
    } catch {
      // Ignore duplicate saves
      setSaved(true);
    }
  };

  const handleHide = () => {
    hapticLight();
    // Store hidden items in localStorage for client-side filtering
    try {
      const key = `hm_hidden_${itemType}s`;
      const hidden = JSON.parse(localStorage.getItem(key) || '[]');
      if (!hidden.includes(itemId)) {
        hidden.push(itemId);
        localStorage.setItem(key, JSON.stringify(hidden));
      }
    } catch {
      // ignore
    }
    closeSheet();
  };

  const handleReport = async () => {
    hapticLight();
    if (!userId) return;
    // Placeholder: insert report record
    try {
      await supabase.from('reports').insert({
        reporter_id: userId,
        target_type: itemType,
        target_id: itemId,
        reason: 'user_report',
      });
    } catch {
      // Table may not exist yet
    }
    setReported(true);
  };

  const handleBlock = async () => {
    hapticLight();
    if (!userId || !profileId) return;
    try {
      await supabase.from('blocks').insert({
        blocker_id: userId,
        blocked_id: profileId,
      });
    } catch {
      // Ignore duplicate blocks
    }
    closeSheet();
  };

  return (
    <div className="px-4 pb-6 pt-2 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">
        Actions
      </p>

      <ActionRow
        icon={Share2}
        label="Share"
        color={GOLD}
        onTap={handleShare}
      />

      <ActionRow
        icon={saved ? Check : Bookmark}
        label={saved ? 'Saved' : 'Save'}
        color={saved ? '#30D158' : GOLD}
        onTap={handleSave}
        disabled={saved || !userId}
      />

      <ActionRow
        icon={copied ? Check : Link2}
        label={copied ? 'Copied' : 'Copy Link'}
        color={copied ? '#30D158' : '#8E8E93'}
        onTap={handleCopyLink}
      />

      <ActionRow
        icon={EyeOff}
        label="Hide"
        sublabel="Don't show this again"
        color="#8E8E93"
        onTap={handleHide}
      />

      <ActionRow
        icon={Flag}
        label={reported ? 'Reported' : 'Report'}
        color="#FF3B30"
        onTap={handleReport}
        disabled={reported || !userId}
      />

      {profileId && (
        <ActionRow
          icon={Ban}
          label="Block"
          sublabel="Block this user"
          color="#FF3B30"
          onTap={handleBlock}
          disabled={!userId}
        />
      )}
    </div>
  );
}
