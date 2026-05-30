/**
 * OS Sheet Renderer
 * 
 * Renders sheets at the correct z-index layer (20).
 * Only visible when OS mode is "sheet".
 */

import React from 'react'
import { useOS, Z_LAYERS, MICROCOPY } from '@/os'

export function OSSheetRenderer() {
  const { state, closeSheet } = useOS()

  // Only render when in sheet mode
  if (state.mode !== 'sheet') {
    return null
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      style={{ zIndex: Z_LAYERS.SHEET }}
      onClick={closeSheet}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold capitalize">
            {state.sheet}
          </h2>
          <button
            onClick={closeSheet}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors"
          >
            Close
          </button>
        </div>

        {/* Sheet Content */}
        <div className="space-y-4">
          <p className="text-gray-600 italic">{MICROCOPY.sheets}</p>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Sheet: {state.sheet}</h3>
            <p className="text-sm text-gray-700">
              This is a demo sheet overlay. In production, this would render
              the actual content for the {state.sheet} sheet type.
            </p>
            {state.sheetProps && Object.keys(state.sheetProps).length > 0 && (
              <div className="mt-3 p-2 bg-white rounded text-xs font-mono">
                <div className="font-semibold mb-1">Props:</div>
                <pre>{JSON.stringify(state.sheetProps, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500 space-y-2">
            <p>✓ Rendered at z-index {Z_LAYERS.SHEET}</p>
            <p>✓ Globe remains visible underneath (z-index {Z_LAYERS.GLOBE})</p>
            <p>✓ HUD stays above sheet (z-index {Z_LAYERS.HUD})</p>
            <p>✓ URL synced: ?sheet={state.sheet}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OSSheetRenderer
