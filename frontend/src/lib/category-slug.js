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
