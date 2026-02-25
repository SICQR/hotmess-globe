/**
 * Vault - Unified nerve center for user's inventory, beacons, and stats
 * 
 * THE VAULT - Brutalist Bento layout showing:
 * - INVENTORY_LOG: P2P + Shopify orders
 * - ACTIVE_SIGNALS: User's beacons on the Globe
 * - Stats: rank, signals
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/components/utils/supabaseClient';
import { useUnifiedVault } from '@/hooks/useUnifiedVault';
import { 
  Package,
  Radio,
  Trophy,
  Signal,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Vault() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('[Vault] Failed to fetch user:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const { inventory, beacons, stats, counts, isLoading, error } = useUnifiedVault(currentUser);

  if (loadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <p className="text-white/60 font-mono uppercase text-sm mb-4">Access denied</p>
        <Link to="/auth">
          <Button variant="outlineGold">Sign in to access THE VAULT</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="border-b-2 border-white/20 p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <p className="text-[#FFD700] font-mono text-xs uppercase tracking-[0.3em] mb-2">
            Nerve Center
          </p>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tight">
            THE VAULT<span className="text-[#FFD700]">.</span>
          </h1>
          <p className="text-white/40 font-mono text-sm mt-2">
            @{currentUser.email?.split('@')[0] || 'user'}
          </p>
        </motion.div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
            <span className="font-mono text-sm">
              <span className="text-white/40">RANK:</span>{' '}
              <span className="text-white font-bold">{stats.rank}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Signal className="w-4 h-4 text-[#00D9FF]" />
            <span className="font-mono text-sm">
              <span className="text-white/40">SIGNALS:</span>{' '}
              <span className="text-white font-bold">{counts.activeSignals}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* INVENTORY_LOG */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="border-2 border-white/20 bg-black"
          >
            <div className="border-b border-white/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#FFD700]" />
                <h2 className="font-black uppercase tracking-wider">Inventory Log</h2>
              </div>
              <Badge variant="outline" className="border-white/30 text-white/60 font-mono text-xs">
                {counts.orders} items
              </Badge>
            </div>
            
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {inventory.length === 0 ? (
                <p className="text-white/40 font-mono text-sm text-center py-8">
                  No orders yet
                </p>
              ) : (
                inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                      <div>
                        <p className="font-mono text-sm">{item.title}</p>
                        <p className="text-white/40 text-xs uppercase">
                          {item.source === 'p2p' ? '[P2P]' : '[OFFICIAL]'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={item.status === 'completed' ? 'green' : 'outline'}
                      className="font-mono text-xs"
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <Link to={createPageUrl('OrderHistory')}>
                <Button variant="ghost" size="sm" className="w-full font-mono text-xs">
                  View Full History <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.section>

          {/* ACTIVE_SIGNALS */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="border-2 border-white/20 bg-black"
          >
            <div className="border-b border-white/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#39FF14]" />
                <h2 className="font-black uppercase tracking-wider">Active Signals</h2>
              </div>
              <Badge variant="outline" className="border-[#39FF14]/30 text-[#39FF14] font-mono text-xs">
                {counts.activeSignals} live
              </Badge>
            </div>
            
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {beacons.length === 0 ? (
                <p className="text-white/40 font-mono text-sm text-center py-8">
                  No active signals
                </p>
              ) : (
                beacons.map((beacon) => (
                  <div
                    key={beacon.id}
                    className="flex items-center justify-between p-3 border border-white/10 hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ 
                          backgroundColor: beacon.kind === 'social' ? '#39FF14' 
                            : beacon.kind === 'marketplace' ? '#FFD700' 
                            : '#00D9FF' 
                        }}
                      />
                      <div>
                        <p className="font-mono text-sm">{beacon.title}</p>
                        <p className="text-white/40 text-xs uppercase">
                          {beacon.kind} • {beacon.city || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className="font-mono text-xs border-white/20"
                    >
                      {beacon.kind}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <Link to={createPageUrl('Social')}>
                <Button variant="ghost" size="sm" className="w-full font-mono text-xs">
                  Manage Signals <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.section>
        </div>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-2 border-white/20 p-6"
        >
          <h3 className="font-black uppercase tracking-wider mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link to={createPageUrl('SellerDashboard')}>
              <Button variant="outlineGold" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Seller Dashboard
              </Button>
            </Link>
            <Link to={createPageUrl('Social')}>
              <Button variant="outlineCyan" size="sm">
                <Signal className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            </Link>
            <Link to={createPageUrl('Marketplace')}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Browse Market
              </Button>
            </Link>
          </div>
        </motion.section>

        {/* Error display */}
        {error && (
          <div className="border-2 border-red-500/50 bg-red-500/10 p-4 text-red-400 font-mono text-sm">
            Error loading vault data: {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
