/**
 * Code-split page components using React.lazy()
 * Reduces initial bundle size and improves load times
 */

import { lazy } from 'react';

// Heavy pages that benefit most from code splitting
export const Globe = lazy(() => import('./Globe'));
export const Marketplace = lazy(() => import('./Marketplace'));
export const Connect = lazy(() => import('./Connect'));
export const Events = lazy(() => import('./Events'));
export const Community = lazy(() => import('./Community'));
export const Messages = lazy(() => import('./Messages'));
export const BeaconDetail = lazy(() => import('./BeaconDetail'));
export const ProductDetail = lazy(() => import('./ProductDetail'));
export const Profile = lazy(() => import('./Profile'));
export const EditProfile = lazy(() => import('./EditProfile'));
export const AdminDashboard = lazy(() => import('./AdminDashboard'));
export const SellerDashboard = lazy(() => import('./SellerDashboard'));
export const OrganizerDashboard = lazy(() => import('./OrganizerDashboard'));

// Lighter pages can be eagerly loaded or lazy loaded based on usage
export const Home = lazy(() => import('./Home'));
export const Settings = lazy(() => import('./Settings'));
export const Checkout = lazy(() => import('./Checkout'));
export const OrderHistory = lazy(() => import('./OrderHistory'));