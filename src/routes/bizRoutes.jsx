/**
 * Business Routes
 * 
 * Routes for promoters, creators, and sellers.
 */

import React from 'react';
import { Route, Navigate } from 'react-router-dom';

// Lazy load pages
const PromoterDashboard = React.lazy(() => import('@/pages/biz/PromoterDashboard'));
const CreateBeacon = React.lazy(() => import('@/pages/biz/CreateBeacon'));
const CreatorDashboard = React.lazy(() => import('@/pages/CreatorDashboard'));

export const bizRoutes = [
  {
    path: '/biz',
    element: <PromoterDashboard />,
    title: 'Promoter Dashboard'
  },
  {
    path: '/biz/create-beacon',
    element: <CreateBeacon />,
    title: 'Create Beacon'
  },
  {
    path: '/biz/beacon/:id',
    element: <Navigate to="/operator" replace />, // was phantom BeaconDetail stub → operator cockpit
    title: 'Beacon Details'
  },
  {
    path: '/creator',
    element: <CreatorDashboard />,
    title: 'Creator Studio'
  },
  {
    path: '/creator/upload',
    element: <Navigate to="/operator" replace />, // was phantom ContentUpload stub → operator cockpit
    title: 'Upload Content'
  },
  {
    path: '/creator/settings',
    element: <Navigate to="/operator" replace />, // was phantom CreatorSettings stub → operator cockpit
    title: 'Creator Settings'
  }
];

export default bizRoutes;
