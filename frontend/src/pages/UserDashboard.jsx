import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import ChatbotButton from "@/components/ChatbotButton";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, LogOut, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ProfilePicture from "@/components/dashboard/ProfilePicture";
import { api } from "@/lib/api";

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await api("/bookings/me");
        if (mounted) {
          setBookings(response.bookings || []);
        }
      } catch {
        if (mounted) {
          setBookings([]);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedBookings = useMemo(() => [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [bookings]);

  const upcomingCount = sortedBookings.filter((booking) => ["requested", "accepted"].includes(booking.status)).length;
  const completedCount = sortedBookings.filter((booking) => booking.status === "completed").length;

  const handleSignOut = () => {
    signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-4">
            <ProfilePicture name={user?.name || "User"} editable={true} />
            <div>
              <h1 className="text-3xl font-bold">{user?.name || "User Dashboard"}</h1>
              <Badge className="mt-2">Customer Account</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground mb-1">Total Bookings</p><p className="text-2xl font-bold">{sortedBookings.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground mb-1">Upcoming</p><p className="text-2xl font-bold">{upcomingCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground mb-1">Completed</p><p className="text-2xl font-bold">{completedCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground mb-1">Account Type</p><p className="text-2xl font-bold">{user?.type || "customer"}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="flex w-full gap-2 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
            <TabsTrigger className="min-w-[120px]" value="bookings">Bookings</TabsTrigger>
            <TabsTrigger className="min-w-[120px]" value="search">Search</TabsTrigger>
            <TabsTrigger className="min-w-[120px]" value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Bookings</h2>
              <Link to="/categories"><Button><Search className="h-4 w-4 mr-2" />Find Services</Button></Link>
            </div>

            {sortedBookings.length === 0 ? (
              <Card><CardContent className="p-6 text-muted-foreground">No bookings yet.</CardContent></Card>
            ) : (
              sortedBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{booking.service}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(booking.scheduledFor).toLocaleDateString()}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{new Date(booking.scheduledFor).toLocaleTimeString()}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{booking.providerId}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center">
                        <Badge>{booking.status}</Badge>
                        {booking.providerUserId ? (
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigate("/messages", {
                                state: { toUserId: booking.providerUserId, backgroundLocation: location },
                              })
                            }
                          >
                            Message
                          </Button>
                        ) : null}
                        <Link to="/my-bookings"><Button variant="outline">Manage</Button></Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Find Services</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Link to="/categories"><Button className="w-full">Browse All Categories</Button></Link>
                <Link to="/providers"><Button variant="outline" className="w-full">Browse Providers</Button></Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Account</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p><span className="font-medium">Name:</span> {user?.name}</p>
                <p><span className="font-medium">Email:</span> {user?.email}</p>
                <Link to="/settings"><Button variant="outline">Open Settings</Button></Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSignOut} variant="default" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 w-auto min-w-0">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      <>
        <Footer />
        <ChatbotButton />
      </>
    </div>
  );
};

export default UserDashboard;
