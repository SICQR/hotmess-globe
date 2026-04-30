/**
 * MarketMode - Three-Engine Commerce Shell (/market)
 *
 * Routes between three distinct behavior engines:
 *   1. Shop (/market)          — HNH MESS + merch. Direct checkout. Amber #C8962C.
 *   2. Drops (/market/drops)   — Limited brand drops. Urgency/scarcity. Orange #CF3A10.
 *   3. Preloved (/market/preloved) — Person-to-person. Chat-first. Brown #9E7D47.
 *
 * Each engine has its own:
 *   - Visual treatment (colors, card CTAs)
 *   - Data source (Shopify, internal products, preloved_listings)
 *   - Transaction model (cart, buy-now, message seller)
 *
 * The shell provides: top bar, search, engine tabs, sell FAB.
 *
 * Brand visibility is controlled by src/config/brands.ts.
 *
 * Wireframe:
 * ┌─────────────────────────────────────────┐
 * │  MARKET              [bag(n)]  [filter] │  Fixed top bar
 * │  [Q] Search...                          │  Shared search
 * │  [Shop] [Drops] [Preloved]              │  Engine tabs
 * ├─────────────────────────────────────────┤
 * │  <ShopEngine /> | <DropsEngine /> |     │  Active engine
 * │  <PrelovedEngine />                     │
 * ├─────────────────────────────────────────┤
 * │                              [+ Sell]   │  FAB, z-40
 * └─────────────────────────────────────────┘
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Plus,
  X,
  Flame,
  MessageCircle,
  CheckCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { useShopCart } from '@/features/shop/cart/ShopCartContext';
import { useBootGuard } from '@/contexts/BootGuardContext';
import { supabase } from '@/components/utils/supabaseClient';

import { ShopEngine } from '@/modes/market/ShopEngine';
import { DropsEngine } from '@/modes/market/DropsEngine';
import { PrelovedEngine } from '@/modes/market/PrelovedEngine';
import L2OrderSheet from '@/components/sheets/L2OrderSheet';

// ---- Types ------------------------------------------------------------------

type MarketEngine = 'shop' | 'drops' | 'preloved';

const ENGINE_TABS: { key: MarketEngine; label: string; icon: React.FC<{ className?: string }>; color: string; path: string }[] = [
  { key: 'shop', label: 'Shop', icon: ShoppingBag, color: '#C8962C', path: '/market' },
  { key: 'drops', label: 'Drops', icon: Flame, color: '#CF3A10', path: '/market/drops' },
  { key: 'preloved', label: 'Preloved', icon: MessageCircle, color: '#9E7D47', path: '/market/preloved' },
];

// ---- Constants --------------------------------------------------------------

const AMBER = '#C8962C';
const ROOT_BG = '#050507';

// ---- Hooks ------------------------------------------------------------------

function useCartItemCount(): number {
  const { cart } = useShopCart();
  const lines = cart?.lines;
  let shopifyCount = 0;
  if (lines) {
    if (Array.isArray(lines)) shopifyCount = lines.length;
    else if (lines.edges && Array.isArray(lines.edges)) shopifyCount = lines.edges.length;
  }
  const [prelovedCount, setPrelovedCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return;
      supabase
        .from('cart_items')
        .select('id', { count: 'exact', head: true })
        .eq('auth_user_id', session.user.id)
        .eq('source', 'preloved')
        .then(({ count }) => {
          if (!cancelled) setPrelovedCount(count || 0);
        });
    });
    return () => { cancelled = true; };
  }, []);
  return shopifyCount + prelovedCount;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Derive the active engine from URL path */
function deriveEngine(pathname: string): MarketEngine {
  if (pathname.startsWith('/market/drops')) return 'drops';
  if (pathname.startsWith('/market/preloved')) return 'preloved';
  return 'shop';
}

// ---- Post-purchase screen ---------------------------------------------------

