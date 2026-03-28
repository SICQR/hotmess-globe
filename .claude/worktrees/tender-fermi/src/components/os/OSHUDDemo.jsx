/**
 * OS HUD Example
 * 
 * Demonstration component showing how to use the OS runtime hooks.
 * This is a simplified HUD that shows OS state and provides controls.
 */

import React from 'react'
import { useOS, useOSSheet, MICROCOPY } from '@/os'

export function OSHUDDemo() {
  const { state, openSheet, openInterrupt, goIdle } = useOS()
  const { isOpen: isSheetOpen, close: closeSheet } = useOSSheet()

  return (
    <div 
      className="fixed top-4 left-4 right-4 z-[10] bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg"
      style={{ zIndex: 10 }} // HUD layer
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-mono">
          <div className="text-green-400">OS Runtime Active</div>
          <div className="text-gray-400">Mode: {state.mode}</div>
          {state.sheet && <div className="text-yellow-400">Sheet: {state.sheet}</div>}
          {state.threadId && <div className="text-blue-400">Thread: {state.threadId}</div>}
          {state.interrupt && <div className="text-red-400">Interrupt: {state.interrupt}</div>}
        </div>
        
        <div className="text-xs text-gray-400">
          {MICROCOPY.globe}
        </div>
      </div>

      {/* HUD Controls */}
      <div className="flex gap-2 flex-wrap">
        {/* Main navigation */}
        <button
          onClick={() => openSheet('grid')}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
        >
          {MICROCOPY.hudLabels.grid}
        </button>
        <button
          onClick={() => openSheet('pulse')}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
        >
          {MICROCOPY.hudLabels.pulse}
        </button>
        <button
          onClick={() => openSheet('market')}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
        >
          {MICROCOPY.hudLabels.market}
        </button>
        {/* SOS Interrupt */}
        <button
          onClick={() => openInterrupt('sos')}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-bold transition-colors ml-auto"
        >
          {MICROCOPY.hudLabels.sos}
        </button>

        {/* Close/Reset */}
        {isSheetOpen && (
          <button
            onClick={closeSheet}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            Close Sheet
          </button>
        )}
        {state.mode !== 'idle' && (
          <button
            onClick={goIdle}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
          >
            Go Idle
          </button>
        )}
      </div>
    </div>
  )
}

export default OSHUDDemo
