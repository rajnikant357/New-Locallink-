import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Search, Wrench } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  findCategoryBySlug,
  formatCategoryLabel,
  getCategorySubcategoryDetails,
  slugifySubcategoryName,
} from "@/lib/category-slug";

const CategoryDetail = () => {
  const { category } = useParams();
  const [loading, setLoading] = useState(true);
  const [categoryMeta, setCategoryMeta] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fallbackCategoryName = useMemo(() => formatCategoryLabel(category), [category]);
  const categoryName = categoryMeta?.name || fallbackCategoryName || "Category";

  useEffect(() => {
    let mounted = true;

    const loadCategory = async () => {
      try {
        setLoading(true);
        const categoriesResponse = await api("/categories");
        const visibleCategories = (categoriesResponse.categories || []).filter((item) => item.isActive !== false);
        const matchedCategory = findCategoryBySlug(visibleCategories, category);

        if (mounted) {
          setCategoryMeta(matchedCategory || null);
        }
      } catch {
        if (mounted) {
          setCategoryMeta(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCategory();

    return () => {
      mounted = false;
    };
  }, [category]);

  const subcategoryDetails = useMemo(() => getCategorySubcategoryDetails(categoryMeta), [categoryMeta]);
  const filteredSubcategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return subcategoryDetails;
    }

    return subcategoryDetails.filter((entry) => {
      const name = String(entry.name || "").toLowerCase();
      const description = String(entry.description || "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [searchQuery, subcategoryDetails]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-6 md:py-12 bg-background pb-24 md:pb-12">
        <div className="container mx-auto px-3 md:px-4">
          <Link to="/categories" className="text-primary hover:underline flex items-center gap-1 mb-4">
            <ChevronLeft className="h-4 w-4" />
            Back to Categories
          </Link>

          <div className="mb-6 md:mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">Service Category</p>
              <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">{categoryName}</h1>
              <p className="text-muted-foreground text-sm md:text-lg">
                Browse the subcategories available under {categoryName}.
              </p>
            </div>

            <div className="w-full md:w-[320px]">
              <div className="flex items-center rounded-lg border bg-white px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search subcategories"
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
          ) : !categoryMeta ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                This category could not be found.
              </CardContent>
            </Card>
          ) : filteredSubcategories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No subcategories matched your search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {filteredSubcategories.map((entry) => (
                <Link
                  key={entry.name}
                  to={`/category/${category}/subcategory/${slugifySubcategoryName(entry.name)}`}
                >
                  <Card className="hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 mb-3 bg-category-bg rounded-full flex items-center justify-center">
                        <Wrench className="h-6 w-6 text-category-icon" />
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="text-sm md:text-base font-semibold line-clamp-2">{entry.name}</h3>
                        <Badge variant="outline">Subcategory</Badge>
                      </div>

                      <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-3 min-h-[40px] md:min-h-[48px]">
                        {entry.description || `Explore providers for ${entry.name.toLowerCase()}.`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CategoryDetail;
