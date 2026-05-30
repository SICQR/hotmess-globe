/**
 * OS Runtime Demo Page
 * 
 * Interactive demonstration of the HOTMESS OS-grade runtime.
 * Shows FSM, state transitions, URL sync, and priority layering.
 */

import React from 'react'
import { OSHUDDemo, OSSheetRenderer, OSInterruptRenderer } from '@/components/os'
import { useOS } from '@/os'

export default function OSDemo() {
  const { state } = useOS()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Globe Layer (z-index 0) */}
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 0 }}
      >
        <div className="text-center text-white/30">
          <div className="text-9xl mb-4">🌍</div>
          <p className="text-xl font-light">Globe Layer (Always Visible)</p>
          <p className="text-sm mt-2">Z-Index: 0</p>
        </div>
      </div>

      {/* HUD Layer (z-index 10) */}
      <OSHUDDemo />

      {/* Content Area */}
      <div className="relative z-[5] pt-32 px-8 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 text-white">
            <h1 className="text-5xl font-bold mb-4">
              HOTMESS OS Runtime
            </h1>
            <p className="text-xl text-white/80 mb-2">
              One surface, many states. Sheets reveal. SOS overrides.
            </p>
            <p className="text-sm text-white/60">
              Deterministic FSM • Interrupt-Safe • URL-Shareable
            </p>
          </div>

          {/* State Information */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Current State</h2>
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <div className="text-sm text-white/60">Mode</div>
                <div className="text-xl font-mono font-bold capitalize">
                  {state.mode}
                </div>
              </div>
              {state.sheet && (
                <div>
                  <div className="text-sm text-white/60">Sheet</div>
                  <div className="text-xl font-mono font-bold capitalize">
                    {state.sheet}
                  </div>
                </div>
              )}
              {state.threadId && (
                <div>
                  <div className="text-sm text-white/60">Thread</div>
                  <div className="text-xl font-mono font-bold">
                    {state.threadId}
                  </div>
                </div>
              )}
              {state.interrupt && (
                <div>
                  <div className="text-sm text-white/60">Interrupt</div>
                  <div className="text-xl font-mono font-bold capitalize text-red-400">
                    {state.interrupt}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-white/60">Transitions</div>
                <div className="text-xl font-mono font-bold">
                  {state.transitionCount || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-white/60">URL Sync</div>
                <div className="text-sm font-mono break-all">
                  {window.location.search || '(none)'}
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-3">✅ Finite State Machine</h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• 5 core modes: boot, idle, sheet, thread, interrupt</li>
                <li>• Strict transition rules enforced</li>
                <li>• Invalid transitions blocked</li>
                <li>• Mode-specific validation</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-3">✅ Priority Layering</h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• Globe: z-index 0 (always visible)</li>
                <li>• HUD: z-index 10 (controls)</li>
                <li>• Sheet: z-index 20 (overlays)</li>
                <li>• Thread: z-index 30 (conversations)</li>
                <li>• Interrupt: z-index 50 (highest)</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-3">✅ URL Deep Linking</h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• State synced to URL params</li>
                <li>• Shareable state URLs</li>
                <li>• Browser back/forward support</li>
                <li>• No page routing (SPA)</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-3">✅ Interrupt Safety</h3>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• Previous state captured</li>
                <li>• Context restored on close</li>
                <li>• SOS overrides everything</li>
                <li>• Stack-based restoration</li>
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-md rounded-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-3">🎮 Try It Out</h3>
            <ol className="space-y-2 text-sm text-white/90 list-decimal list-inside">
              <li>Click buttons in the HUD to open different sheets</li>
              <li>Notice the URL updates with ?sheet=... parameter</li>
              <li>Click "SOS" to trigger an interrupt (captures previous state)</li>
              <li>Close the interrupt to restore previous context</li>
              <li>Use browser back/forward to see URL sync in action</li>
              <li>Share the URL to deep link to current state</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Sheet Layer (z-index 20) */}
      <OSSheetRenderer />

      {/* Interrupt Layer (z-index 50) */}
      <OSInterruptRenderer />
    </div>
  )
}
