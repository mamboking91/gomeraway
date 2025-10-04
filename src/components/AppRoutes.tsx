import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useRoutePreloading } from '@/hooks/useRoutePreloading';

// Critical pages - loaded immediately
import Index from '../pages/Index';
import NotFound from '../pages/NotFound';
import ListingDetailPage from '../pages/ListingDetailPage';

// Lazy loaded components
import { 
  MembershipPage,
  PaymentSuccessPage,
  PaymentCancelledPage,
  AccommodationPage,
  VehiclesPage,
  AboutPage,
  HostDashboard,
  UserDashboard,
  CreateListing,
  EditListing,
  SubscriptionManagement,
  AdminDashboard,
  SubscriptionsManager,
  ListingsManager,
  BookingsManager,
  UsersManager,
  AnalyticsDashboard
} from './LazyComponents';

const AppRoutes: React.FC = () => {
  // Activar preloading inteligente
  useRoutePreloading();

  return (
    <Routes>
      {/* Critical pages - no lazy loading */}
      <Route path="/" element={<Index />} />
      <Route path="/listing/:id" element={<ListingDetailPage />} />
      <Route path="*" element={<NotFound />} />
      
      {/* Non-critical pages - lazy loaded */}
      <Route path="/membership" element={<MembershipPage />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/cancelled" element={<PaymentCancelledPage />} />
      <Route path="/accommodation" element={<AccommodationPage />} />
      <Route path="/vehicles" element={<VehiclesPage />} />
      <Route path="/about" element={<AboutPage />} />
      
      {/* Dashboard pages - lazy loaded */}
      <Route path="/dashboard/host" element={<HostDashboard />} />
      <Route path="/dashboard/user" element={<UserDashboard />} />
      <Route path="/subscription" element={<SubscriptionManagement />} />
      <Route path="/listings/create" element={<CreateListing />} />
      <Route path="/listings/edit/:id" element={<EditListing />} />
      
      {/* Admin Routes - lazy loaded */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/subscriptions" element={<SubscriptionsManager />} />
      <Route path="/admin/listings" element={<ListingsManager />} />
      <Route path="/admin/bookings" element={<BookingsManager />} />
      <Route path="/admin/users" element={<UsersManager />} />
      <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
    </Routes>
  );
};

export default AppRoutes;