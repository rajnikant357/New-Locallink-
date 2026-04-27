import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNavbar from "@/components/BottomNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";

const STATUS_LABELS = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  requested: "bg-yellow-500",
  accepted: "bg-green-500",
  rejected: "bg-red-500",
  completed: "bg-blue-500",
  cancelled: "bg-gray-500",
};

const MyBookings = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [providersById, setProvidersById] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const [bookingsRes, providersRes] = await Promise.all([api("/bookings/me"), api("/providers")]);

        if (!mounted) return;

        setBookings(bookingsRes.bookings || []);
        const map = {};
        (providersRes.providers || []).forEach((provider) => {
          map[provider.id] = provider;
        });
        setProvidersById(map);
      } catch (err) {
        toast({
          title: "Failed to load bookings",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
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
  }, [isAuthenticated, navigate]);

  const visibleBookings = useMemo(() => {
    return [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookings]);

  const updateStatus = async (bookingId, status) => {
    try {
      setUpdatingBookingId(bookingId);
      const response = await api(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setBookings((prev) => prev.map((booking) => (booking.id === bookingId ? response.booking : booking)));

      toast({
        title: "Booking updated",
        description: `Status changed to ${STATUS_LABELS[status] || status}.`,
      });
    } catch (err) {
      toast({
        title: "Action failed",
        description: err?.message || "Could not update booking status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingBookingId("");
    }
  };

  const renderActions = (booking) => {
    const isUpdating = updatingBookingId === booking.id;
    const isCustomer = booking.customerId === user?.id;
    const isProvider = booking.providerUserId === user?.id;

    if (isCustomer && ["requested", "accepted"].includes(booking.status)) {
      return (
        <Button
          variant="outline"
          size="sm"
          disabled={isUpdating}
          onClick={() => updateStatus(booking.id, "cancelled")}
        >
          Cancel
        </Button>
      );
    }

    if (isProvider && booking.status === "requested") {
      return (
        <>
          <Button size="sm" disabled={isUpdating} onClick={() => updateStatus(booking.id, "accepted")}>
            Accept
          </Button>
          <Button variant="outline" size="sm" disabled={isUpdating} onClick={() => updateStatus(booking.id, "rejected")}>
            Reject
          </Button>
        </>
      );
    }

    if (isProvider && booking.status === "accepted") {
      return (
        <Button size="sm" disabled={isUpdating} onClick={() => updateStatus(booking.id, "completed")}>
          Mark Complete
        </Button>
      );
    }

    return null;
  };

  useRealtimeEvents((eventName, payload) => {
    if ((eventName === "booking.new" || eventName === "booking.updated") && payload?.booking) {
      const incoming = payload.booking;
      setBookings((prev) => {
        const exists = prev.some((item) => item.id === incoming.id);
        if (exists) {
          return prev.map((item) => (item.id === incoming.id ? incoming : item));
        }
        return [incoming, ...prev];
      });
    }
  }, isAuthenticated);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
            <p className="text-muted-foreground">View and manage your service bookings</p>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Card key={`loading-${idx}`}>
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : visibleBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-semibold mb-2">No bookings yet</h2>
                <p className="text-muted-foreground mb-6">Start booking services to see them here</p>
                <Button onClick={() => navigate("/categories")}>Browse Categories</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {visibleBookings.map((booking) => {
                const provider = providersById[booking.providerId];

                return (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{booking.service}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <User className="h-4 w-4" />
                            {provider?.name || "Provider"}
                          </CardDescription>
                        </div>
                        <Badge className={STATUS_COLORS[booking.status] || "bg-gray-500"}>
                          {STATUS_LABELS[booking.status] || booking.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(booking.scheduledFor).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(booking.scheduledFor).toLocaleTimeString()}</span>
                        </div>
                        {booking.notes ? (
                          <p className="text-sm text-muted-foreground">Notes: {booking.notes}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">{renderActions(booking)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BottomNavbar />
    </div>
  );
};

export default MyBookings;
