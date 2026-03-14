import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Wrench, Hammer, Paintbrush, Sparkles, Shirt, HardHat, Leaf, Star, Users, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await api("/categories");
        if (mounted) {
          setCategories(response.categories || []);
        }
      } catch {
        if (mounted) {
          setCategories([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleCategories = useMemo(() => categories.filter((item) => item.isActive !== false), [categories]);
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return visibleCategories;
    }

    return visibleCategories.filter((category) => {
      const name = String(category.name || "").toLowerCase();
      const description = String(category.description || "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [searchQuery, visibleCategories]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-6 md:py-12 bg-background pb-24 md:pb-12">
        <div className="container mx-auto px-3 md:px-4">
          <div className="mb-6 md:mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Service Categories</h1>
              <p className="text-muted-foreground text-sm md:text-lg">Browse all service categories available in your area</p>
            </div>

            <div className="w-full md:w-[320px]">
              <div className="flex items-center rounded-lg border bg-white px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search categories"
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Card key={idx}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No categories matched your search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {filteredCategories.map((category) => {
                const Icon = CATEGORY_ICONS[category.name.toLowerCase()] || DefaultCategoryIcon;

                return (
                  <Link key={category.id} to={`/category/${slugifyCategoryName(category.name)}`}>
                    <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                      <CardContent className="p-6">
                        <div className="relative w-12 h-12 mb-3 bg-category-bg rounded-full flex items-center justify-center">
                          <Icon className="h-6 w-6 text-category-icon" />
                          <div className="absolute top-1/2 -translate-y-1/2 right-[-32px] flex items-center gap-2 bg-white rounded-full px-2 py-0.5 shadow text-[10px] font-semibold text-yellow-500 [@media(min-width:768px)]:hidden">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {category.averageRating || 0}
                          </div>
                        </div>

                        <h3 className="text-sm md:text-base font-semibold mb-1 text-center md:text-left">{category.name}</h3>
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-2 min-h-[28px] md:min-h-[20px] text-center md:text-left line-clamp-2">
                          {category.description || `Find trusted ${category.name.toLowerCase()} services in your area.`}
                        </p>

                        <div className="flex items-center justify-between text-[10px] md:text-xs pt-2 border-t">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span className="hidden sm:inline">{category.providersCount || 0} Providers</span>
                            <span className="sm:hidden">{category.providersCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{category.averageRating || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Categories;
