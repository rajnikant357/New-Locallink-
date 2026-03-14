const crypto = require("crypto");
const { z } = require("zod");
const { assertProviderProfileAllowed } = require("../utils/role-conflicts");
const {
  listProviders: fetchProviders,
  getProviderById: fetchProviderById,
  createProvider: persistProvider,
  updateProvider: persistProviderUpdate,
  listReviewsByProvider,
  getReviewByProviderAndCustomer,
  upsertReview,
  recalculateProviderRating,
  getUserById,
  getUsersByIds,
  getCategoryByName,
  hasCompletedBooking,
  getProviderByUserId,
} = require("../db/repository");

const socialLinksSchema = z
  .object({
    website: z.string().trim().max(500).optional(),
    instagram: z.string().trim().max(500).optional(),
    facebook: z.string().trim().max(500).optional(),
    linkedin: z.string().trim().max(500).optional(),
  })
  .optional();

const listProvidersSchema = z.object({
  query: z.object({
    category: z.string().trim().optional(),
    q: z.string().trim().optional(),
    location: z.string().trim().optional(),
    ratingMin: z.coerce.number().min(0).max(5).optional(),
    priceMin: z.coerce.number().min(0).optional(),
    priceMax: z.coerce.number().min(0).optional(),
    verifiedOnly: z
      .string()
      .optional()
      .transform((value) => value === "true"),
    sortBy: z.enum(["nearest", "rating", "price-low", "price-high"]).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

const providerIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const listProviderReviewsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const upsertProviderReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional().default(""),
  }),
  query: z.object({}).optional(),
});

const createProviderSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    category: z.string().trim().min(2).max(80),
    bio: z.string().trim().min(10).max(1200),
    location: z.string().trim().min(2).max(120),
    billingType: z.enum(["hourly", "day"]).default("hourly"),
    priceMin: z.number().nonnegative(),
    experience: z.enum(["<1", "1-3", "3-5", "5+"]),
    hourlyRate: z.number().nonnegative(),
    skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    aadhaarNumber: z.string().trim().regex(/^\d{12}$/, "Aadhaar number must be 12 digits"),
    certificateUrl: z.string().trim().max(900000).optional().default(""),
    socialLinks: socialLinksSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const updateProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      category: z.string().trim().min(2).max(80).optional(),
      bio: z.string().trim().min(10).max(1200).optional(),
      location: z.string().trim().min(2).max(120).optional(),
      billingType: z.enum(["hourly", "day"]).optional(),
      priceMin: z.number().nonnegative().optional(),
      experience: z.enum(["<1", "1-3", "3-5", "5+"]).optional(),
      hourlyRate: z.number().nonnegative().optional(),
      skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      aadhaarNumber: z.string().trim().regex(/^\d{12}$/, "Aadhaar number must be 12 digits").optional(),
      certificateUrl: z.string().trim().max(900000).optional(),
      socialLinks: socialLinksSchema,
      isVerified: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
  query: z.object({}).optional(),
});

function normalizeValue(value) {
  return String(value || "").toLowerCase().trim();
}

function sanitizeSocialLinks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, entry]) => {
    const normalizedKey = String(key || "").trim();
    const normalizedValue = String(entry || "").trim();
    if (normalizedKey && normalizedValue) {
      accumulator[normalizedKey] = normalizedValue;
    }
    return accumulator;
  }, {});
}

function includesEveryToken(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

function scoreProviderMatch(provider, query) {
  const normalizedQuery = normalizeValue(query);
  const tokens = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);
  const name = normalizeValue(provider.name);
  const category = normalizeValue(provider.category);
  const bio = normalizeValue(provider.bio || "");
  const location = normalizeValue(provider.location || "");
  const skills = (provider.skills || []).map((skill) => normalizeValue(skill));
  const skillText = skills.join(" ");

  let score = 0;

  if (name === normalizedQuery) score += 180;
  if (name.startsWith(normalizedQuery)) score += 110;
  if (name.includes(normalizedQuery)) score += 80;
  if (category === normalizedQuery) score += 90;
  if (category.includes(normalizedQuery)) score += 55;
  if (skills.some((skill) => skill === normalizedQuery)) score += 75;
  if (skills.some((skill) => skill.includes(normalizedQuery))) score += 40;
  if (location.includes(normalizedQuery)) score += 35;
  if (bio.includes(normalizedQuery)) score += 20;

  if (tokens.length > 0) {
    if (includesEveryToken(name, tokens)) score += 55;
    if (includesEveryToken(category, tokens)) score += 40;
    if (includesEveryToken(location, tokens)) score += 25;
    if (includesEveryToken(skillText, tokens)) score += 30;

    tokens.forEach((token) => {
      if (name.includes(token)) score += 18;
      if (category.includes(token)) score += 12;
      if (location.includes(token)) score += 8;
      if (skillText.includes(token)) score += 10;
      if (bio.includes(token)) score += 4;
    });
  }

  score += Number(provider.rating || 0);
  score += provider.isVerified ? 3 : 0;

  return score;
}

