import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, MapPin, Search, Star, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getCategorySubcategoryDetails, slugifyCategoryName } from "@/lib/category-slug";
import { filterSiteSearchEntries, matchesSearchQuery, normalizeSearchText } from "@/lib/site-search";

function scoreCategory(category, query) {
  const normalizedQuery = normalizeSearchText(query);
  const name = normalizeSearchText(category.name);
  const description = normalizeSearchText(category.description || "");
  const subcategories = getCategorySubcategoryDetails(category).map((item) => ({
    name: normalizeSearchText(item.name),
    description: normalizeSearchText(item.description || ""),
  }));

  let score = 0;
  if (name === normalizedQuery) score += 110;
  if (name.startsWith(normalizedQuery)) score += 70;
  if (name.includes(normalizedQuery)) score += 45;
  if (subcategories.some((item) => item.name === normalizedQuery)) score += 55;
  if (subcategories.some((item) => item.name.includes(normalizedQuery))) score += 30;
  if (subcategories.some((item) => item.description.includes(normalizedQuery))) score += 18;
  if (description.includes(normalizedQuery)) score += 20;
  return score;
}

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const locationQuery = searchParams.get("location")?.trim() || "";
  const [serviceInput, setServiceInput] = useState(query);
  const [locationInput, setLocationInput] = useState(locationQuery);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setServiceInput(query);
    setLocationInput(locationQuery);
  }, [query, locationQuery]);

  useEffect(() => {
    let mounted = true;

    const loadResults = async () => {
      try {
        setLoading(true);
        setError("");

        const providerParams = new URLSearchParams();
        if (query) providerParams.set("q", query);
        if (locationQuery) providerParams.set("location", locationQuery);

        const [providersResponse, categoriesResponse] = await Promise.all([
          api(providerParams.size ? `/providers?${providerParams.toString()}` : "/providers"),
          api("/categories"),
        ]);

        if (!mounted) return;

        setProviders(providersResponse.providers || []);
        setCategories((categoriesResponse.categories || []).filter((item) => item.isActive !== false));
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Search is temporarily unavailable.");
        setProviders([]);
        setCategories([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [query, locationQuery]);

  const categoryResults = useMemo(() => {
    if (!query) {
      return [];
    }

    return categories
      .filter((category) =>
        matchesSearchQuery(
          [
            category.name,
            category.description,
            getCategorySubcategoryDetails(category).flatMap((entry) => [entry.name, entry.description]),
          ],
          query,
        ),
      )
      .map((category) => ({
        ...category,
        score: scoreCategory(category, query),
      }))
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  }, [categories, query]);

  const siteResults = useMemo(() => (query ? filterSiteSearchEntries(query) : []), [query]);
  const totalResults = providers.length + categoryResults.length + siteResults.length;
  const hasSearchCriteria = Boolean(query || locationQuery);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const nextQuery = serviceInput.trim();
    const nextLocation = locationInput.trim();

    if (nextQuery) params.set("q", nextQuery);
    if (nextLocation) params.set("location", nextLocation);

    setSearchParams(params);
  };

  const clearSearch = () => {
    setServiceInput("");
    setLocationInput("");
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 bg-background pb-24 md:pb-12">
        <section className="border-b bg-muted/30 py-8 md:py-12">
          <div className="container mx-auto px-3 md:px-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Search Results</h1>
                <p className="text-muted-foreground mt-2">
                  Search providers by service, provider name, and location, then explore matching categories and pages.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="bg-white rounded-xl border p-3 md:p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex items-center flex-1 rounded-md border px-3 bg-white">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={serviceInput}
                      onChange={(event) => setServiceInput(event.target.value)}
                      placeholder="Search by service, provider name, skill, or keyword"
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
                  <Button type="submit" className="md:min-w-32">Search</Button>
                  <Button type="button" variant="outline" onClick={clearSearch}>Clear</Button>
                </div>
              </form>

              {hasSearchCriteria && !loading && !error ? (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                  <p>
                    {totalResults} result{totalResults === 1 ? "" : "s"}
                    {query ? ` for "${query}"` : ""}
                    {locationQuery ? ` in ${locationQuery}` : ""}
                  </p>
                  <Link to={`/providers${hasSearchCriteria ? `?${searchParams.toString()}` : ""}`} className="text-primary hover:underline">
                    View provider-only results
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="py-8 md:py-10">
          <div className="container mx-auto px-3 md:px-4">
            {!hasSearchCriteria ? (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="p-8 text-center space-y-3">
                  <Search className="h-10 w-10 text-primary mx-auto" />
                  <h2 className="text-2xl font-semibold">Start with a service, provider, or location</h2>
                  <p className="text-muted-foreground">
                    Try searches like "electrician", "Rakesh electrician", or "Ballia" to search across the site.
                  </p>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="max-w-5xl mx-auto space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="p-6 space-y-3">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams(searchParams))}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : totalResults === 0 ? (
              <Card className="max-w-4xl mx-auto">
                <CardContent className="p-8 text-center space-y-3">
                  <h2 className="text-2xl font-semibold">No matches found</h2>
                  <p className="text-muted-foreground">
                    Try a broader service term, a shorter provider name, or a nearby location.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-5xl mx-auto space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold">Provider Matches</h2>
                      <p className="text-sm text-muted-foreground">
                        Matching service providers from your live provider data.
                      </p>
                    </div>
                    <Badge variant="secondary">{providers.length}</Badge>
                  </div>

                  {providers.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-sm text-muted-foreground">
                        No provider matches for the current search.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {providers.map((provider) => (
                        <Card key={provider.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <Link to={`/providers/${provider.id}`} className="text-lg font-semibold hover:text-primary">
                                  {provider.name}
                                </Link>
                                <p className="text-sm text-muted-foreground">{provider.category}</p>
                              </div>
                              <Badge variant={provider.isVerified ? "default" : "secondary"}>
                                {provider.isVerified ? "Verified" : "Provider"}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {provider.location || "Location not set"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {provider.rating || "New"}
                              </span>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">{provider.bio}</p>

                            <div className="flex flex-wrap gap-2">
                              {(provider.skills || []).slice(0, 4).map((skill) => (
                                <Badge key={skill} variant="outline">{skill}</Badge>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <Button asChild variant="outline">
                                <Link to={`/providers/${provider.id}`}>View Profile</Link>
                              </Button>
                              <Button asChild>
                                <Link to={`/providers?q=${encodeURIComponent(query || provider.name)}${locationQuery ? `&location=${encodeURIComponent(locationQuery)}` : ""}`}>
                                  More Like This
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>

                {query ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold">Category Matches</h2>
                        <p className="text-sm text-muted-foreground">
                          Service categories and specialties that match your search.
                        </p>
                      </div>
                      <Badge variant="secondary">{categoryResults.length}</Badge>
                    </div>

                    {categoryResults.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-sm text-muted-foreground">
                          No category matches for this search term.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryResults.map((category) => (
                          <Card key={category.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-xl">{category.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {category.providersCount || 0} providers
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  {category.averageRating || 0}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getCategorySubcategoryDetails(category).slice(0, 3).map((item) => (
                                  <Badge key={item.name} variant="outline">{item.name}</Badge>
                                ))}
                              </div>
                              <Button asChild variant="outline">
                                <Link to={`/category/${slugifyCategoryName(category.name)}`}>Explore Category</Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}

                {query ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold">Website Matches</h2>
                        <p className="text-sm text-muted-foreground">
                          Helpful pages and sections related to your search.
                        </p>
                      </div>
                      <Badge variant="secondary">{siteResults.length}</Badge>
                    </div>

                    {siteResults.length === 0 ? (
                      <Card>
                        <CardContent className="p-6 text-sm text-muted-foreground">
                          No site pages matched this query.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {siteResults.map((result) => (
                          <Card key={result.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-5 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="inline-flex items-center gap-2 text-primary">
                                  <FileText className="h-4 w-4" />
                                  <span className="font-semibold">{result.title}</span>
                                </div>
                                <Badge variant="outline">{result.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{result.description}</p>
                              <Button asChild variant="ghost" className="px-0 text-primary hover:text-primary">
                                <Link to={result.route}>
                                  Open page <ArrowRight className="h-4 w-4 ml-1" />
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default SearchResults;
