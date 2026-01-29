/**
 * Route Helpers
 * 
 * Utilities for generating routes from config
 */

import { Route, Navigate } from 'react-router-dom';
import { ROUTE_PAGES, LEGACY_REDIRECTS, NO_LAYOUT_ROUTES } from '@/routes.config';

/**
 * Generate a route element with optional layout wrapper
 */
export function createRouteElement(path, PageComponent, LayoutWrapper, pageKey) {
  const noLayout = NO_LAYOUT_ROUTES.includes(path);
  
  if (noLayout) {
    return <PageComponent />;
  }
  
  return (
    <LayoutWrapper currentPageName={pageKey}>
      <PageComponent />
    </LayoutWrapper>
  );
}

/**
 * Generate redirect routes from LEGACY_REDIRECTS config
 */
export function generateLegacyRedirects() {
  return Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
    <Route 
      key={`redirect-${from}`} 
      path={from} 
      element={<Navigate to={to} replace />} 
    />
  ));
}

/**
 * Generate page routes from ROUTE_PAGES config
 */
export function generatePageRoutes(Pages, LayoutWrapper) {
  return Object.entries(ROUTE_PAGES).map(([path, pageKey]) => {
    const Page = Pages[pageKey];
    if (!Page) return null;
    
    return (
      <Route
        key={`page-${path}`}
        path={path}
        element={createRouteElement(path, Page, LayoutWrapper, pageKey)}
      />
    );
  }).filter(Boolean);
}

export default {
  createRouteElement,
  generateLegacyRedirects,
  generatePageRoutes,
};
