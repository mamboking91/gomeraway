import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ListingDetailPage from "./pages/ListingDetailPage";
import MembershipPage from "./pages/MembershipPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelledPage from "./pages/PaymentCancelledPage";
import AccommodationPage from "./pages/AccommodationPage";
import VehiclesPage from "./pages/VehiclesPage";
import AboutPage from "./pages/AboutPage";
import HostDashboard from "./pages/HostDashboard";
import UserDashboard from "./pages/UserDashboard";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/listing/:id" element={<ListingDetailPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/cancelled" element={<PaymentCancelledPage />} />
            <Route path="/accommodation" element={<AccommodationPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/dashboard/host" element={<HostDashboard />} />
            <Route path="/dashboard/user" element={<UserDashboard />} />
            <Route path="/listings/create" element={<CreateListing />} />
            <Route path="/listings/edit/:id" element={<EditListing />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
