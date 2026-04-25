import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Zap,
  Wrench,
  Hammer,
  Paintbrush,
  Sparkles,
  Shirt,
  HardHat,
  Leaf,
  Star,
  Users,
  Calendar,
  MessageSquare,
  Shield,
  Target,
  Heart,
  TrendingUp,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
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

  // Live public stats (providers, bookings, average rating)
  const [stats, setStats] = useState({ providersCount: 0, bookingsCount: 0, averageRating: 0 });
  const [loadingPlan, setLoadingPlan] = useState(null);

  function useAnimatedNumber(target, duration = 800) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
      if (typeof target !== "number") return;
      const start = performance.now();
      const from = value;
      const diff = target - from;

      function step(now) {
        const t = Math.min(1, (now - start) / duration);
        setValue(Math.round(from + diff * t));
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      }

      rafRef.current = requestAnimationFrame(step);
      return () => cancelAnimationFrame(rafRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    return value;
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/stats")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data && data.stats) setStats(data.stats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const animatedProviders = useAnimatedNumber(stats.providersCount || 0);
  const animatedJobs = useAnimatedNumber(stats.bookingsCount || 0);
  const displayRating = stats.averageRating ? Number(stats.averageRating).toFixed(1) : "0.0";

  const marqueeItems = useMemo(() => {
    const active = categories.filter((item) => item.isActive !== false);
    if (active.length > 0) return active;
    return [
      { name: "Electrician", description: "Wiring, fans, lighting" },
      { name: "Plumber", description: "Leaks, faucets, fittings" },
      { name: "Carpenter", description: "Furniture, fittings, doors" },
      { name: "Painter", description: "Interiors & exteriors" },
      { name: "Cleaner", description: "Deep cleaning & housekeeping" },
      { name: "Tailor", description: "Alterations & stitching" },
      { name: "Mason", description: "Civil works & repairs" },
      { name: "Gardener", description: "Lawn & plant care" },
      { name: "AC Repair", description: "Cooling & servicing" },
    ];
  }, [categories]);
  const availableProviders = useMemo(() => providers.slice(0, 8), [providers]);
  const pricingPlans = useMemo(() => [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "Perfect for getting started",
      features: ["List your services", "Basic profile page", "Up to 10 bookings/month", "Email notifications", "Customer reviews"],
      limitations: ["No priority listing", "No analytics", "Limited support"],
      cta: "Current Plan",
      popular: false,
    },
    {
      name: "Professional",
      price: "₹499",
      period: "per month",
      description: "Best for growing businesses",
      features: [
        "Everything in Free",
        "Unlimited bookings",
        "Priority listing in search",
        "Advanced analytics",
        "24/7 priority support",
        "Featured badge",
        "Custom availability schedule",
        "Direct messaging",
      ],
      limitations: [],
      cta: "Buy subscription",
      popular: true,
    },
    {
      name: "Business",
      price: "₹999",
      period: "per month",
      description: "For established businesses",
      features: [
        "Everything in Professional",
        "Top search placement",
        "Promotional campaigns",
        "Team management (up to 5)",
        "API access",
        "Custom branding",
        "Dedicated account manager",
        "Performance reports",
      ],
      limitations: [],
      cta: "Buy subscription",
      popular: false,
    },
  ], []);

  async function handleSubscribe(plan) {
    try {
      setLoadingPlan(plan.name);
      const res = await api("/payments/subscription", { method: "POST", body: JSON.stringify({ plan: plan.name }) });
      if (res?.checkoutUrl) {
        window.open(res.checkoutUrl, "_blank");
      } else {
        toast({ title: "Subscription created", description: "Payment record created." });
      }
    } catch (err) {
      toast({ title: "Payment failed", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  }
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

      <section className="relative overflow-hidden text-primary-foreground py-12 md:py-20">
        <img
          src="/hero_image.png"
          alt="Hero"
          className="absolute inset-0 w-full h-full object-cover opacity-75 z-0"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#467ae9ff]/85 via-[#467ae9ff]/75 to-[#1d4ed8]/85 mix-blend-multiply z-0 pointer-events-none" />

        <div className="relative z-10 container mx-auto px-3 md:px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]">
              Find Local Service Providers Instantly
            </h1>
            <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.35)]">
              Connect with verified electricians, carpenters, tailors, and more in your area
            </p>

            <form onSubmit={handleSearch} className="bg-white/95 dark:bg-neutral-900/80 backdrop-blur rounded-lg p-3 md:p-4 shadow-lg border border-border/60">
              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                <div className="flex items-center flex-1 border rounded-md px-2 md:px-3 bg-white dark:bg-neutral-900">
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    value={serviceQuery}
                    onChange={(event) => setServiceQuery(event.target.value)}
                    placeholder="What service or provider do you need?"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base bg-transparent text-foreground"
                  />
                </div>
                <div className="flex items-center flex-1 border rounded-md px-2 md:px-3 bg-white dark:bg-neutral-900">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Search by location"
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base bg-transparent text-foreground"
                  />
                </div>
                <Button type="submit" size="lg" className="md:w-auto h-10 md:h-11">Search</Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="relative bg-background py-6 md:py-10 border-b">
        <style>{`
          @keyframes marqueeCards {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">Popular Categories</h2>
            <Link to="/categories" className="text-primary hover:underline text-sm md:text-base">View all {"->"}</Link>
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-4 md:gap-6 animate-[marqueeCards_18s_linear_infinite]">
              {[...marqueeItems, ...marqueeItems].map((category, idx) => {
                const Icon =
                  CATEGORY_ICONS[category.name.toLowerCase?.() || category.name?.toLowerCase()] || DefaultCategoryIcon;
                return (
                  <div key={`${category.name}-${idx}`} className="min-w-[220px] md:min-w-[260px]">
                    <Link to={`/category/${slugifyCategoryName(category.name)}`}>
                      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                        <CardContent className="p-4 md:p-5 flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-category-bg flex items-center justify-center">
                              <Icon className="h-6 w-6 md:h-7 md:w-7 text-category-icon" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm md:text-base">{category.name}</h3>
                              <p className="text-[11px] md:text-xs text-muted-foreground line-clamp-2">
                                {category.description || `Find trusted ${category.name.toLowerCase()} services.`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] md:text-xs text-muted-foreground pt-1 border-t">
                            <span>{category.providersCount || 0} providers</span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-foreground">{category.averageRating || 0}</span>
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
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

      <div className="container mx-auto px-3 md:px-4">
        <div className="h-px bg-border" />
      </div>

     

      <section className="py-10 md:py-16 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">About LocalLink</h2>
            <p className="text-sm md:text-lg text-muted-foreground leading-relaxed">
              Connecting communities with trusted local service providers. We make it simple to discover, compare,
              and book reliable professionals for everyday needs.
            </p>
          </div>

          

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Target className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Our Vision</h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Become the most trusted service marketplace in every community.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">{animatedProviders.toLocaleString()} Providers</h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Verified professionals ready to serve you.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">{animatedJobs.toLocaleString()} Jobs</h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Completed with high customer satisfaction.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">{displayRating} Rating</h3>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Average satisfaction across completed jobs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
        <div className="container mx-auto px-3 md:px-4">
         <div className="h-px bg-border" /></div>
 <section className="py-10 md:py-16 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Our Story</h2>
            <div className="space-y-3 md:space-y-4 text-muted-foreground text-sm md:text-base leading-relaxed">
              <p>
                LocalLink started in 2025 in Sikandarpur, Ballia, when our founder struggled to find a reliable electrician.
                After hours of searching and countless calls, it was clear there needed to be a better way to connect with local service providers.
              </p>
              <p>
                We built LocalLink to solve this—making it easy to find, compare, and book trusted providers nearby. Today we serve thousands of
                customers and help hundreds of professionals grow their businesses.
              </p>
              <p>
                Quality, transparency, and community drive us. We verify providers, keep pricing fair, and constantly improve based on your feedback.
              </p>
            </div>
          </div>
        </div>
      </section>
      <div className="container mx-auto px-3 md:px-4">
        <div className="h-px bg-border" />
      </div>

      <section className="py-10 md:py-16 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-10">How LocalLink Works</h2>

          <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
            {[{
              step: "1",
              icon: <Search className="h-5 w-5 md:h-6 md:w-6 text-primary" />,
              title: "Search for Services",
              body: "Browse categories or use search. Filter by location, availability, price, and ratings to find what you need."
            },{
              step: "2",
              icon: <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />,
              title: "Compare Providers",
              body: "Open provider profiles to check ratings, reviews, skills, experience, and pricing to pick the best fit."
            },{
              step: "3",
              icon: <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />,
              title: "Book & Schedule",
              body: "Book instantly when available or schedule for later. Request quotes and confirm details before booking."
            },{
              step: "4",
              icon: <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />,
              title: "Connect Directly",
              body: "Chat inside LocalLink to clarify requirements, coordinate timing, and keep everything in one place."
            }].map(({ step, icon, title, body }) => (
              <div key={step} className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl md:text-3xl font-bold text-primary">{step}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 flex items-center gap-2">
                    {icon}
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-sm md:text-lg leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
       <div className="container mx-auto px-3 md:px-4">
         <div className="h-px bg-border" /></div>

      <section className="py-10 md:py-16 bg-background">
        <div className="container mx-auto px-3 md:px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-10">Simple, Transparent Pricing</h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 text-sm md:text-base">
            Choose the plan that fits your business—upgrade anytime as you grow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg md:scale-105" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 md:px-4 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-5 md:p-8">
                  <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-3 md:mb-4 text-sm md:text-base">{plan.description}</p>
                  <div className="mb-4 md:mb-6">
                    <span className="text-3xl md:text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm md:text-base">/{plan.period}</span>
                  </div>
                  {plan.price === "₹0" || plan.name === "Free" ? (
                    <Button as="div" variant="outline" className="w-full mb-4 md:mb-6 h-9 md:h-10 text-sm md:text-base flex items-center justify-center font-medium">
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button onClick={() => handleSubscribe(plan)} className="w-full mb-4 md:mb-6 h-9 md:h-10 text-sm md:text-base" variant={plan.popular ? "default" : "outline"} disabled={loadingPlan !== null}>
                      {loadingPlan === plan.name ? "Processing..." : plan.cta}
                    </Button>
                  )}
                  <div className="space-y-2 md:space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs md:text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-2">
                        <X className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-xs md:text-sm text-muted-foreground">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
       <div className="container mx-auto px-3 md:px-4">
         <div className="h-px bg-border" /></div>

      <section className="py-10 md:py-16 bg-muted/30">
        <div className="container mx-auto px-3 md:px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-12">Why Choose LocalLink?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Verified Providers</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Verified and background-checked providers for peace of mind.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Star className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Trusted Reviews</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Read real reviews from customers before you book.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-6 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Easy Scheduling</h3>
                <p className="text-muted-foreground text-sm md:text-base">
                  Book now or schedule later with flexible booking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {showProviderCtaSection && (
        <section className="py-8 md:py-16 bg-gradient-to-l from-[#467ae9ff] to-[#1d4ed8]  text-primary-foreground">
          <div className="container mx-auto px-3 md:px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Are You a Service Provider?</h2>
            <p className="text-sm md:text-lg mb-4 md:mb-6 opacity-90 max-w-2xl mx-auto">Join LocalLink to find more clients, manage your schedule, and grow your business</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Link to="/learn-more"><Button variant="secondary" size="lg" className="bg-white w-full sm:w-auto">Learn More</Button></Link>
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
