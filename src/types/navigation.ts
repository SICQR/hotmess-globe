/**
 * Navigation Types
 * 
 * Standardized types for navigation throughout the HOTMESS OS.
 * All components should use these types for consistency.
 */

/**
 * Standard navigation function signature
 * Used by all components that accept navigation callbacks
 * 
 * @param route - The route/sheet to navigate to (e.g., 'vault', 'social', 'events')
 * @param params - Optional parameters to pass to the destination
 */
export type NavigationFunction = (route: string, params?: Record<string, unknown>) => void;

/**
 * Navigation props for components that need navigation
 */
export interface NavigationProps {
  onNavigate?: NavigationFunction;
}

/**
 * Sheet navigation function - specifically for opening sheets
 */
export type SheetNavigationFunction = (sheetType: string, props?: Record<string, unknown>) => void;

export default NavigationFunction;