function PurchaseSuccessScreen({ onDismiss, listingId, orderId, openSheet }: {
  onDismiss: () => void;
  listingId: string | null;
  orderId: string | null;
  openSheet: (type: string, props: Record<string, unknown>) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: ROOT_BG }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'rgba(200,150,44,0.2)', border: '2px solid #C8962C' }}
      >
        <svg className="w-10 h-10 text-[#C8962C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <h2 className="text-white font-black text-xl mb-2">Payment Successful!</h2>
      <p className="text-white/50 text-sm mb-6">Your order is confirmed. Find it anytime in your <span className="text-white">Vault</span> or <span className="text-white">Settings → My Orders</span>.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {orderId && (
          <button
            onClick={() => { onDismiss(); openSheet('order', { orderId }); }}
            className="w-full h-12 rounded-xl font-black text-sm active:scale-95 transition-transform"
            style={{ backgroundColor: '#C8962C', color: '#000' }}
          >
            View Receipt
          </button>
        )}
        <button
          onClick={() => { onDismiss(); navigate('/more/vault'); }}
          className="w-full h-12 rounded-xl font-bold text-sm active:scale-95 transition-transform border"
          style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
        >
          Go to Orders
        </button>
        {listingId && (
          <button
            onClick={() => { onDismiss(); openSheet('chat', { recipientId: listingId }); }}
            className="w-full h-12 rounded-xl font-bold text-sm active:scale-95 transition-transform border"
            style={{ borderColor: 'rgba(200,150,44,0.3)', color: '#C8962C' }}
          >
            Contact seller
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN: MarketMode Shell
// =============================================================================

interface MarketModeProps {
  className?: string;
}

export function MarketMode({ className = '' }: MarketModeProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSheet } = useSheet();
  const { clearCart } = useShopCart();
  const { isAuthenticated } = useBootGuard();
  
  // Post-purchase flow
  const purchaseSuccess = searchParams.get('purchase') === 'success';
  const purchaseListingId = searchParams.get('listing');
  const purchaseOrderId = searchParams.get('order_id');
  
  const cartItemCount = useCartItemCount();

  // Engine routing
  const activeEngine = deriveEngine(location.pathname);

  // Search state (shared across engines)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Sync search to URL
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if (debouncedSearch) prev.set('q', debouncedSearch);
        else prev.delete('q');
        return prev;
      },
      { replace: true },
    );
  }, [debouncedSearch, setSearchParams]);

  const handleDismissPurchase = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete('purchase');
      prev.delete('listing');
      prev.delete('order_id');
      prev.delete('session_id');
      prev.delete('type');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const handleEngineSwitch = useCallback((engine: MarketEngine) => {
    const tab = ENGINE_TABS.find(t => t.key === engine);
    if (tab) navigate(tab.path, { replace: true });
  }, [navigate]);

  // Active engine color
  const activeColor = ENGINE_TABS.find(t => t.key === activeEngine)?.color ?? AMBER;

  // ---- Auto-open receipt on success & Sync Status ----
  useEffect(() => {
    if (purchaseSuccess && purchaseOrderId) {
      // 1. Force the status to 'paid' (Fixes 'Awaiting Payment' in local testing)
      const syncPayment = async () => {
        console.log('[MarketMode] Syncing status to paid for order:', purchaseOrderId);
        
        // 1. Update legacy/global orders table
        const { error: err1 } = await supabase
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', purchaseOrderId);
        
        if (err1) console.error('[Orders] Sync Error (orders table):', err1);
        else console.log('[Orders] Successfully updated orders table');

        // 2. Update peer-to-peer product_orders table
        const { error: err2 } = await supabase
          .from('product_orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', purchaseOrderId);
        
        if (err2) console.warn('[Orders] Sync Warning (product_orders table):', err2.message);
        else console.log('[Orders] Successfully updated product_orders table');
      };
      
      syncPayment();
      
      // 2. Open the receipt directly (But user wants a success screen first now, 
      // see next step for UI change)
    }
  }, [purchaseSuccess, purchaseOrderId, openSheet]);

  // ---- Render ---------------------------------------------------------------

  // ---- Post-Purchase State Machine ----
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // Sync Status and Fetch Total
  useEffect(() => {
    if (purchaseSuccess && purchaseOrderId) {
      const initSuccess = async () => {
        setIsSyncing(true);
        try {
          // 1. Force the status to 'paid' and get the total
          const { data, error } = await supabase
            .from('orders')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', purchaseOrderId)
            .select('total_gbp, status')
            .single();
          
          if (data) {
            setOrderTotal(data.total_gbp);
            // 2. Clear the Cart immediately (Context + LocalStorage Failsafe)
            clearCart();
            try { localStorage.removeItem('shopify_cart_id_v1'); } catch(e) {}
            
            setIsSyncing(false);
          } else {
            // Fallback: If update didn't return data, just fetch it
            const { data: fetchResult } = await supabase
              .from('orders')
              .select('total_gbp')
              .eq('id', purchaseOrderId)
              .single();
            if (fetchResult) setOrderTotal(fetchResult.total_gbp);
            setIsSyncing(false);
          }
        } catch (err) {
          console.error('[Purchase] Sync Error:', err);
          setIsSyncing(false);
        }
      };
      initSuccess();
    } else {
      setShowReceipt(false);
      setOrderTotal(null);
      setIsSyncing(true);
    }
  }, [purchaseSuccess, purchaseOrderId]);

  // VIP TWO-STAGE SUCCESS FLOW (Full Screen Interstitial)
  if (purchaseSuccess && purchaseOrderId) {
    
    // STAGE 2: Full-Screen Receipt
    if (showReceipt) {
      return (
        <div className="fixed inset-0 z-[200] bg-[#050507] flex flex-col">
            <div className="h-14 px-6 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-[#0D0D0D]">
              <div className="flex items-center gap-2">
                 <CheckCircle className="w-4 h-4 text-green-500" />
                 <h2 className="text-white font-black text-xs uppercase tracking-widest">Order Details</h2>
              </div>
              <button 
                onClick={handleDismissPurchase}
                className="text-[#C8962C] font-black text-xs uppercase"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#050507]">
              <L2OrderSheet key={purchaseOrderId} orderId={purchaseOrderId} />
            </div>
            <div className="p-6 bg-[#0D0D0D] border-t border-white/5 flex-shrink-0">
               <button 
                 onClick={handleDismissPurchase}
                 className="w-full h-14 bg-[#C8962C] text-black font-black text-sm uppercase rounded-2xl active:scale-95 transition-transform"
               >
                 Go Back to Market
               </button>
            </div>
        </div>
      );
    }

    // STAGE 1: The Celebration (Full Screen Hide Background)
    return (
      <div className="fixed inset-0 z-[200] bg-[#050507] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(34,197,94,0.15)]"
          >
            {isSyncing ? (
              <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
            ) : (
              <CheckCircle className="w-12 h-12 text-green-500" />
            )}
          </motion.div>
          
          <h2 className="text-white font-black text-3xl mb-2 tracking-tight">
            {isSyncing ? 'Processing Payment...' : 'Payment Successful!'}
          </h2>
          <p className="text-white/40 text-sm mb-2 uppercase font-black tracking-widest">You Paid</p>
          <p className="text-[#C8962C] font-black text-5xl mb-12">
            £{(orderTotal || 0).toFixed(2)}
          </p>
          
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button 
              onClick={() => setShowReceipt(true)}
              disabled={isSyncing}
              className="w-full h-16 bg-[#C8962C] text-black font-black text-base uppercase rounded-2xl active:scale-95 transition-transform shadow-[0_8px_32px_rgba(200,150,44,0.3)] disabled:opacity-50 disabled:grayscale"
            >
              {isSyncing ? 'Syncing...' : 'View My Receipt'}
            </button>
            <button 
              onClick={handleDismissPurchase}
              className="w-full h-14 text-white/40 font-bold text-sm uppercase rounded-2xl active:scale-95 transition-transform"
            >
              Back to Market
            </button>
          </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full flex flex-col pt-[calc(88px+env(safe-area-inset-top))] ${className}`}
      style={{ backgroundColor: ROOT_BG }}
    >

      {/* ================================================================== */}
      {/* FIXED TOP BAR                                                       */}
      {/* ================================================================== */}
      <div className="flex-shrink-0 z-40 border-b border-white/10" style={{ backgroundColor: '#0D0D0D' }}>
        {/* Title row */}
        <div className="h-14 px-4 flex items-center justify-between">
          <h1
            className="text-xl font-extrabold tracking-wider uppercase"
            style={{ color: activeColor }}
          >
            Market
          </h1>

          <div className="flex items-center gap-2">
            {/* Cart — visible on all engines */}
            <button
              onClick={() => openSheet('cart', {})}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] active:scale-90 transition-transform"
              aria-label={`Shopping bag${cartItemCount > 0 ? `, ${cartItemCount} items` : ''}`}
            >
              <ShoppingBag className="w-5 h-5 text-white/70" />
              {cartItemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-black px-1"
                  style={{ backgroundColor: AMBER }}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Filter */}
            <button
              onClick={() => openSheet('filters', { mode: 'market' })}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] active:scale-90 transition-transform"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                activeEngine === 'shop' ? 'Search merch, HNH MESS...'
                : activeEngine === 'drops' ? 'Search drops...'
                : 'Search preloved listings...'
              }
              className="w-full h-10 pl-10 pr-10 bg-white/[0.06] rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 border-0"
              style={{ fontSize: '16px', ['--tw-ring-color' as string]: activeColor }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="w-3 h-3 text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* Engine tabs */}
        <div className="px-4 pb-2 flex items-center gap-2">
          {ENGINE_TABS.map((tab) => {
            const isActive = activeEngine === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleEngineSwitch(tab.key)}
                className={`h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 ${
                  isActive ? 'text-black' : 'text-[#8E8E93] border border-white/10'
                }`}
                style={
                  isActive
                    ? { backgroundColor: tab.color }
                    : { backgroundColor: '#1C1C1E' }
                }
                aria-pressed={isActive}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* Engine context line */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-white/25">
            {activeEngine === 'shop' && 'Official merch + HNH MESS. Direct checkout.'}
            {activeEngine === 'drops' && 'Limited runs from HOTMESS brands. Gone when gone.'}
            {activeEngine === 'preloved' && 'Community marketplace. Chat first, deal in person.'}
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ENGINE CONTENT                                                       */}
      {/* ================================================================== */}
      <AnimatePresence mode="wait">
        {activeEngine === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <ShopEngine search={debouncedSearch} />
          </motion.div>
        )}
        {activeEngine === 'drops' && (
          <motion.div
            key="drops"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <DropsEngine search={debouncedSearch} />
          </motion.div>
        )}
        {activeEngine === 'preloved' && (
          <motion.div
            key="preloved"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <PrelovedEngine search={debouncedSearch} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* SELL FAB — preloved only (drops are brand-owned, not user-sell)   */}
      {/* ================================================================== */}
      {isAuthenticated && activeEngine === 'preloved' && (
        <button
          onClick={() => openSheet('sell', {})}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          style={{
            backgroundColor: '#9E7D47',
            boxShadow: '0 8px 24px rgba(158,125,71,0.35)',
          }}
          aria-label="Sell an item"
        >
          <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export default MarketMode;
