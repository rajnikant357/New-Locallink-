import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import SocialLinksRow from "@/components/providers/SocialLinksRow";

const Providers = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const locationQuery = searchParams.get("location")?.trim() || "";
  const [serviceInput, setServiceInput] = useState(query);
  const [locationInput, setLocationInput] = useState(locationQuery);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setServiceInput(query);
    setLocationInput(locationQuery);
  }, [query, locationQuery]);

  useEffect(() => {
    let mounted = true;

    const loadProviders = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (locationQuery) params.set("location", locationQuery);

        const response = await api(params.size ? `/providers?${params.toString()}` : "/providers");
        if (mounted) {
          setProviders(response.providers || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load providers");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProviders();
    return () => {
      mounted = false;
    };
  }, [query, locationQuery]);

  const handleAuthRequired = () => {
    toast({
      title: "Authentication required",
      description: "Please sign in to contact a provider.",
      variant: "destructive",
    });
    navigate("/auth");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const nextQuery = serviceInput.trim();
    const nextLocation = locationInput.trim();

    if (nextQuery) params.set("q", nextQuery);
    if (nextLocation) params.set("location", nextLocation);

    setSearchParams(params);
  };

  const hasSearchCriteria = Boolean(query || locationQuery);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-6 md:py-12 bg-background pb-24 md:pb-12">
        <div className="container mx-auto px-3 md:px-4 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">All Service Providers</h1>
            <p className="text-muted-foreground text-sm md:text-lg">
              Browse through our verified service providers or search by service, provider, skill, and location.
            </p>
          </div>

          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                <div className="flex items-center flex-1 rounded-md border px-3 bg-white">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={serviceInput}
                    onChange={(event) => setServiceInput(event.target.value)}
                    placeholder="Search by provider name, service, or skill"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="flex items-center flex-1 rounded-md border px-3 bg-white">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={locationInput}
                    onChange={(event) => setLocationInput(event.target.value)}
                    placeholder="Location"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button type="submit">Search</Button>
                <Button type="button" variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>Clear</Button>
              </form>
            </CardContent>
          </Card>

          {hasSearchCriteria && !loading && !error ? (
            <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>
                {providers.length} provider result{providers.length === 1 ? "" : "s"}
                {query ? ` for "${query}"` : ""}
                {locationQuery ? ` in ${locationQuery}` : ""}
              </p>
              <Button variant="link" className="h-auto p-0 justify-start md:justify-end" onClick={() => navigate(`/search${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)}>
                Search the whole website
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={`loading-${idx}`} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 md:p-6 space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams(searchParams))}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : providers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No providers matched your current search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {providers.map((provider) => (
                <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-3 md:mb-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-category-bg rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-base md:text-lg font-semibold text-category-icon">
                            {provider.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm md:text-base">{provider.name}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground">{provider.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-xs md:text-sm">{provider.rating || "New"}</span>
                      </div>
                    </div>

                    <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                      <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                        {provider.location}
                      </p>
                      <p className="text-xs md:text-sm font-semibold">Rs {provider.priceMin}/visit</p>
                    </div>

                    <div className="flex flex-wrap gap-1 md:gap-2 mb-3 md:mb-4">
                      {(provider.skills || []).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] md:text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <SocialLinksRow socialLinks={provider.socialLinks} className="mb-3 md:mb-4" />

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="text-xs md:text-sm h-8 md:h-9" onClick={() => navigate(`/providers/${provider.id}`)}>
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs md:text-sm h-8 md:h-9"
                        onClick={() => {
                          if (!isAuthenticated) {
                            handleAuthRequired();
                            return;
                          }
                          if (!provider.userId) {
                            toast({
                              title: "Messaging unavailable",
                              description: "This provider cannot receive direct messages yet.",
                            });
                            return;
                          }
                          navigate("/messages", {
                            state: {
                              toUserId: provider.userId,
                              toUserName: provider.name,
                              backgroundLocation: location,
                            },
                          });
                        }}
                      >
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Providers;


