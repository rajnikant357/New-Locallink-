const crypto = require("crypto");
const { z } = require("zod");
const {
  listCategories: fetchCategories,
  listProviders: fetchProviders,
  getCategoryById,
  getCategoryByName,
  createCategory: persistCategory,
  updateCategory: persistCategoryUpdate,
  deleteCategory: removeCategory,
  updateProviderCategoryName,
} = require("../db/repository");

const listCategoriesSchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

const categoryIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(240).optional().default(""),
    isActive: z.boolean().optional().default(true),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      description: z.string().trim().max(240).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  query: z.object({}).optional(),
});

function categoryStats(providers, categoryName) {
  const filtered = providers.filter((provider) => provider.category.toLowerCase() === categoryName.toLowerCase());
  const count = filtered.length;
  const rating =
    count === 0 ? 0 : Number((filtered.reduce((sum, provider) => sum + (provider.rating || 0), 0) / count).toFixed(1));

  return { providersCount: count, averageRating: rating };
}

async function listCategories(req, res) {
  const { q } = req.validated.query;
  const categories = await fetchCategories();
  const providers = await fetchProviders();

  let filtered = categories;
  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        (category.description || "").toLowerCase().includes(query),
    );
  }

  const enriched = filtered.map((category) => ({
    ...category,
    ...categoryStats(providers, category.name),
  }));

  return res.json({ categories: enriched });
}

async function createCategory(req, res) {
  const payload = req.validated.body;

  const exists = await getCategoryByName(payload.name);
  if (exists) {
    return res.status(409).json({ message: "Category already exists" });
  }

  const category = await persistCategory({
    id: `cat_${crypto.randomUUID()}`,
    name: payload.name,
    description: payload.description,
    isActive: payload.isActive,
  });

  return res.status(201).json({ category });
}

async function updateCategory(req, res) {
  const { id } = req.validated.params;
  const updates = { ...req.validated.body };

  const current = await getCategoryById(id);
  if (!current) {
    return res.status(404).json({ message: "Category not found" });
  }

  if (updates.name && updates.name.toLowerCase() !== current.name.toLowerCase()) {
    const duplicate = await getCategoryByName(updates.name);
    if (duplicate && duplicate.id !== id) {
      return res.status(409).json({ message: "Category already exists" });
    }
    await updateProviderCategoryName(current.name, updates.name);
  }

  const category = await persistCategoryUpdate(id, updates);
  return res.json({ category });
}

async function deleteCategory(req, res) {
  const { id } = req.validated.params;

  const category = await getCategoryById(id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  const providers = await fetchProviders();
  const linkedProviders = providers.filter((provider) => provider.category.toLowerCase() === category.name.toLowerCase());
  if (linkedProviders.length > 0) {
    return res.status(409).json({ message: "Cannot delete category with linked providers" });
  }

  await removeCategory(id);

  return res.status(204).send();
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategoriesSchema,
  categoryIdSchema,
  createCategorySchema,
  updateCategorySchema,
};
