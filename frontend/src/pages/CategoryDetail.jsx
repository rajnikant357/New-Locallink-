import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { findCategoryBySlug, formatCategoryLabel } from "@/lib/category-slug";

const CategoryDetail = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categoryMeta, setCategoryMeta] = useState(null);
  const [searchQuery] = useState("");

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

  const filteredSubcategories = [];

  // Redirect categories to providers list with prefilled query since subcategories were removed.
  useEffect(() => {
    if (!loading && categoryMeta) {
      const target = `/providers?q=${encodeURIComponent(categoryMeta.name || categoryName)}`;
      navigate(target, { replace: true });
    }
  }, [loading, categoryMeta, navigate, categoryName]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-6 md:py-12 bg-background pb-24 md:pb-12">
        <div className="container mx-auto px-3 md:px-4">
          <Link to="/categories" className="text-primary hover:underline flex items-center gap-1 mb-4">
            <ChevronLeft className="h-4 w-4" />
            Back to Categories
          </Link>

          <div className="mb-6 md:mb-8">
            <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">Service Category</p>
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">{categoryName}</h1>
            <p className="text-muted-foreground text-sm md:text-lg">
              Browse providers for {categoryName}. Subcategories have been simplified into a single category view.
            </p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">Loading category...</CardContent>
            </Card>
          ) : !categoryMeta ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                This category could not be found.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Redirecting to providers for {categoryName}...
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CategoryDetail;
