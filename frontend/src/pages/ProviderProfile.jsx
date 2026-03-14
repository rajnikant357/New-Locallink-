import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Mail, Phone, Star, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import SocialLinksRow from "@/components/providers/SocialLinksRow";

const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [canRate, setCanRate] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProvider = async () => {
      try {
        setLoading(true);
        const [providerResponse, reviewsResponse] = await Promise.all([
          api(`/providers/${id}`),
          api(`/providers/${id}/reviews`),
        ]);
        if (mounted) {
          const nextProvider = providerResponse.provider || null;
          const nextReviews = reviewsResponse.reviews || [];
          setProvider(nextProvider);
          setReviews(nextReviews);

          const myReview = nextReviews.find((item) => item.customerId === user?.id);
          if (myReview) {
            setRating(myReview.rating);
            setComment(myReview.comment || "");
          } else {
            setRating(5);
            setComment("");
          }
        }
      } catch {
        if (mounted) {
          setProvider(null);
          setReviews([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProvider();
    return () => {
      mounted = false;
    };
  }, [id, user?.id]);

  useEffect(() => {
    let mounted = true;

    const checkEligibility = async () => {
      if (!isAuthenticated || user?.type !== "customer" || !provider?.id) {
        setCanRate(false);
        return;
      }

      try {
        const response = await api("/bookings/me?status=completed");
        if (!mounted) return;
        const completedBookings = response.bookings || [];
        const eligible = completedBookings.some((booking) => booking.providerId === provider.id);
        setCanRate(eligible);
      } catch {
        if (mounted) {
          setCanRate(false);
        }
      }
    };

    checkEligibility();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, provider?.id, user?.type]);

  const handleBookNow = async () => {
    if (!provider) return;

    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to book this provider.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          providerId: provider.id,
          service: provider.category,
          scheduledFor,
          notes: `Booking request for ${provider.category}`,
        }),
      });

      toast({
        title: "Booking requested",
        description: `Booking request sent to ${provider.name}.`,
      });
      navigate("/my-bookings");
    } catch (err) {
      toast({
        title: "Booking failed",
        description: err?.message || "Could not create booking.",
        variant: "destructive",
      });
    }
  };

  const openChat = () => {
    if (!provider?.contact?.userId) {
      toast({
        title: "Messaging unavailable",
        description: "Provider account link is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send a message.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    navigate("/messages", {
      state: {
        toUserId: provider.contact.userId,
        toUserName: provider.name,
        backgroundLocation: location,
      },
    });
  };

  const submitRating = async (event) => {
    event.preventDefault();

    if (!provider?.id) return;
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }

    try {
      setSubmitting(true);
      await api(`/providers/${provider.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });

      const [providerResponse, reviewsResponse] = await Promise.all([
        api(`/providers/${provider.id}`),
        api(`/providers/${provider.id}/reviews`),
      ]);
      setProvider(providerResponse.provider || provider);
      setReviews(reviewsResponse.reviews || []);

      toast({
        title: "Rating saved",
        description: "Your rating has been submitted.",
      });
    } catch (err) {
      toast({
        title: "Rating failed",
        description: err?.message || "Could not submit rating.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-8 bg-muted/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/providers" className="text-primary hover:underline text-sm">Back to providers</Link>

          {loading ? (
            <Card className="mt-4"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ) : !provider ? (
            <Card className="mt-4"><CardContent className="p-6 text-muted-foreground">Provider not found.</CardContent></Card>
          ) : (
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-category-bg flex items-center justify-center overflow-hidden">
                      {provider.contact?.profileImageUrl ? (
                        <img src={provider.contact.profileImageUrl} alt={provider.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-category-icon">{provider.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{provider.name}</CardTitle>
                      <p className="text-muted-foreground">{provider.category}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{provider.rating || "New"}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={provider.isVerified ? "default" : "secondary"}>{provider.isVerified ? "Verified" : "Unverified"}</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground">{provider.bio || "No bio provided yet."}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {(provider.skills || []).map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Contact Details</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" />{provider.contact?.location || provider.location || "N/A"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />{provider.contact?.email || "N/A"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" />{provider.contact?.phone || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Pricing</h3>
                    <p className="text-sm text-muted-foreground">Starting from <span className="font-semibold text-foreground">Rs {provider.priceMin}/visit</span></p>
                    <p className="text-sm text-muted-foreground">Reviews: {provider.reviews || 0}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Connect</h3>
                  <SocialLinksRow socialLinks={provider.socialLinks} size="lg" />
                  {!Object.values(provider.socialLinks || {}).some(Boolean) ? (
                    <p className="text-sm text-muted-foreground">No public social links added yet.</p>
                  ) : null}
                </div>

                {user?.type === "customer" && canRate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Rate This Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={submitRating} className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={rating === value ? "default" : "outline"}
                              onClick={() => setRating(value)}
                            >
                              {value} <Star className="h-4 w-4 ml-1" />
                            </Button>
                          ))}
                        </div>
                        <Textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          placeholder="Share your experience (optional)"
                          maxLength={500}
                        />
                        <Button type="submit" disabled={submitting}>
                          {submitting ? "Submitting..." : "Submit Rating"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Customer Ratings</h3>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No ratings yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.slice(0, 10).map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{review.customer?.name || "Customer"}</p>
                              <p className="text-xs text-muted-foreground">{new Date(review.updatedAt || review.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-semibold">{review.rating}</span>
                            </div>
                            {review.comment ? <p className="text-sm text-muted-foreground">{review.comment}</p> : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={openChat}><MessageSquare className="h-4 w-4 mr-2" />Message</Button>
                  <Button variant="secondary" onClick={handleBookNow}>Book Now</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProviderProfile;


