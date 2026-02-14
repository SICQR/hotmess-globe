/**
 * OS Interrupt Renderer
 * 
 * Renders interrupts at the highest z-index layer (50).
 * Only visible when OS mode is "interrupt".
 */

import React from 'react'
import { useOS, Z_LAYERS, MICROCOPY } from '@/os'

export function OSInterruptRenderer() {
  const { state, closeInterrupt } = useOS()

  // Only render when in interrupt mode
  if (state.mode !== 'interrupt') {
    return null
  }

  const isSOSInterrupt = state.interrupt === 'sos'

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center"
      style={{ zIndex: Z_LAYERS.INTERRUPT }}
    >
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        {/* Interrupt Header */}
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isSOSInterrupt ? 'bg-red-500' : 'bg-yellow-500'
          }`}>
            <span className="text-3xl text-white">
              {isSOSInterrupt ? '🚨' : '⚠️'}
            </span>
          </div>
          <h2 className="text-2xl font-bold capitalize mb-2">
            {state.interrupt} Interrupt
          </h2>
          <p className="text-gray-600 text-sm italic">
            {MICROCOPY.interrupts}
          </p>
        </div>

        {/* Interrupt Content */}
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${
            isSOSInterrupt ? 'bg-red-50' : 'bg-yellow-50'
          }`}>
            <p className="text-sm text-gray-700">
              This is a system interrupt. It overrides all other states
              and will restore context when closed.
            </p>
            {state.interruptProps && Object.keys(state.interruptProps).length > 0 && (
              <div className="mt-3 p-2 bg-white rounded text-xs font-mono">
                <div className="font-semibold mb-1">Props:</div>
                <pre>{JSON.stringify(state.interruptProps, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Previous State Info */}
          {state.previous && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs">
              <div className="font-semibold mb-1">Will restore to:</div>
              <div className="font-mono text-gray-600">
                Mode: {state.previous.mode}
                {state.previous.sheet && ` → Sheet: ${state.previous.sheet}`}
                {state.previous.threadId && ` → Thread: ${state.previous.threadId}`}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 space-y-2">
            <p>✓ Rendered at z-index {Z_LAYERS.INTERRUPT} (highest)</p>
            <p>✓ Previous state captured for restoration</p>
            <p>✓ Blocks all other interactions</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={closeInterrupt}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                isSOSInterrupt
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              }`}
            >
              Restore Context
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OSInterruptRenderer
