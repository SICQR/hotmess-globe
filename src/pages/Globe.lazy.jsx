import { lazy } from 'react';

// Lazy load Globe page with Three.js dependency
// This saves ~600KB from the initial bundle
export const GlobePage = lazy(() => import('./Globe.jsx'));
