/**
 * L2TicketSheet -- Ticket Resale Market
 *
 * Two modes:
 *   - browse (default): Search and browse active ticket listings
 *   - listing: Create a new ticket listing for resale
 *
 * DB tables: ticket_listings, ticket_chat_threads, ticket_fraud_signals
 *
 * Wireframe (Browse):
 * +------------------------------------------+
 * | TICKET MARKET              [RESALE] pill |
 * | [Search event name...]                   |
 * |------------------------------------------|
 * | [TicketCard]  [TicketCard]               |
 * | [TicketCard]  ...                        |
 * |                           [SELL FAB]     |
 * +------------------------------------------+
 *
 * Wireframe (Listing):
 * +------------------------------------------+
 * | <- Back       SELL YOUR TICKET           |
 * |------------------------------------------|
 * | Event Name, Venue, Date                  |
 * | Face Value, Asking Price                 |
 * | Ticket Type, Quantity                    |
 * |------------------------------------------|
 * | [LIST TICKET]                            |
 * +------------------------------------------+
 *
 * States: loading | success | error | empty
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import {
  Search,
  ArrowLeft,
  Loader2,
  Ticket,
  Plus,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Calendar,
  MapPin,
  Tag,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface TicketListing {
  id: string;
  seller_id: string;
  event_name: string;
  event_date: string;
  event_venue: string | null;
  event_city: string | null;
  ticket_type: string;
  quantity: number;
  original_price: number | null;
  asking_price: number;
  currency: string;
  status: string;
  demand_level: string;
  view_count: number;
  save_count: number;
  inquiry_count: number;
  is_verified: boolean;
  created_at: string;
  seller_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  fraud_signals?: FraudSignal[];
}

interface FraudSignal {
  id: string;
  severity: string;
  signal_type: string;
  confidence: number | null;
}

interface ListingForm {
  event_name: string;
  event_venue: string;
  event_date: string;
  face_value: string;
  asking_price: string;
  ticket_type: 'general' | 'vip' | 'early_bird' | 'guest_list';
  quantity: number;
}

interface L2TicketSheetProps {
  mode?: 'browse' | 'listing';
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TICKET_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'vip', label: 'VIP' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'guest_list', label: 'Guest List' },
] as const;

const DEMAND_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'LOW', className: 'bg-[#8E8E93]/20 text-[#8E8E93]' },
  normal: { label: 'NORMAL', className: 'bg-white/10 text-white' },
  high: { label: 'HIGH', className: 'bg-[#C8962C]/20 text-[#C8962C]' },
  hot: { label: 'HOT', className: 'bg-[#FF3B30]/20 text-[#FF3B30]' },
};

const FRAUD_RISK_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: 'LOW RISK', className: 'bg-[#34C759]/20 text-[#34C759]' },
  medium: { label: 'MEDIUM RISK', className: 'bg-[#C8962C]/20 text-[#C8962C]' },
  high: { label: 'HIGH RISK', className: 'bg-[#FF3B30]/20 text-[#FF3B30]' },
  critical: { label: 'FLAGGED', className: 'bg-[#FF3B30]/20 text-[#FF3B30]' },
};

const EMPTY_FORM: ListingForm = {
  event_name: '',
  event_venue: '',
  event_date: '',
  face_value: '',
  asking_price: '',
  ticket_type: 'general',
  quantity: 1,
};

const MARKUP_FRAUD_THRESHOLD = 30; // percent

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function L2TicketSheet({ mode: initialMode = 'browse' }: L2TicketSheetProps) {
  const { openSheet, closeSheet } = useSheet();

  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [viewMode, setViewMode] = useState<'browse' | 'listing'>(initialMode);
  const [listings, setListings] = useState<TicketListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ListingForm>({ ...EMPTY_FORM });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ── Boot: get current user ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser({ id: user.id, email: user.email ?? '' });
    });
  }, []);

  // ── Load listings ───────────────────────────────────────────────────────
  const loadListings = useCallback(async () => {
    setLoadingState('loading');
    try {
      const { data, error } = await supabase
        .from('ticket_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const listingData = (data || []) as TicketListing[];

      // Load seller profiles for all unique seller_ids
      const sellerIds = [...new Set(listingData.map(l => l.seller_id))];
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', sellerIds);

        if (profiles) {
          const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
          profiles.forEach(p => {
            profileMap[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          });
          listingData.forEach(l => {
            l.seller_profile = profileMap[l.seller_id] || null;
          });
        }
      }

      // Load fraud signals for all listings
      const listingIds = listingData.map(l => l.id);
      if (listingIds.length > 0) {
        const { data: fraudData } = await supabase
          .from('ticket_fraud_signals')
          .select('id, listing_id, severity, signal_type, confidence')
          .in('listing_id', listingIds)
          .eq('status', 'open');

        if (fraudData) {
          const fraudMap: Record<string, FraudSignal[]> = {};
          fraudData.forEach(f => {
            if (f.listing_id) {
              if (!fraudMap[f.listing_id]) fraudMap[f.listing_id] = [];
              fraudMap[f.listing_id].push(f);
            }
          });
          listingData.forEach(l => {
            l.fraud_signals = fraudMap[l.id] || [];
          });
        }
      }

      setListings(listingData);
      setLoadingState('success');
    } catch (err) {
      console.error('[TicketSheet] loadListings error:', err);
      setLoadingState('error');
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'browse') {
      loadListings();
    }
  }, [viewMode, loadListings]);

  // ── Search filter ───────────────────────────────────────────────────────
  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const q = searchQuery.toLowerCase();
    return listings.filter(
      l =>
        l.event_name.toLowerCase().includes(q) ||
        (l.event_venue && l.event_venue.toLowerCase().includes(q)) ||
        (l.event_city && l.event_city.toLowerCase().includes(q))
    );
  }, [listings, searchQuery]);

  // ── Markup calculation ──────────────────────────────────────────────────
  const calculateMarkup = useCallback((faceValue: string, askingPrice: string): number | null => {
    const fv = parseFloat(faceValue);
    const ap = parseFloat(askingPrice);
    if (isNaN(fv) || isNaN(ap) || fv <= 0) return null;
    return Math.round(((ap - fv) / fv) * 100);
  }, []);

  const markup = calculateMarkup(form.face_value, form.asking_price);

  // ── Form validation ─────────────────────────────────────────────────────
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!form.event_name.trim()) errors.event_name = 'Event name is required';
    if (!form.event_date) errors.event_date = 'Event date is required';
    if (!form.asking_price || parseFloat(form.asking_price) <= 0) {
      errors.asking_price = 'Valid asking price is required';
    }
    if (form.quantity < 1 || form.quantity > 10) {
      errors.quantity = 'Quantity must be 1-10';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  // ── Submit listing ──────────────────────────────────────────────────────
  const handleSubmitListing = useCallback(async () => {
    if (!currentUser || submitting) return;
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const insertData = {
        seller_id: currentUser.id,
        event_name: form.event_name.trim(),
        event_venue: form.event_venue.trim() || null,
        event_date: new Date(form.event_date).toISOString(),
        original_price: form.face_value ? parseFloat(form.face_value) : null,
        asking_price: parseFloat(form.asking_price),
        ticket_type: form.ticket_type,
        quantity: form.quantity,
        status: 'active',
        currency: 'GBP',
      };

      const { error } = await supabase
        .from('ticket_listings')
        .insert(insertData);

      if (error) throw error;

      // Warn if high markup
      if (markup !== null && markup > MARKUP_FRAUD_THRESHOLD) {
        toast('High markup detected. Your listing may be reviewed for pricing.', {
          icon: <AlertTriangle className="w-4 h-4 text-[#C8962C]" />,
        });
      }

      toast.success('Ticket listed successfully');
      setForm({ ...EMPTY_FORM });
      setValidationErrors({});
      setViewMode('browse');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list ticket';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [currentUser, form, submitting, validateForm, markup]);

  // ── Handle "Chat to Buy" ───────────────────────────────────────────────
  const handleChatToBuy = useCallback(
    (listing: TicketListing) => {
      if (!currentUser) {
        toast.error('Sign in to contact sellers');
        return;
      }

      if (listing.seller_id === currentUser.id) {
        toast.error('You cannot buy your own ticket');
        return;
      }

      toast('Chat with the seller first -- 3 messages required before purchase', {
        icon: <Ticket className="w-4 h-4 text-[#C8962C]" />,
        duration: 4000,
      });

      // Open the general chat sheet with the seller
      // The ticket_chat_threads system uses UUIDs, but the main chat uses emails.
      // We pass the seller profile context so chat can be initiated.
      openSheet('chat', {
        to: listing.seller_profile?.display_name || listing.seller_id,
        title: `Re: ${listing.event_name}`,
      });
    },
    [currentUser, openSheet]
  );

  // ── Update form field ──────────────────────────────────────────────────
  const updateField = useCallback(<K extends keyof ListingForm>(field: K, value: ListingForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field on change
    setValidationErrors(prev => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER: LOADING STATE
  // ═════════════════════════════════════════════════════════════════════════

  if (loadingState === 'loading' && viewMode === 'browse') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER: ERROR STATE
  // ═════════════════════════════════════════════════════════════════════════

  if (loadingState === 'error' && viewMode === 'browse') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="w-16 h-16 text-[#8E8E93] mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Could not load tickets</h2>
        <p className="text-sm text-[#8E8E93] mb-6">
          Something went wrong fetching listings. Please try again.
        </p>
        <button
          onClick={loadListings}
          className="h-12 px-6 bg-[#C8962C] text-white font-semibold rounded-xl active:scale-95 transition-transform flex items-center gap-2"
          aria-label="Retry loading tickets"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER: LISTING MODE (Sell a Ticket)
  // ═════════════════════════════════════════════════════════════════════════

  if (viewMode === 'listing') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => {
              setViewMode('browse');
              setValidationErrors({});
            }}
            className="w-10 h-10 flex items-center justify-center text-[#C8962C] rounded-full focus:ring-2 focus:ring-[#C8962C]"
            aria-label="Back to browse"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">SELL YOUR TICKET</h1>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-5">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">
              Event Name <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              type="text"
              value={form.event_name}
              onChange={e => updateField('event_name', e.target.value)}
              placeholder="e.g. Fabric presents NYE 2026"
              className={cn(
                'w-full h-12 px-4 bg-[#1C1C1E] text-white rounded-xl border text-base',
                'placeholder-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
                validationErrors.event_name ? 'border-[#FF3B30]' : 'border-white/10'
              )}
            />
            {validationErrors.event_name && (
              <p className="text-xs text-[#FF3B30] mt-1">{validationErrors.event_name}</p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">Venue</label>
            <input
              type="text"
              value={form.event_venue}
              onChange={e => updateField('event_venue', e.target.value)}
              placeholder="e.g. Fabric, London"
              className="w-full h-12 px-4 bg-[#1C1C1E] text-white rounded-xl border border-white/10 placeholder-[#8E8E93] text-base focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
            />
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">
              Event Date <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              type="date"
              value={form.event_date}
              onChange={e => updateField('event_date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={cn(
                'w-full h-12 px-4 bg-[#1C1C1E] text-white rounded-xl border text-base',
                'focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
                '[color-scheme:dark]',
                validationErrors.event_date ? 'border-[#FF3B30]' : 'border-white/10'
              )}
            />
            {validationErrors.event_date && (
              <p className="text-xs text-[#FF3B30] mt-1">{validationErrors.event_date}</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-[#C8962C] uppercase tracking-wider mb-3">Pricing</h3>
          </div>

          {/* Face Value */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">
              Face Value (original price)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] text-base">&pound;</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.face_value}
                onChange={e => updateField('face_value', e.target.value)}
                placeholder="0.00"
                className="w-full h-12 pl-8 pr-4 bg-[#1C1C1E] text-white rounded-xl border border-white/10 placeholder-[#8E8E93] text-base focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
              />
            </div>
          </div>

          {/* Asking Price */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">
              Asking Price <span className="text-[#FF3B30]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] text-base">&pound;</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={form.asking_price}
                onChange={e => updateField('asking_price', e.target.value)}
                placeholder="0.00"
                className={cn(
                  'w-full h-12 pl-8 pr-4 bg-[#1C1C1E] text-white rounded-xl border text-base',
                  'placeholder-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
                  validationErrors.asking_price ? 'border-[#FF3B30]' : 'border-white/10'
                )}
              />
            </div>
            {validationErrors.asking_price && (
              <p className="text-xs text-[#FF3B30] mt-1">{validationErrors.asking_price}</p>
            )}
          </div>

          {/* Price Comparison Card */}
          {form.face_value && form.asking_price && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1C1C1E] rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#8E8E93]">Original price</span>
                <span className="text-sm text-white font-semibold">
                  &pound;{parseFloat(form.face_value).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#8E8E93]">Your asking price</span>
                <span className="text-sm text-[#C8962C] font-bold">
                  &pound;{parseFloat(form.asking_price).toFixed(2)}
                </span>
              </div>
              {markup !== null && (
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-sm text-[#8E8E93]">Markup</span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      markup > MARKUP_FRAUD_THRESHOLD
                        ? 'text-[#FF3B30]'
                        : markup > 0
                          ? 'text-[#C8962C]'
                          : 'text-[#34C759]'
                    )}
                  >
                    {markup > 0 ? '+' : ''}{markup}%
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* High Markup Warning */}
          {markup !== null && markup > MARKUP_FRAUD_THRESHOLD && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3 bg-[#FF3B30]/10 rounded-xl p-3 border border-[#FF3B30]/20"
            >
              <AlertTriangle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#FF3B30]/90">
                High markup may trigger a fraud review. Listings priced significantly above face value are monitored.
              </p>
            </motion.div>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-[#C8962C] uppercase tracking-wider mb-3">Details</h3>
          </div>

          {/* Ticket Type */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">Ticket Type</label>
            <div className="flex gap-2 flex-wrap">
              {TICKET_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => updateField('ticket_type', t.value as ListingForm['ticket_type'])}
                  className={cn(
                    'h-10 px-4 rounded-full text-sm font-semibold transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
                    form.ticket_type === t.value
                      ? 'bg-[#C8962C] text-white'
                      : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/10'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">Quantity</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateField('quantity', Math.max(1, form.quantity - 1))}
                disabled={form.quantity <= 1}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
                  form.quantity <= 1
                    ? 'border-white/5 text-white/20 cursor-not-allowed'
                    : 'border-white/10 text-white active:bg-white/10'
                )}
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold text-white w-8 text-center">{form.quantity}</span>
              <button
                onClick={() => updateField('quantity', Math.min(10, form.quantity + 1))}
                disabled={form.quantity >= 10}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
                  form.quantity >= 10
                    ? 'border-white/5 text-white/20 cursor-not-allowed'
                    : 'border-white/10 text-white active:bg-white/10'
                )}
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {validationErrors.quantity && (
              <p className="text-xs text-[#FF3B30] mt-1">{validationErrors.quantity}</p>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleSubmitListing}
            disabled={submitting}
            className={cn(
              'w-full h-12 bg-[#C8962C] text-white font-semibold rounded-xl transition-all',
              'focus:outline-none focus:ring-2 focus:ring-[#C8962C] focus:ring-offset-2 focus:ring-offset-[#0D0D0D]',
              submitting
                ? 'opacity-80 cursor-wait'
                : 'active:scale-95'
            )}
            aria-label="List ticket for sale"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Listing...
              </span>
            ) : (
              'LIST TICKET'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER: BROWSE MODE
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-2xl font-bold text-[#C8962C] tracking-tight">TICKET MARKET</h1>
          <span className="text-xs font-bold text-[#C8962C] bg-[#C8962C]/15 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Resale
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events, venues..."
            className="w-full h-11 pl-10 pr-4 bg-[#1C1C1E] text-white rounded-xl border border-white/10 placeholder-[#8E8E93] text-sm focus:outline-none focus:ring-2 focus:ring-[#C8962C]"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Listings */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
        <AnimatePresence mode="wait">
          {filteredListings.length === 0 ? (
            /* Empty State */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center pt-16 px-4"
            >
              <Ticket className="w-16 h-16 text-[#8E8E93] mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No tickets listed</h2>
              <p className="text-sm text-[#8E8E93] mb-6 max-w-[280px]">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search.`
                  : 'Be the first to list a ticket for resale.'}
              </p>
              <button
                onClick={() => setViewMode('listing')}
                className="h-12 px-6 bg-[#C8962C] text-white font-semibold rounded-xl active:scale-95 transition-transform"
              >
                Sell a Ticket
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="listings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredListings.map((listing, i) => (
                <TicketCard
                  key={listing.id}
                  listing={listing}
                  index={i}
                  onChatToBuy={handleChatToBuy}
                  isOwnListing={listing.seller_id === currentUser?.id}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SELL FAB */}
      <button
        onClick={() => setViewMode('listing')}
        className={cn(
          'absolute bottom-6 right-4 w-14 h-14 rounded-full',
          'bg-[#C8962C] text-white shadow-lg shadow-[#C8962C]/30',
          'flex items-center justify-center',
          'active:scale-90 transition-transform',
          'focus:outline-none focus:ring-2 focus:ring-[#C8962C] focus:ring-offset-2 focus:ring-offset-[#0D0D0D]',
          'z-10'
        )}
        aria-label="Sell a ticket"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKET CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TicketCardProps {
  listing: TicketListing;
  index: number;
  onChatToBuy: (listing: TicketListing) => void;
  isOwnListing: boolean;
}

function TicketCard({ listing, index, onChatToBuy, isOwnListing }: TicketCardProps) {
  const markup =
    listing.original_price && listing.original_price > 0
      ? Math.round(((listing.asking_price - listing.original_price) / listing.original_price) * 100)
      : null;

  const demandConfig = DEMAND_CONFIG[listing.demand_level] || DEMAND_CONFIG.normal;

  // Get highest severity fraud signal
  const highestFraud = listing.fraud_signals?.reduce(
    (highest, signal) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const currentSev = severityOrder[signal.severity as keyof typeof severityOrder] || 0;
      const highestSev = highest ? severityOrder[highest.severity as keyof typeof severityOrder] || 0 : 0;
      return currentSev > highestSev ? signal : highest;
    },
    null as FraudSignal | null
  );
  const fraudConfig = highestFraud ? FRAUD_RISK_CONFIG[highestFraud.severity] : null;

  const isSold = listing.status === 'sold';

  let formattedDate = '';
  try {
    formattedDate = format(new Date(listing.event_date), 'EEE d MMM yyyy');
  } catch {
    formattedDate = listing.event_date;
  }

  const sellerName = listing.seller_profile?.display_name || 'Anonymous';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'bg-[#1C1C1E] rounded-2xl p-4 border border-white/10',
        isSold && 'opacity-60'
      )}
    >
      {/* Event Info */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-white leading-tight mb-1 line-clamp-2">
          {listing.event_name}
        </h3>
        <div className="flex items-center gap-3 text-sm text-[#8E8E93]">
          {listing.event_venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {listing.event_venue}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Pills Row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {/* Ticket Type */}
        <span className="text-xs font-semibold uppercase bg-white/10 text-white/80 px-2.5 py-1 rounded-full">
          {listing.ticket_type}
        </span>

        {/* Price Badge */}
        <span className="text-xs font-bold bg-[#C8962C]/15 text-[#C8962C] px-2.5 py-1 rounded-full">
          &pound;{listing.asking_price.toFixed(2)}
          {markup !== null && ` (+${markup}%)`}
        </span>

        {/* Demand */}
        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', demandConfig.className)}>
          {demandConfig.label}
        </span>

        {/* Fraud Risk */}
        {fraudConfig && (
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1', fraudConfig.className)}>
            <ShieldAlert className="w-3 h-3" />
            {fraudConfig.label}
          </span>
        )}

        {/* Quantity */}
        {listing.quantity > 1 && (
          <span className="text-xs font-semibold bg-white/5 text-[#8E8E93] px-2.5 py-1 rounded-full">
            x{listing.quantity}
          </span>
        )}

        {/* Verified */}
        {listing.is_verified && (
          <span className="text-xs font-bold bg-[#34C759]/15 text-[#34C759] px-2.5 py-1 rounded-full">
            VERIFIED
          </span>
        )}
      </div>

      {/* Seller + CTA Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8962C] to-[#C8962C]/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {listing.seller_profile?.avatar_url ? (
              <img src={listing.seller_profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">{sellerName[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          <span className="text-sm text-[#8E8E93] truncate">{sellerName}</span>
        </div>

        <button
          onClick={() => onChatToBuy(listing)}
          disabled={isSold || isOwnListing}
          className={cn(
            'h-10 px-4 rounded-xl text-sm font-semibold transition-all min-w-[120px]',
            'focus:outline-none focus:ring-2 focus:ring-[#C8962C]',
            isSold
              ? 'bg-[#1C1C1E] border border-white/10 text-[#8E8E93] opacity-50 cursor-not-allowed'
              : isOwnListing
                ? 'bg-[#1C1C1E] border border-white/10 text-[#8E8E93] cursor-not-allowed'
                : 'bg-[#C8962C] text-white active:scale-95'
          )}
          aria-label={isSold ? 'Sold out' : isOwnListing ? 'Your listing' : `Chat to buy ticket for ${listing.event_name}`}
        >
          {isSold ? 'SOLD' : isOwnListing ? 'YOUR LISTING' : 'CHAT TO BUY'}
        </button>
      </div>

      {/* Interest Indicators */}
      {(listing.view_count > 0 || listing.inquiry_count > 0) && (
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
          {listing.view_count > 0 && (
            <span className="text-xs text-[#8E8E93]">
              {listing.view_count} view{listing.view_count !== 1 ? 's' : ''}
            </span>
          )}
          {listing.inquiry_count > 0 && (
            <span className="text-xs text-[#C8962C] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {listing.inquiry_count} inquir{listing.inquiry_count !== 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
