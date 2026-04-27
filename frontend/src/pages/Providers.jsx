import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
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
  const [categories, setCategories] = useState([]);
  const categoryParam = searchParams.get("category")?.trim() || "";
  const ratingParam = searchParams.get("ratingMin")?.trim() || "";
  const billingParam = searchParams.get("billingType")?.trim() || "";
  const priceMinParam = searchParams.get("priceMin")?.trim() || "";
  const priceMaxParam = searchParams.get("priceMax")?.trim() || "";
  const verifiedParam = searchParams.get("verifiedOnly") === "true";

  const [categoryFilter, setCategoryFilter] = useState(categoryParam);
  const [ratingFilter, setRatingFilter] = useState(ratingParam);
  const [billingFilter, setBillingFilter] = useState(billingParam);
  const [priceMinFilter, setPriceMinFilter] = useState(priceMinParam);
  const [priceMaxFilter, setPriceMaxFilter] = useState(priceMaxParam);
  const [verifiedOnly, setVerifiedOnly] = useState(verifiedParam);

  useEffect(() => {
    setServiceInput(query);
    setLocationInput(locationQuery);
    setCategoryFilter(categoryParam);
    setRatingFilter(ratingParam);
    setBillingFilter(billingParam);
    setPriceMinFilter(priceMinParam);
    setPriceMaxFilter(priceMaxParam);
    setVerifiedOnly(verifiedParam);
  }, [query, locationQuery, categoryParam, ratingParam, billingParam, priceMinParam, priceMaxParam, verifiedParam]);

  useEffect(() => {
    let mounted = true;

    const loadProviders = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (locationQuery) params.set("location", locationQuery);
        if (categoryParam) params.set("category", categoryParam);
        if (ratingParam) params.set("ratingMin", ratingParam);
        if (priceMinParam) params.set("priceMin", priceMinParam);
        if (priceMaxParam) params.set("priceMax", priceMaxParam);
        if (billingParam) params.set("billingType", billingParam);
        if (verifiedParam) params.set("verifiedOnly", "true");

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
  }, [query, locationQuery, categoryParam, ratingParam, billingParam, priceMinParam, priceMaxParam, verifiedParam]);

  useEffect(() => {
    let mounted = true;
    api("/categories")
      .then((res) => {
        if (mounted) setCategories((res.categories || []).filter((c) => c.isActive !== false));
      })
      .catch(() => {
        if (mounted) setCategories([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    const nextCategory = categoryFilter.trim();
    const nextRating = ratingFilter.trim();
    const nextPriceMin = priceMinFilter.trim();
    const nextPriceMax = priceMaxFilter.trim();
    const nextBilling = billingFilter.trim();

    if (nextQuery) params.set("q", nextQuery);
    if (nextLocation) params.set("location", nextLocation);
    if (nextCategory) params.set("category", nextCategory);
    if (nextRating) params.set("ratingMin", nextRating);
    if (nextPriceMin) params.set("priceMin", nextPriceMin);
    if (nextPriceMax) params.set("priceMax", nextPriceMax);
    if (nextBilling) params.set("billingType", nextBilling);
    if (verifiedOnly) params.set("verifiedOnly", "true");

    setSearchParams(params);
  };

  const hasFilters = Boolean(categoryParam || ratingParam || priceMinParam || priceMaxParam || verifiedParam);
  const hasSearchCriteria = Boolean(query || locationQuery || hasFilters);

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
            <CardContent className="p-4 space-y-3">
              <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center rounded-md border px-3 bg-white dark:bg-neutral-900">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={serviceInput}
                      onChange={(event) => setServiceInput(event.target.value)}
                      placeholder="Search by provider name, service, or skill"
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="flex items-center rounded-md border px-3 bg-white dark:bg-neutral-900">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={locationInput}
                      onChange={(event) => setLocationInput(event.target.value)}
                      placeholder="Location"
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Min rating</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value)}
                    >
                      <option value="">Any</option>
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>{r}+</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Billing</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={billingFilter}
                      onChange={(e) => setBillingFilter(e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="hourly">Per hour</option>
                      <option value="day">Per day</option>
                      <option value="visit">Per visit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Price range</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={`${priceMinFilter || ""}-${priceMaxFilter || ""}`}
                      onChange={(e) => {
                        const [min, max] = e.target.value.split("-").map((v) => v || "");
                        setPriceMinFilter(min);
                        setPriceMaxFilter(max);
                      }}
                    >
                      <option value="-">Any</option>
                      <option value="0-500">₹0 - ₹500</option>
                      <option value="500-1000">₹500 - ₹1,000</option>
                      <option value="1000-2500">₹1,000 - ₹2,500</option>
                      <option value="2500-5000">₹2,500 - ₹5,000</option>
                      <option value="5000-">₹5,000+</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                    />
                    <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Verified only</span>
                  </label>
                  <div className="flex gap-2 ml-auto">
                    <Button type="button" variant="outline" onClick={() => {
                      setServiceInput("");
                      setLocationInput("");
                      setCategoryFilter("");
                      setRatingFilter("");
                      setBillingFilter("");
                      setPriceMinFilter("");
                      setPriceMaxFilter("");
                      setVerifiedOnly(false);
                      setSearchParams(new URLSearchParams());
                    }}>
                      Clear
                    </Button>
                    <Button type="submit"><SlidersHorizontal className="h-4 w-4 mr-2" />Apply</Button>
                  </div>
                </div>
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
                          <p className="text-xs md:text-sm text-muted-foreground">{provider.category}{provider.completedJobs !== undefined ? (<span className="ml-2">• {provider.completedJobs} jobs</span>) : null}</p>
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


