import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ChatbotButton from "@/components/ChatbotButton";
import BottomNavbar from "@/components/BottomNavbar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const Home = lazy(() => import("./pages/Home"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryDetail = lazy(() => import("./pages/CategoryDetail"));
const Providers = lazy(() => import("./pages/Providers"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQs = lazy(() => import("./pages/FAQs"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RegisterProvider = lazy(() => import("./pages/RegisterProvider"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const Settings = lazy(() => import("./pages/Settings"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const LearnMore = lazy(() => import("./pages/LearnMore"));
const HurryModeDemo = lazy(() => import("./pages/HurryModeDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Admin = lazy(() => import("./pages/Admin"));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}

const AppRoutes = () => {
  const location = useLocation();
  const state = location.state;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <div id="app-debug" style={{position: 'fixed', top: 8, right: 8, background: '#16a34a', color: 'white', padding: '4px 8px', zIndex: 9999, borderRadius: 4, fontSize: 12}}>
        App running
      </div>
      <ChatbotButton />

      <Suspense fallback={<PageFallback />}>
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:category" element={<CategoryDetail />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/providers/:id" element={<ProviderProfile />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/register-provider" element={<RegisterProvider />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/payment-methods" element={<PaymentMethods />} />
          <Route path="/learn-more" element={<LearnMore />} />
          <Route path="/hurry-mode-demo" element={<HurryModeDemo />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      {backgroundLocation ? (
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/messages" element={<Messages />} />
          </Routes>
        </Suspense>
      ) : null}

      <BottomNavbar />
    </>
  );
};

const App = () => {
  const base = import.meta.env.BASE_URL || "/";
  const basename = base === "/" ? "" : base.replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <div className="pb-20 [@media(min-width:900px)]:pb-0">
            <BrowserRouter basename={basename}>
              <AppRoutes />
            </BrowserRouter>
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
