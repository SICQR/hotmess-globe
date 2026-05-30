/**
 * Business Routes
 * 
 * Routes for promoters, creators, and sellers.
 */

import React from 'react';
import { Route } from 'react-router-dom';

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
    element: <PromoterDashboard />, // Would be BeaconDetail page
    title: 'Beacon Details'
  },
  {
    path: '/creator',
    element: <CreatorDashboard />,
    title: 'Creator Studio'
  },
  {
    path: '/creator/upload',
    element: <CreatorDashboard />, // Would be ContentUpload page
    title: 'Upload Content'
  },
  {
    path: '/creator/settings',
    element: <CreatorDashboard />, // Would be CreatorSettings page
    title: 'Creator Settings'
  }
];

export default bizRoutes;
