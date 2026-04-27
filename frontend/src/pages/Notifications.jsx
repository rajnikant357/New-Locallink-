import { useCallback } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Calendar, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";

const typeIconMap = {
  booking: Calendar,
  message: MessageSquare,
  success: CheckCircle,
  reminder: AlertCircle,
};

const getIconColor = (type) => {
  switch (type) {
    case "booking":
      return "text-primary";
    case "message":
      return "text-blue-500";
    case "success":
      return "text-green-500";
    case "reminder":
      return "text-orange-500";
    default:
      return "text-muted-foreground";
  }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!isAuthenticated && !authLoading) return;
      try {
        setLoading(true);
        const response = await api("/notifications/me");
        if (mounted) {
          setNotifications(response.notifications || []);
        }
      } catch (err) {
        if (mounted) {
          toast({
            title: "Failed to load notifications",
            description: err?.message || "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, authLoading]);

  const handleRealtime = useCallback((eventName, payload) => {
    if (eventName === "notification.new") {
      setNotifications((prev) => [payload.notification, ...prev]);
      return;
    }

    if (eventName === "notification.updated" && payload?.notification) {
      setNotifications((prev) => prev.map((item) => (item.id === payload.notification.id ? payload.notification : item)));
      return;
    }

    if (eventName === "notification.bulkUpdated") {
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      return;
    }
  }, []);

  useRealtimeEvents(handleRealtime, isAuthenticated);

  const markAsRead = async (id) => {
    try {
      const response = await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((item) => (item.id === id ? response.notification : item)));
    } catch (err) {
      toast({
        title: "Action failed",
        description: err?.message || "Could not mark notification as read.",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      toast({
        title: "Action failed",
        description: err?.message || "Could not mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">Notifications</h1>
                <p className="text-muted-foreground">Stay updated with your bookings and messages</p>
              </div>
              <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0 || loading}>
                Mark all as read
              </Button>
            </div>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : notifications.map((notification) => {
                const Icon = typeIconMap[notification.type] || Bell;

                return (
                  <Card
                    key={notification.id}
                    className={!notification.isRead ? "border-primary/50 bg-primary/5" : ""}
                  >
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 flex-shrink-0 bg-muted rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}>
                          <Icon className="h-6 w-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.isRead ? (
                              <Badge variant="default" className="flex-shrink-0">New</Badge>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                            {!notification.isRead ? (
                              <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                                Mark as read
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {!loading && notifications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};


export default Notifications;

