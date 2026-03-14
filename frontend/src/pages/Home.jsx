import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Zap, Wrench, Hammer, Paintbrush, Sparkles, Shirt, HardHat, Leaf, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { slugifyCategoryName } from "@/lib/category-slug";

const CATEGORY_ICONS = {
  electrician: Zap,
  plumber: Wrench,
  carpenter: Hammer,
  painter: Paintbrush,
  cleaner: Sparkles,
  tailor: Shirt,
  mason: HardHat,
  gardener: Leaf,
};

const DefaultCategoryIcon = Zap;

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [serviceQuery, setServiceQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoadingData(true);
        const [categoriesResponse, providersResponse] = await Promise.all([api("/categories"), api("/providers?limit=8")]);

        if (!mounted) return;

        setCategories(categoriesResponse.categories || []);
        setProviders(providersResponse.providers || []);
      } catch {
        if (!mounted) return;
        setCategories([]);
        setProviders([]);
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const popularCategories = useMemo(() => categories.filter((item) => item.isActive !== false).slice(0, 6), [categories]);
  const availableProviders = useMemo(() => providers.slice(0, 8), [providers]);
  const hasProviderProfile = useMemo(
    () => (user?.id ? providers.some((provider) => provider.userId === user.id) : false),
    [providers, user?.id],
  );
  const showProviderCtaSection = useMemo(() => {
    if (!user) return false;
    if (user.type === "customer") return true;
    if (user.type === "provider" && !hasProviderProfile) return true;
    return false;
  }, [hasProviderProfile, user]);

  const handleSearch = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const nextServiceQuery = serviceQuery.trim();
    const nextLocationQuery = locationQuery.trim();

    if (nextServiceQuery) params.set("q", nextServiceQuery);
    if (nextLocationQuery) params.set("location", nextLocationQuery);

    navigate(`/search${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-gradient-to-r from-[#467ae9ff] to-[#1d4ed8] text-primary-foreground py-12 md:py-20">
        <div className="container mx-auto px-3 md:px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">Find Local Service Providers Instantly</h1>
            <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 opacity-90">Connect with verified electricians, carpenters, tailors, and more in your area</p>

            <form onSubmit={handleSearch} className="bg-white rounded-lg p-3 md:p-4 shadow-lg">
              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                <div className="flex items-center flex-1 border rounded-md px-2 md:px-3 bg-white">
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <Input
                    value={serviceQuery}
                    onChange={(event) => setServiceQuery(event.target.value)}
                    placeholder="What service or provider do you need?"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base"
                  />
                </div>
                <div className="flex items-center flex-1 border rounded-md px-2 md:px-3 bg-white">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <Input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Search by location"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base"
                  />
                </div>
                <Button type="submit" size="lg" className="md:w-auto h-10 md:h-11">Search</Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-16 bg-background pb-24 md:pb-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex justify-between items-center mb-4 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Popular Categories</h2>
            <Link to="/categories" className="text-primary hover:underline text-sm md:text-base">View all {"->"}</Link>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx}><CardContent className="p-3 md:p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {popularCategories.map((category) => {
                const Icon = CATEGORY_ICONS[category.name.toLowerCase()] || DefaultCategoryIcon;
                return (
                  <Link key={category.id} to={`/category/${slugifyCategoryName(category.name)}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-3 md:p-6 text-center">
                        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 bg-category-bg rounded-full flex items-center justify-center">
                          <Icon className="h-7 w-7 md:h-8 md:w-8 text-category-icon" />
                        </div>
                        <h3 className="font-semibold mb-1 text-sm md:text-base">{category.name}</h3>
                        <p className="text-[10px] md:text-sm text-muted-foreground">{category.providersCount || 0} providers</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-8 md:py-16 bg-muted/30">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex justify-between items-center mb-4 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Available Right Now</h2>
            <Link to="/providers" className="text-primary hover:underline text-sm md:text-base">View all {"->"}</Link>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx}><CardContent className="p-4 md:p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {availableProviders.map((provider) => (
                <Card key={provider.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-3 md:mb-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-category-bg rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-base md:text-lg font-semibold text-category-icon">{provider.name.charAt(0)}</span>
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
                      <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3 md:h-4 md:w-4" />{provider.location}</p>
                      <p className="text-xs md:text-sm font-semibold">Rs {provider.priceMin}/visit</p>
                    </div>

                    <div className="flex flex-wrap gap-1 md:gap-2 mb-3 md:mb-4">
                      {(provider.skills || []).slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] md:text-xs">{skill}</Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs md:text-sm text-muted-foreground">Available</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="text-xs md:text-sm h-8 md:h-9" onClick={() => navigate(`/providers/${provider.id}`)}>View Profile</Button>
                      <Link to={`/category/${slugifyCategoryName(provider.category)}`}>
                        <Button size="sm" className="text-xs md:text-sm h-8 md:h-9 w-full">Book Now</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-8 md:py-16 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-12">How LocalLink Works</h2>

          <div className="flex flex-row gap-4 md:gap-8 max-w-5xl mx-auto justify-center items-stretch overflow-x-auto scrollbar-hide pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex-1 min-w-[140px] md:min-w-[180px] max-w-[160px] md:max-w-[220px] flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-2xl md:text-3xl font-bold text-primary">1</span></div>
              <h3 className="text-sm md:text-base font-semibold mb-1">Search Services</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">Find the service you need by category or search directly</p>
            </div>

            <div className="flex-1 min-w-[140px] md:min-w-[180px] max-w-[160px] md:max-w-[220px] flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-2xl md:text-3xl font-bold text-primary">2</span></div>
              <h3 className="text-sm md:text-base font-semibold mb-1">Choose Provider</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">Compare ratings, prices, and availability to select the best match</p>
            </div>

            <div className="flex-1 min-w-[140px] md:min-w-[180px] max-w-[160px] md:max-w-[220px] flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-2xl md:text-3xl font-bold text-primary">3</span></div>
              <h3 className="text-sm md:text-base font-semibold mb-1">Book & Connect</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">Book instantly or schedule for later and connect directly</p>
            </div>
          </div>
        </div>
      </section>

      {showProviderCtaSection && (
        <section className="py-8 md:py-16 bg-gradient-to-l from-[#467ae9ff] to-[#1d4ed8]  text-primary-foreground">
          <div className="container mx-auto px-3 md:px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Are You a Service Provider?</h2>
            <p className="text-sm md:text-lg mb-4 md:mb-6 opacity-90 max-w-2xl mx-auto">Join LocalLink to find more clients, manage your schedule, and grow your business</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/learn-more"><Button variant="secondary" size="lg" className="w-full sm:w-auto">Learn More</Button></Link>
              <Link to="/register-provider"><Button size="lg" className="bg-white w-full sm:w-auto" variant="secondary">Register Now</Button></Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Home;

