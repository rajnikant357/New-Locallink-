import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ChatbotButton from "@/components/ChatbotButton";
import BottomNavbar from "@/components/BottomNavbar";
import { useAuth } from "./contexts/AuthContext";

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
const loadHome = () => import("./pages/Home");
const loadSearchResults = () => import("./pages/SearchResults");
const loadCategories = () => import("./pages/Categories");
const loadCategoryDetail = () => import("./pages/CategoryDetail");
const loadProviders = () => import("./pages/Providers");
const loadProviderProfile = () => import("./pages/ProviderProfile");
const loadHowItWorks = () => import("./pages/HowItWorks");
const loadAbout = () => import("./pages/About");
const loadContact = () => import("./pages/Contact");
const loadFAQs = () => import("./pages/FAQs");
const loadHelpCenter = () => import("./pages/HelpCenter");
const loadTerms = () => import("./pages/Terms");
const loadPrivacy = () => import("./pages/Privacy");
const loadRegisterProvider = () => import("./pages/RegisterProvider");
const loadPricing = () => import("./pages/Pricing");
const loadAuth = () => import("./pages/Auth");
const loadResetPassword = () => import("./pages/ResetPassword");
const loadDashboard = () => import("./pages/Dashboard");
const loadNotifications = () => import("./pages/Notifications");
const loadMessages = () => import("./pages/Messages");
const loadSettings = () => import("./pages/Settings");
const loadPaymentMethods = () => import("./pages/PaymentMethods");
const loadLearnMore = () => import("./pages/LearnMore");
const loadHurryMode = () => import("./pages/HurryModeDemo");
const loadNotFound = () => import("./pages/NotFound");
const loadChatbot = () => import("./pages/Chatbot");
const loadMyBookings = () => import("./pages/MyBookings");
const loadAdmin = () => import("./pages/Admin");

const Home = lazy(loadHome);
const SearchResults = lazy(loadSearchResults);
const Categories = lazy(loadCategories);
const CategoryDetail = lazy(loadCategoryDetail);
const Providers = lazy(loadProviders);
const ProviderProfile = lazy(loadProviderProfile);
const HowItWorks = lazy(loadHowItWorks);
const About = lazy(loadAbout);
const Contact = lazy(loadContact);
const FAQs = lazy(loadFAQs);
const HelpCenter = lazy(loadHelpCenter);
const Terms = lazy(loadTerms);
const Privacy = lazy(loadPrivacy);
const RegisterProvider = lazy(loadRegisterProvider);
const Pricing = lazy(loadPricing);
const Auth = lazy(loadAuth);
const ResetPassword = lazy(loadResetPassword);
const Dashboard = lazy(loadDashboard);
const Notifications = lazy(loadNotifications);
const Messages = lazy(loadMessages);
const Settings = lazy(loadSettings);
const PaymentMethods = lazy(loadPaymentMethods);
const LearnMore = lazy(loadLearnMore);
const HurryMode = lazy(loadHurryMode);
const NotFound = lazy(loadNotFound);
const Chatbot = lazy(loadChatbot);
const MyBookings = lazy(loadMyBookings);
const Admin = lazy(loadAdmin);

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
  const { user } = useAuth();

  useEffect(() => {
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback
      : (callback) => window.setTimeout(callback, 1);
    const cancelIdle = window.cancelIdleCallback || window.clearTimeout;
    const handle = idle(() => {
      loadHome();
      loadSearchResults();
      loadCategories();
      loadProviders();
      loadAuth();
      loadHurryMode();
      if (user) {
        loadDashboard();
        loadMessages();
        loadNotifications();
        loadSettings();
        loadMyBookings();
        if (user.type === "admin") {
          loadAdmin();
        }
      }
    });

    return () => cancelIdle(handle);
  }, [user]);

  return (
    <>
      {/* debug status removed: previously showed "App running" in top-right */}
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
          <Route path="/hurry" element={<HurryMode />} />
          <Route path="/hurry-mode-demo" element={<Navigate to="/hurry" replace />} />
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
