import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Bell, User, Settings, Home, LogOut, Menu, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NavbarUserAvatar from "./NavbarUserAvatar";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import InstantModeToggle from "./InstantModeToggle";
import HurryModeDemo from "@/pages/HurryModeDemo";
import { api } from "@/lib/api";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";

const Navbar = () => {
  const { isAuthenticated, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [instantMode, setInstantMode] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleSignOut = () => {
    signOut();
    setUnreadNotifications(0);
    setUnreadMessages(0);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  useEffect(() => {
    let mounted = true;

    const loadUnread = async () => {
      if (!isAuthenticated) {
        setUnreadNotifications(0);
        setUnreadMessages(0);
        return;
      }

      try {
        const [notificationResponse, messageNotificationResponse] = await Promise.all([
          api("/notifications/me?unreadOnly=true"),
          api("/notifications/me?unreadOnly=true&includeMessage=true"),
        ]);
        if (!mounted) return;

        const notifications = notificationResponse.notifications || [];
        const allUnreadNotifications = messageNotificationResponse.notifications || [];
        setUnreadNotifications(notifications.length);
        setUnreadMessages(allUnreadNotifications.filter((item) => item.type === "message").length);
      } catch {
        if (!mounted) return;
        setUnreadNotifications(0);
        setUnreadMessages(0);
      }
    };

    loadUnread();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id]);

  useRealtimeEvents((eventName, payload) => {
    if (!isAuthenticated) return;

    if (eventName === "notification.new") {
      const notificationType = payload?.notification?.type || payload?.type;
      if (notificationType === "message") {
        setUnreadMessages((count) => count + 1);
      } else {
        setUnreadNotifications((count) => count + 1);
      }
    } else if (eventName === "notification.updated") {
      if (payload?.notification?.type === "message") {
        setUnreadMessages((count) => Math.max(0, count - 1));
      } else {
        setUnreadNotifications((count) => Math.max(0, count - 1));
      }
    } else if (eventName === "notification.bulkUpdated") {
      setUnreadNotifications(0);
    }

    if (eventName === "message.new" && payload?.message?.fromUserId !== user?.id) {
      toast({
        title: "New message",
        description: payload?.message?.text?.slice(0, 60) || "You received a new message.",
      });
    } else if (eventName === "booking.new") {
      toast({
        title: "New booking request",
        description: payload?.booking?.service
          ? `${payload.booking.service} booking received.`
          : "A new booking has arrived.",
      });
    } else if (eventName === "booking.updated" && payload?.booking?.status) {
      toast({
        title: "Booking status updated",
        description: `Booking changed to ${payload.booking.status}.`,
      });
    }
  });

  return (
    <>
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container px-0 mx-auto">
          <div className="flex h-10 items-center justify-between w-full [@media(min-width:900px)]:h-16">
            <div className="flex items-center gap-3">
              {/* Back arrow in circle, hidden on home page */}
              {location.pathname !== "/" && (
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 ml-[5px] mr-[5px] [@media(min-width:900px)]:hidden"
                  aria-label="Go Back"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <Link to="/" className={`flex items-center text-2xl font-bold ${location.pathname === '/' ? 'pl-[20px]' : ''}`}>
                <span style={{ color: '#184bb8ff' }}>Local</span><span style={{ color: '#b379ffff' }}>Link</span>
              </Link>
            </div>

            {/* Desktop Links - hidden above 900px, mobile-first */}
            <div className="hidden [@media(min-width:900px)]:flex items-center gap-8">
              <Link to="/" className="text-foreground hover:text-primary transition-colors">Home</Link>
              <Link to="/categories" className="text-foreground hover:text-primary transition-colors">Categories</Link>
              <Link to="/providers" className="text-foreground hover:text-primary transition-colors">Providers</Link>
              <Link to="/how-it-works" className="text-foreground hover:text-primary transition-colors">How It Works</Link>
              <Link to="/about" className="text-foreground hover:text-primary transition-colors">About</Link>
              <Link to="/hurry-mode-demo" className="text-foreground hover:text-primary transition-colors">Hurry Mode</Link>
              {user?.type === "admin" && (
                <Link to="/admin" className="text-foreground hover:text-primary transition-colors">Admin</Link>
              )}
            </div>

            <div className="flex items-center gap-2 pr-[20px]">
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              {isAuthenticated ? (
                <>
                  {user?.type === "provider" && (
                    <InstantModeToggle onToggle={setInstantMode} />
                  )}
                  <Link to="/notifications">
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
                          {unreadNotifications > 99 ? "99+" : unreadNotifications}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/messages" state={{ backgroundLocation: location }}>
                    <Button variant="ghost" size="icon" aria-label="Messages" className="relative">
                      <MessageSquare className="h-5 w-5" />
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] leading-4 text-center">
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </span>
                      )}
                    </Button>
                  </Link>
                  {isAuthenticated && (
                    <Link to="/dashboard" className="flex items-center">
                      <NavbarUserAvatar name={user?.name || "U"} type={user?.type || "customer"} userId={user?.id} />
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth">
                  <Button className="h-7 w-14 px-5 text-xs font-medium">Sign In</Button>
                </Link>
              )}
              {/* Hamburger menu for tablet view (768px - 900px) */}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
