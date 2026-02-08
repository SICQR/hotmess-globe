/**
 * HotMess OS Integration Example
 * 
 * Demonstrates the complete integration of:
 * 1. Telegram Auth Handshake
 * 2. Real-time Globe Listener
 * 3. Radio BPM Sync
 * 4. Presence Tracking
 * 5. Unified Vault
 * 
 * This component shows how all the HotMess OS pieces work together
 * to create a living, reactive system.
 */

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TelegramAuth } from '@/components/auth/TelegramAuthEnhanced';
import { useGlobeData } from '@/hooks/useGlobeData';
import { useGlobeBPMSync } from '@/hooks/useGlobeBPMSync';
import { usePresence } from '@/hooks/usePresence';
import { useVault } from '@/contexts/VaultContext';
import { Activity, Radio, Package, Users } from 'lucide-react';

export default function HotMessOSIntegration() {
  const globeRef = useRef(null);
  const [pulses, setPulses] = useState([]);

  // 1. Real-time Globe Data
  const handleNewBeacon = useCallback((beacon) => {
    console.log('[OS] New beacon detected:', beacon);
    
    // Add pulse effect to Globe
    if (globeRef.current?.emitPulse) {
      globeRef.current.emitPulse({
        lat: beacon.lat,
        lng: beacon.lng,
        color: beacon.mode === 'social' ? '#FF1493' : '#00FFFF',
        intensity: beacon.intensity || 1,
      });
    }

    // Track pulse for UI
    setPulses((prev) => [
      { id: beacon.id, time: Date.now(), title: beacon.title },
      ...prev.slice(0, 9), // Keep last 10
    ]);
  }, []);

  const beacons = useGlobeData(handleNewBeacon);

  // 2. Radio BPM Sync
  const {
    currentBPM,
    isAudioReactive,
    currentShow,
    toggleAudioReactive,
  } = useGlobeBPMSync(globeRef);

  // 3. Presence Tracking
  const { onlineUsers, myPresence, updateStatus } = usePresence({
    enableLocationSharing: true,
  });

  // 4. Unified Vault
  const { vaultItems, isLoading: vaultLoading, getTotalCount } = useVault();

  // 5. Telegram Auth
  const handleTelegramSuccess = useCallback((result) => {
    console.log('[OS] Telegram auth success:', result);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-black uppercase tracking-wider">
            <span className="text-[#FF1493]">HotMess OS</span> Integration
          </h1>
          <p className="text-white/60 text-sm">
            Living, Reactive System · Identity · Commerce · Radio · Social
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Beacons */}
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Live Beacons"
            value={beacons.length}
            color="#FF1493"
          />

          {/* Radio BPM */}
          <StatCard
            icon={<Radio className="w-5 h-5" />}
            label="Radio BPM"
            value={currentBPM}
            color="#00FFFF"
            subtitle={currentShow?.title || 'Live'}
          />

          {/* Online Users */}
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Online"
            value={onlineUsers.length}
            color="#00FF00"
          />

          {/* Vault Items */}
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Vault"
            value={vaultLoading ? '...' : getTotalCount()}
            color="#FFD700"
          />
        </div>

        {/* Integration Panels */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Telegram Auth */}
          <IntegrationPanel title="1. Telegram Auth Handshake">
            <TelegramAuth
              onSuccess={handleTelegramSuccess}
              onError={(err) => console.error('[OS] Auth error:', err)}
            />
            <p className="text-xs text-white/40 mt-4">
              Custom HMAC verification · Auto beacon drop · Profile creation
            </p>
          </IntegrationPanel>

          {/* Real-time Pulses */}
          <IntegrationPanel title="2. Real-time Globe Listener">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pulses.length === 0 ? (
                <p className="text-white/40 text-sm">Waiting for new beacons...</p>
              ) : (
                pulses.map((pulse) => (
                  <motion.div
                    key={pulse.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-2 bg-white/5 rounded"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#FF1493] animate-pulse" />
                    <span className="text-xs">{pulse.title}</span>
                  </motion.div>
                ))
              )}
            </div>
            <p className="text-xs text-white/40 mt-4">
              Postgres Changes · Visual pulses · Activity tracking
            </p>
          </IntegrationPanel>

          {/* Radio Sync */}
          <IntegrationPanel title="3. Radio BPM Sync">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Audio Reactive</span>
                <button
                  onClick={toggleAudioReactive}
                  className={`px-4 py-2 rounded ${
                    isAudioReactive ? 'bg-[#00FFFF] text-black' : 'bg-white/10'
                  }`}
                >
                  {isAudioReactive ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-white/40">Current Show</div>
                <div className="text-sm">{currentShow?.title || 'Live Stream'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-white/40">BPM</div>
                <div className="text-2xl font-bold">{currentBPM}</div>
              </div>
            </div>
            <p className="text-xs text-white/40 mt-4">
              Shader uniforms · Globe pulse speed · Music sync
            </p>
          </IntegrationPanel>

          {/* Presence */}
          <IntegrationPanel title="4. Supabase Presence">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm">
                  {myPresence ? 'You are live' : 'Connecting...'}
                </span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {onlineUsers.slice(0, 5).map((user, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span>{user.full_name || user.email}</span>
                  </div>
                ))}
              </div>
              {onlineUsers.length > 5 && (
                <p className="text-xs text-white/40">
                  +{onlineUsers.length - 5} more online
                </p>
              )}
            </div>
            <p className="text-xs text-white/40 mt-4">
              Live user tracking · Location sharing · Status updates
            </p>
          </IntegrationPanel>
        </div>

        {/* Vault Preview */}
        <IntegrationPanel title="5. The Vault - Unified Inventory">
          {vaultLoading ? (
            <p className="text-white/40 text-sm">Loading inventory...</p>
          ) : vaultItems.length === 0 ? (
            <p className="text-white/40 text-sm">No items in vault yet</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {vaultItems.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white/5 rounded border border-white/10 space-y-2"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-24 object-cover rounded"
                    />
                  )}
                  <div className="text-xs font-medium truncate">{item.name}</div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{item.source === 'shopify' ? '🏪 Official' : '👤 P2P'}</span>
                    <span>×{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-white/40 mt-4">
            Shopify orders · P2P transactions · Unified inventory API
          </p>
        </IntegrationPanel>

        {/* Integration Architecture */}
        <IntegrationPanel title="🚀 Architecture Overview">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-[#FF1493]">→</span>
              <div>
                <strong>Identity:</strong> Telegram Login → profiles entry → Personal Orb on Globe
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00FFFF]">→</span>
              <div>
                <strong>Commerce:</strong> Shopify + P2P merged in Vault → Market.jsx
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00FF00]">→</span>
              <div>
                <strong>Radio:</strong> PersistentPlayer emits BPM → Globe syncs shaders
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#FFD700]">→</span>
              <div>
                <strong>Social:</strong> "Ghosted" status → beacons table → Live on all Globes
              </div>
            </div>
          </div>
        </IntegrationPanel>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2"
    >
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs uppercase tracking-wider text-white/60">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
      {subtitle && <div className="text-xs text-white/40">{subtitle}</div>}
    </motion.div>
  );
}

function IntegrationPanel({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white/5 rounded-lg border border-white/10 space-y-4"
    >
      <h3 className="text-sm font-black uppercase tracking-wider text-white/80">
        {title}
      </h3>
      <div>{children}</div>
    </motion.div>
  );
}
