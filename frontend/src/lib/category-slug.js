export function slugifyCategoryName(name = "") {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deslugifyCategoryName(slug = "") {
  return decodeURIComponent(String(slug || ""))
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCategoryLabel(value = "") {
  return deslugifyCategoryName(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function findCategoryBySlug(categories = [], slug = "") {
  const normalizedSlug = slugifyCategoryName(slug);
  return categories.find((category) => slugifyCategoryName(category?.name || "") === normalizedSlug) || null;
}

export function slugifySubcategoryName(name = "") {
  return slugifyCategoryName(name);
}

export function getCategorySubcategoryDetails(category = null) {
  // Subcategories are no longer used in the app; keep API stable but return an empty list.
  return [];
}

export function findSubcategoryBySlug(category = null, slug = "") {
  return null;
}
