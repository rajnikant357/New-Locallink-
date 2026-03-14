import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MapPin, Star, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import HurryModeToggle from "@/components/HurryModeToggle";
import { api } from "@/lib/api";
import {
  findCategoryBySlug,
  findSubcategoryBySlug,
  formatCategoryLabel,
} from "@/lib/category-slug";

const SubcategoryDetail = () => {
  const { category, subCategory } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFilters, setShowFilters] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("nearest");
  const [categoryMeta, setCategoryMeta] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [filters, setFilters] = useState({
    ratingMin: 0,
    priceMin: "",
    priceMax: "",
    verifiedOnly: false,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    ratingMin: 0,
    priceMin: "",
    priceMax: "",
    verifiedOnly: false,
  });

  const fallbackCategoryName = useMemo(() => formatCategoryLabel(category), [category]);

  useEffect(() => {
    let mounted = true;

    const loadProviders = async () => {
      try {
        setLoading(true);

        const categoriesResponse = await api("/categories");
        const visibleCategories = (categoriesResponse.categories || []).filter((item) => item.isActive !== false);
        const matchedCategory = findCategoryBySlug(visibleCategories, category);
        const resolvedSubcategory = findSubcategoryBySlug(matchedCategory, subCategory);

        if (mounted) {
          setCategoryMeta(matchedCategory || null);
          setSelectedSubcategory(resolvedSubcategory || null);
        }

        if (!matchedCategory || !resolvedSubcategory) {
          if (mounted) {
            setProviders([]);
          }
          return;
        }

        const params = new URLSearchParams();
        params.set("category", matchedCategory.name);
        params.set("subCategory", resolvedSubcategory.name);
        if (sortBy) params.set("sortBy", sortBy);
        if (appliedFilters.ratingMin) params.set("ratingMin", String(appliedFilters.ratingMin));
        if (appliedFilters.priceMin !== "") params.set("priceMin", String(appliedFilters.priceMin));
        if (appliedFilters.priceMax !== "") params.set("priceMax", String(appliedFilters.priceMax));
        if (appliedFilters.verifiedOnly) params.set("verifiedOnly", "true");

        const response = await api(`/providers?${params.toString()}`);
        if (mounted) {
          setProviders(response.providers || []);
        }
      } catch {
        if (mounted) {
          setProviders([]);
          setCategoryMeta(null);
          setSelectedSubcategory(null);
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
  }, [category, subCategory, sortBy, appliedFilters]);

  const handleAuthRequired = () => {
    toast({
      title: "Authentication required",
      description: "Please sign in to contact or book a provider.",
      variant: "destructive",
    });
    navigate("/auth");
  };

  const sortedProviders = useMemo(() => [...providers], [providers]);

  const handleBookNow = async (provider) => {
    if (!isAuthenticated) {
      handleAuthRequired();
      return;
    }

    try {
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          providerId: provider.id,
          service: provider.subCategory || provider.category,
          scheduledFor,
          notes: `Booking request for ${provider.subCategory || provider.category}`,
        }),
      });

      toast({
        title: "Booking requested",
        description: `Your request has been sent to ${provider.name}.`,
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

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const reset = { ratingMin: 0, priceMin: "", priceMax: "", verifiedOnly: false };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 bg-background">
        <div className="border-b bg-muted/30 py-6">
          <div className="container mx-auto px-4">
            <Link to={`/category/${category}`} className="text-primary hover:underline flex items-center gap-1 mb-4">
              <ChevronLeft className="h-4 w-4" />
              Back to {categoryMeta?.name || fallbackCategoryName}
            </Link>

            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : !categoryMeta || !selectedSubcategory ? (
              <div>
                <h1 className="text-3xl font-bold mb-2">Subcategory Not Found</h1>
                <p className="text-muted-foreground">This subcategory is not available under the selected category.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">{categoryMeta.name}</p>
                  <h1 className="text-3xl font-bold mb-2">{selectedSubcategory.name}</h1>
                  <p className="text-muted-foreground">
                    {sortedProviders.length} providers available for this subcategory.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                    {selectedSubcategory.description || "Browse and filter providers for this exact subcategory service."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nearest">Best Match</SelectItem>
                      <SelectItem value="rating">Highest Rating</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="lg:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <HurryModeToggle onToggle={() => {}} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className={`lg:block ${showFilters ? "block" : "hidden"}`}>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div><h3 className="font-semibold mb-4">Filters</h3></div>

                  <div>
                    <h4 className="font-medium mb-3">Availability</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="verified-only" checked={filters.verifiedOnly} onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, verifiedOnly: !!checked }))} />
                        <Label htmlFor="verified-only" className="text-sm">Verified Providers Only</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Distance</h4>
                    <div className="space-y-3">
                      <Slider defaultValue={[20]} max={50} step={1} />
                      <div className="flex justify-between text-sm text-muted-foreground"><span>0 km</span><span>5 km</span><span>20 km</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Minimum Rating</h4>
                    <div className="space-y-2">
                      {[4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center space-x-2">
                          <Checkbox
                            id={`rating-${rating}`}
                            checked={filters.ratingMin === rating}
                            onCheckedChange={(checked) =>
                              setFilters((prev) => ({ ...prev, ratingMin: checked ? rating : 0 }))
                            }
                          />
                          <Label htmlFor={`rating-${rating}`} className="text-sm flex items-center gap-1">{rating}+ <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /></Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Price Range (per hour)</h4>
                    <div className="flex gap-2">
                      <Input placeholder="Rs Min" type="number" value={filters.priceMin} onChange={(event) => setFilters((prev) => ({ ...prev, priceMin: event.target.value }))} />
                      <span className="self-center">-</span>
                      <Input placeholder="Rs Max" type="number" value={filters.priceMax} onChange={(event) => setFilters((prev) => ({ ...prev, priceMax: event.target.value }))} />
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button className="w-full" onClick={applyFilters}>Apply Filters</Button>
                    <Button variant="outline" className="w-full" onClick={resetFilters}>Reset</Button>
                  </div>
                </CardContent>
              </Card>
            </aside>

            <div className="lg:col-span-3 space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <Card key={idx}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                ))
              ) : !selectedSubcategory ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Choose a valid subcategory first.</CardContent></Card>
              ) : sortedProviders.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No providers found for this subcategory yet.</CardContent></Card>
              ) : (
                sortedProviders.map((provider) => (
                  <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-20 h-20 bg-category-bg rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl font-semibold text-category-icon">{provider.name.charAt(0)}</span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-semibold mb-1">{provider.name}</h3>
                              <p className="text-sm text-muted-foreground">{provider.category} · {provider.subCategory || selectedSubcategory.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-lg">{provider.rating || "New"}</span>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4" />{provider.location}</p>
                            <p className="font-semibold">Rs {provider.priceMin}/visit</p>
                            <p className="text-sm text-muted-foreground">{provider.bio}</p>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {(provider.skills || []).map((skill) => (<Badge key={skill} variant="secondary">{skill}</Badge>))}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-sm text-muted-foreground">Available</span></div>

                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => navigate(`/providers/${provider.id}`)}>View Profile</Button>
                              <Button
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    handleAuthRequired();
                                    return;
                                  }
                                  if (!provider.userId) {
                                    toast({ title: "Messaging unavailable", description: "Provider account link is missing." });
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
                              <Button variant="secondary" onClick={() => handleBookNow(provider)}>Book Now</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SubcategoryDetail;
