import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ChatbotButton from "@/components/ChatbotButton";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Star, Clock, MapPin, LogOut, Briefcase, DollarSign, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ProfilePicture from "@/components/dashboard/ProfilePicture";
import SocialLinksRow from "@/components/providers/SocialLinksRow";
import { api } from "@/lib/api";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";

const normalizeOptionalUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const emptySocialLinks = {
  website: "",
  instagram: "",
  facebook: "",
  linkedin: "",
};

const ProviderDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [providerProfile, setProviderProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [socialDraft, setSocialDraft] = useState(emptySocialLinks);
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [providersRes, bookingsRes] = await Promise.all([api("/providers"), api("/bookings/me")]);
        if (!mounted) return;

        const mine = (providersRes.providers || []).find((item) => item.userId === user?.id) || null;
        setProviderProfile(mine);
        setBookings(bookingsRes.bookings || []);
      } catch {
        if (!mounted) return;
        setProviderProfile(null);
        setBookings([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setSocialDraft({
      website: providerProfile?.socialLinks?.website || "",
      instagram: providerProfile?.socialLinks?.instagram || "",
      facebook: providerProfile?.socialLinks?.facebook || "",
      linkedin: providerProfile?.socialLinks?.linkedin || "",
    });
  }, [providerProfile]);

  const myBookings = useMemo(() => bookings.filter((item) => item.providerUserId === user?.id), [bookings, user?.id]);
  const completed = myBookings.filter((item) => item.status === "completed").length;
  const active = myBookings.filter((item) => ["requested", "accepted"].includes(item.status)).length;
  const earnings = completed * Number(providerProfile?.priceMin || 0);

  const handleSignOut = () => {
    signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const saveSocialLinks = async () => {
    if (!providerProfile?.id) return;

    try {
      setSavingSocialLinks(true);
      const payload = {
        socialLinks: Object.fromEntries(
          Object.entries(socialDraft)
            .map(([key, value]) => [key, normalizeOptionalUrl(value)])
            .filter(([, value]) => value),
        ),
      };

      const response = await api(`/providers/${providerProfile.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProviderProfile((prev) => ({ ...(prev || {}), ...(response.provider || {}), socialLinks: response.provider?.socialLinks || {} }));
      toast({ title: "Social links saved", description: "Your public social links were updated." });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save social links.",
        variant: "destructive",
      });
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    try {
      const response = await api(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setBookings((prev) => prev.map((item) => (item.id === bookingId ? response.booking : item)));
    } catch (err) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update booking.",
        variant: "destructive",
      });
    }
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
  });

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <ProfilePicture name={user.name} type="provider" userId={user.id} editable />
            <div className="flex-1">
              <span className="text-4xl font-bold mb-2">{user.name}</span>
              <p className="text-muted-foreground">Welcome back, {user.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge>Service Provider</Badge>
                <Badge variant="outline" className={providerProfile?.isVerified ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}>
                  {providerProfile?.isVerified ? "Verified" : "Pending Verification"}
                </Badge>
                {!providerProfile ? (
                  <Button size="sm" onClick={() => navigate("/register-provider")}>
                    Register Now
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">Total Jobs</p><p className="text-2xl font-bold">{myBookings.length}</p></div><Briefcase className="h-8 w-8 text-primary" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">Estimated Earned</p><p className="text-2xl font-bold">Rs {earnings}</p></div><DollarSign className="h-8 w-8 text-green-600" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">Active Requests</p><p className="text-2xl font-bold">{active}</p></div><Users className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground mb-1">Average Rating</p><p className="text-2xl font-bold">{providerProfile?.rating || "New"}</p></div><Star className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
          </div>

          <Tabs defaultValue="requests" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-4">
              {myBookings.filter((item) => item.status === "requested").length === 0 ? (
                <Card><CardContent className="p-6 text-muted-foreground">No pending requests right now.</CardContent></Card>
              ) : (
                myBookings
                  .filter((item) => item.status === "requested")
                  .map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{request.service}</h3>
                            <p className="text-muted-foreground">Booking ID: {request.id}</p>
                          </div>
                          <Badge variant="outline">requested</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(request.scheduledFor).toLocaleDateString()}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{new Date(request.scheduledFor).toLocaleTimeString()}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{providerProfile?.location || "Your service area"}</div>
                        </div>

                        <div className="flex gap-2">
                          {request.customerId ? (
                            <Button
                              variant="outline"
                              onClick={() =>
                                navigate("/messages", {
                                  state: { toUserId: request.customerId, backgroundLocation: location },
                                })
                              }
                            >
                              Message
                            </Button>
                          ) : null}
                          <Button onClick={() => updateStatus(request.id, "accepted")}>Accept</Button>
                          <Button variant="destructive" onClick={() => updateStatus(request.id, "rejected")}>Reject</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              {myBookings.length === 0 ? (
                <Card><CardContent className="p-6 text-muted-foreground">No bookings yet.</CardContent></Card>
              ) : (
                myBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{booking.service}</h3>
                        <Badge>{booking.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{new Date(booking.scheduledFor).toLocaleString()}</p>
                      <div className="flex gap-2">
                        {booking.customerId ? (
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigate("/messages", {
                                state: { toUserId: booking.customerId, backgroundLocation: location },
                              })
                            }
                          >
                            Message
                          </Button>
                        ) : null}
                        {booking.status === "accepted" && (
                          <Button onClick={() => updateStatus(booking.id, "completed")}>Mark Complete</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {providerProfile ? (
                    <>
                      <p><span className="font-medium">Name:</span> {providerProfile.name}</p>
                      <p><span className="font-medium">Category:</span> {providerProfile.category}</p>
                      <p><span className="font-medium">Location:</span> {providerProfile.location}</p>
                      <p><span className="font-medium">Price:</span> Rs {providerProfile.priceMin}</p>
                      <p><span className="font-medium">Skills:</span> {(providerProfile.skills || []).join(", ")}</p>
                      <Button variant="outline" onClick={() => navigate("/settings")}>Edit in Settings</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">No provider profile found yet.</p>
                      <Button onClick={() => navigate("/register-provider")}>Register Now</Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {providerProfile ? (
                <Card>
                  <CardHeader><CardTitle>Social Media Links</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add your public links so customers can connect with you and verify your work.
                    </p>
                    <SocialLinksRow socialLinks={providerProfile.socialLinks} size="lg" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="provider-website">Website</Label>
                        <Input
                          id="provider-website"
                          value={socialDraft.website}
                          onChange={(event) => setSocialDraft((prev) => ({ ...prev, website: event.target.value }))}
                          placeholder="yourwebsite.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="provider-instagram">Instagram</Label>
                        <Input
                          id="provider-instagram"
                          value={socialDraft.instagram}
                          onChange={(event) => setSocialDraft((prev) => ({ ...prev, instagram: event.target.value }))}
                          placeholder="instagram.com/yourprofile"
                        />
                      </div>
                      <div>
                        <Label htmlFor="provider-facebook">Facebook</Label>
                        <Input
                          id="provider-facebook"
                          value={socialDraft.facebook}
                          onChange={(event) => setSocialDraft((prev) => ({ ...prev, facebook: event.target.value }))}
                          placeholder="facebook.com/yourpage"
                        />
                      </div>
                      <div>
                        <Label htmlFor="provider-linkedin">LinkedIn</Label>
                        <Input
                          id="provider-linkedin"
                          value={socialDraft.linkedin}
                          onChange={(event) => setSocialDraft((prev) => ({ ...prev, linkedin: event.target.value }))}
                          placeholder="linkedin.com/in/yourprofile"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveSocialLinks} disabled={savingSocialLinks}>
                        {savingSocialLinks ? "Saving..." : "Save Social Links"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setSocialDraft(emptySocialLinks)}>
                        Clear Draft
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button onClick={handleSignOut} variant="default" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 w-auto min-w-0">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <Footer />
      <ChatbotButton />
    </div>
  );
};

export default ProviderDashboard;