async function listProviders(req, res) {
  const { category, q, location, ratingMin, priceMin, priceMax, verifiedOnly, sortBy, limit } = req.validated.query;
  const canApplyDbLimit =
    typeof limit === "number" &&
    !category &&
    !q &&
    !location &&
    typeof ratingMin !== "number" &&
    typeof priceMin !== "number" &&
    typeof priceMax !== "number" &&
    !verifiedOnly &&
    !sortBy;
  let results = await fetchProviders(canApplyDbLimit ? { limit } : undefined);

  if (category) {
    results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (location) {
    results = results.filter((p) => p.location.toLowerCase().includes(location.toLowerCase()));
  }
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.location || "").toLowerCase().includes(query) ||
        p.bio.toLowerCase().includes(query) ||
        p.skills.some((skill) => skill.toLowerCase().includes(query)),
    );
  }
  if (typeof ratingMin === "number") {
    results = results.filter((p) => (p.rating || 0) >= ratingMin);
  }
  if (typeof priceMin === "number") {
    results = results.filter((p) => (p.priceMin || 0) >= priceMin);
  }
  if (typeof priceMax === "number") {
    results = results.filter((p) => (p.priceMin || 0) <= priceMax);
  }
  if (verifiedOnly) {
    results = results.filter((p) => !!p.isVerified);
  }

  if (q && (!sortBy || sortBy === "nearest")) {
    results = [...results].sort((left, right) => {
      const scoreDifference = scoreProviderMatch(right, q) - scoreProviderMatch(left, q);
      if (scoreDifference !== 0) {
        return scoreDifference;
      }
      return (right.rating || 0) - (left.rating || 0);
    });
  } else if (sortBy === "rating") {
    results = [...results].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === "price-low") {
    results = [...results].sort((a, b) => (a.priceMin || 0) - (b.priceMin || 0));
  } else if (sortBy === "price-high") {
    results = [...results].sort((a, b) => (b.priceMin || 0) - (a.priceMin || 0));
  }

  if (typeof limit === "number" && !canApplyDbLimit) {
    results = results.slice(0, limit);
  }

  return res.json({ providers: results });
}

async function getProviderById(req, res) {
  const provider = await fetchProviderById(req.validated.params.id);
  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  const owner = provider.userId ? await getUserById(provider.userId) : null;
  const contact = owner
    ? {
        userId: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone || "",
        location: owner.location || provider.location || "",
        profileImageUrl: owner.profileImageUrl || "",
      }
    : null;

  return res.json({ provider: { ...provider, contact } });
}

async function listProviderReviews(req, res) {
  const provider = await fetchProviderById(req.validated.params.id);
  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  const reviews = await listReviewsByProvider(provider.id);
  const customerIds = [...new Set(reviews.map((review) => review.customerId).filter(Boolean))];
  const customers = await getUsersByIds(customerIds);
  const customersById = new Map(customers.map((user) => [user.id, user]));

  const enriched = reviews.map((review) => {
    const customer = customersById.get(review.customerId);
    return {
      ...review,
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
          }
        : null,
    };
  });

  return res.json({ reviews: enriched });
}

async function upsertProviderReview(req, res) {
  if (req.auth.role !== "customer") {
    return res.status(403).json({ message: "Only customers can submit ratings" });
  }

  const providerId = req.validated.params.id;
  const { rating, comment } = req.validated.body;

  const provider = await fetchProviderById(providerId);
  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  const hasCompleted = await hasCompletedBooking(providerId, req.auth.userId);
  if (!hasCompleted) {
    return res.status(403).json({ message: "You can rate only after a completed service" });
  }

  const existing = await getReviewByProviderAndCustomer(providerId, req.auth.userId);
  const isCreated = !existing;
  const review = await upsertReview({
    id: existing ? existing.id : `rev_${crypto.randomUUID()}`,
    providerId,
    customerId: req.auth.userId,
    rating,
    comment,
  });

  await recalculateProviderRating(providerId);

  return res.status(isCreated ? 201 : 200).json({ review });
}

async function createProvider(req, res) {
  const payload = req.validated.body;

  const user = await getUserById(req.auth.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  assertProviderProfileAllowed(user);

  const categoryExists = await getCategoryByName(payload.category);
  if (!categoryExists) {
    return res.status(400).json({ message: "Category does not exist" });
  }

  const existingProvider = await getProviderByUserId(user.id);
  if (existingProvider) {
    return res.status(409).json({ message: "Provider profile already exists for this user" });
  }

  const provider = await persistProvider({
    id: `prov_${crypto.randomUUID()}`,
    userId: user.id,
    name: payload.name,
    category: payload.category,
    bio: payload.bio,
    location: payload.location,
    billingType: payload.billingType || "hourly",
    priceMin: payload.priceMin,
    experience: payload.experience,
    hourlyRate: payload.hourlyRate,
    skills: payload.skills,
    aadhaarNumber: payload.aadhaarNumber,
    certificateUrl: payload.certificateUrl || "",
    socialLinks: sanitizeSocialLinks(payload.socialLinks),
    applicationStatus: "pending",
    verificationNotes: "",
    isVerified: false,
  });

  return res.status(201).json({ provider });
}

async function updateProvider(req, res) {
  const { id } = req.validated.params;
  const updates = { ...req.validated.body };

  const found = await fetchProviderById(id);
  if (!found) {
    return res.status(404).json({ message: "Provider not found" });
  }

  const isOwner = found.userId === req.auth.userId;
  const isAdmin = req.auth.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!isAdmin) {
    delete updates.isVerified;
  }

  if (updates.socialLinks !== undefined) {
    updates.socialLinks = sanitizeSocialLinks(updates.socialLinks);
  }

  if (updates.category) {
    const categoryExists = await getCategoryByName(updates.category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Category does not exist" });
    }
  }

  const provider = await persistProviderUpdate(id, updates);

  return res.json({ provider });
}

module.exports = {
  listProviders,
  getProviderById,
  listProviderReviews,
  upsertProviderReview,
  createProvider,
  updateProvider,
  listProvidersSchema,
  providerIdSchema,
  listProviderReviewsSchema,
  upsertProviderReviewSchema,
  createProviderSchema,
  updateProviderSchema,
};
