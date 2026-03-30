/**
 * AppShell - OS Layout Structure
 * 
 * Enforces the z-layer hierarchy:
 * - Z-0: Globe (persistent backdrop)
 * - Z-10: Page content
 * - Z-20: Bottom dock
 * - Z-30: Sheets
 * - Z-40: Modals
 * - Z-50: Critical interrupts
 * 
 * NO OVERLAP BUGS. Sheets MUST NOT mount inside route tree.
 */

import { ReactNode } from 'react';
import { Z } from '@/styles/tokens';

interface AppShellProps {
  /** Globe backdrop (always mounted) */
  globe?: ReactNode;
  /** Page content (route outlet) */
  children: ReactNode;
  /** Bottom dock navigation */
  dock?: ReactNode;
  /** Sheet overlay root */
  sheets?: ReactNode;
  /** Modal overlay root */
  modals?: ReactNode;
  /** Critical interrupt overlay */
  interrupts?: ReactNode;
  /** Optional top bar */
  topBar?: ReactNode;
  /** Whether page has a top bar (affects padding) */
  hasTopBar?: boolean;
}

export function AppShell({
  globe,
  children,
  dock,
  sheets,
  modals,
  interrupts,
  topBar,
  hasTopBar = false,
}: AppShellProps) {
  return (
    <div className="hm-app-root">
      {/* Z-0: Globe backdrop (always mounted, never unmounts on route change) */}
      {globe && (
        <div 
          className="hm-globe-layer"
          style={{ zIndex: Z.globe }}
        >
          {globe}
        </div>
      )}

      {/* Optional top bar */}
      {topBar && (
        <div 
          className="fixed top-0 left-0 right-0 pt-safe"
          style={{ zIndex: Z.page + 5, height: 'var(--topbar-h)' }}
        >
          {topBar}
        </div>
      )}

      {/* Z-10: Page content layer */}
      <main 
        className={`hm-page-layer ${hasTopBar ? 'hm-page-layer--with-topbar' : ''}`}
        style={{ zIndex: Z.page }}
      >
        {children}
      </main>

      {/* Z-20: Bottom dock */}
      {dock && (
        <div 
          className="hm-dock"
          style={{ zIndex: Z.dock }}
        >
          {dock}
        </div>
      )}

      {/* Z-30: Sheet overlay root (OUTSIDE route tree) */}
      {sheets && (
        <div 
          className="hm-sheet-root"
          style={{ zIndex: Z.sheet }}
        >
          {sheets}
        </div>
      )}

      {/* Z-40: Modal overlay root */}
      {modals && (
        <div 
          className="hm-modal-root"
          style={{ zIndex: Z.modal }}
        >
          {modals}
        </div>
      )}

      {/* Z-50: Critical interrupts */}
      {interrupts && (
        <div 
          className="hm-critical-root"
          style={{ zIndex: Z.critical }}
        >
          {interrupts}
        </div>
      )}
    </div>
  );
}

export default AppShell;
