const SITE_SEARCH_ENTRIES = [
  {
    id: "home",
    title: "Home",
    description: "Start a search for electricians, plumbers, cleaners, tutors, and other local services.",
    route: "/",
    type: "Page",
    keywords: ["home", "search", "local services", "providers", "service provider", "location"],
  },
  {
    id: "categories",
    title: "Service Categories",
    description: "Browse all service categories and discover available providers in each service area.",
    route: "/categories",
    type: "Category Hub",
    keywords: ["categories", "services", "browse services", "electrician", "plumber", "cleaner", "tailor"],
  },
  {
    id: "providers",
    title: "All Service Providers",
    description: "Search and compare service providers by service, provider name, skills, and location.",
    route: "/providers",
    type: "Provider Hub",
    keywords: ["providers", "search provider", "exact provider", "location", "skills", "verified providers"],
  },
  {
    id: "how-it-works",
    title: "How It Works",
    description: "Learn how LocalLink helps customers search, compare, and book trusted providers.",
    route: "/how-it-works",
    type: "Guide",
    keywords: ["how it works", "booking", "compare providers", "trusted providers"],
  },
  {
    id: "about",
    title: "About LocalLink",
    description: "Read LocalLink's mission, story, community focus, and provider verification values.",
    route: "/about",
    type: "Page",
    keywords: ["about", "mission", "story", "community", "trusted providers", "verification"],
  },
  {
    id: "faqs",
    title: "FAQs",
    description: "Answers about finding providers, bookings, reviews, payments, and service availability.",
    route: "/faqs",
    type: "Help",
    keywords: ["faq", "questions", "find provider", "book service", "reviews", "payments"],
  },
  {
    id: "help-center",
    title: "Help Center",
    description: "Search help topics for finding providers, communication, pricing, and account support.",
    route: "/help-center",
    type: "Help",
    keywords: ["help", "support", "finding providers", "pricing", "account", "communication"],
  },
  {
    id: "contact",
    title: "Contact",
    description: "Reach the LocalLink support team for questions, issues, and feedback.",
    route: "/contact",
    type: "Support",
    keywords: ["contact", "support", "feedback", "help"],
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Review plans, provider visibility options, and platform pricing details.",
    route: "/pricing",
    type: "Page",
    keywords: ["pricing", "plans", "provider visibility", "search placement"],
  },
  {
    id: "learn-more",
    title: "Learn More",
    description: "Explore trust, support, communication, and provider experience details for the platform.",
    route: "/learn-more",
    type: "Guide",
    keywords: ["learn more", "trust", "provider experience", "customer experience"],
  },
  {
    id: "register-provider",
    title: "Register Provider",
    description: "Create a provider profile with service category, skills, pricing, and location details.",
    route: "/register-provider",
    type: "Provider Action",
    keywords: ["register provider", "provider profile", "skills", "pricing", "location"],
  },
  {
    id: "hurry-mode-demo",
    title: "Hurry Mode Demo",
    description: "Understand urgent job broadcast flows and fast provider response handling.",
    route: "/hurry-mode-demo",
    type: "Feature",
    keywords: ["hurry mode", "urgent job", "nearby providers", "instant response"],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "See how account data, location details, messages, and platform information are handled.",
    route: "/privacy",
    type: "Policy",
    keywords: ["privacy", "data", "location", "messages", "account information"],
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    description: "Understand platform rules for customers, providers, bookings, and service responsibilities.",
    route: "/terms",
    type: "Policy",
    keywords: ["terms", "conditions", "providers", "customers", "bookings"],
  },
];

export function normalizeSearchText(value = "") {
  return String(value).toLowerCase().trim();
}

export function tokenizeSearchQuery(value = "") {
  return normalizeSearchText(value).split(/[^a-z0-9]+/).filter(Boolean);
}

export function matchesSearchQuery(fields = [], query = "") {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) {
    return false;
  }

  const haystack = fields
    .flatMap((field) => (Array.isArray(field) ? field : [field]))
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

function scoreSiteEntry(entry, query) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenizeSearchQuery(query);
  const title = normalizeSearchText(entry.title);
  const description = normalizeSearchText(entry.description);
  const keywords = entry.keywords.map((keyword) => normalizeSearchText(keyword));
  const keywordText = keywords.join(" ");

  let score = 0;

  if (title === normalizedQuery) score += 120;
  if (title.startsWith(normalizedQuery)) score += 80;
  if (title.includes(normalizedQuery)) score += 45;
  if (keywords.some((keyword) => keyword === normalizedQuery)) score += 65;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) score += 35;
  if (description.includes(normalizedQuery)) score += 20;

  tokens.forEach((token) => {
    if (title.includes(token)) score += 18;
    if (keywordText.includes(token)) score += 14;
    if (description.includes(token)) score += 8;
  });

  return score;
}

export function filterSiteSearchEntries(query = "") {
  return SITE_SEARCH_ENTRIES.map((entry) => ({
    ...entry,
    score: scoreSiteEntry(entry, query),
  }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}

export { SITE_SEARCH_ENTRIES };
