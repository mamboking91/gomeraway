import { lazy } from 'react';

// Non-critical pages - lazy loaded
export const MembershipPage = lazy(() => import('../pages/MembershipPage'));
export const PaymentSuccessPage = lazy(() => import('../pages/PaymentSuccessPage'));
export const PaymentCancelledPage = lazy(() => import('../pages/PaymentCancelledPage'));
export const AccommodationPage = lazy(() => import('../pages/AccommodationPage'));
export const VehiclesPage = lazy(() => import('../pages/VehiclesPage'));
export const AboutPage = lazy(() => import('../pages/AboutPage'));

// Dashboard pages - lazy loaded (heavy components)
export const HostDashboard = lazy(() => import('../pages/HostDashboard'));
export const UserDashboard = lazy(() => import('../pages/UserDashboard'));
export const CreateListing = lazy(() => import('../pages/CreateListing'));
export const EditListing = lazy(() => import('../pages/EditListing'));
export const SubscriptionManagement = lazy(() => import('../pages/SubscriptionManagement'));

// Admin pages - lazy loaded (heaviest components)
export const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
export const SubscriptionsManager = lazy(() => import('../pages/admin/SubscriptionsManager'));
export const ListingsManager = lazy(() => import('../pages/admin/ListingsManager'));
export const BookingsManager = lazy(() => import('../pages/admin/BookingsManager'));
export const UsersManager = lazy(() => import('../pages/admin/UsersManager'));
export const AnalyticsDashboard = lazy(() => import('../pages/admin/AnalyticsDashboard'));