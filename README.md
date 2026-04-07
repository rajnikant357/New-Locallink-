# LocalLink is a lightweight, privacy-first marketplace platform and toolkit that helps local gig workers connect with customers, manage bookings, and get paid — without the overhead of large platforms. It combines a fast React + Vite frontend with an Express + PostgreSQL backend, and ships a focused set of features (search, provider profiles, bookings, messaging, notifications, preferences, and admin tools) designed for real-world, local service discovery and coordination.

About this project
- Purpose: build a practical, deployable marketplace for local services that puts control back in the hands of service providers and small businesses. LocalLink is intentionally simple to operate and easy to host, so community groups, co-ops, and small teams can run their own marketplace with transparent rules and low fees.
- Scope: customer search and discovery, provider profiles, booking flows, messages, notifications, basic admin and preference management, and realtime support for urgent/hurry requests.
- Architecture: single-repo monorepo split into `frontend/` (React + Vite) and `backend/` (Express + Node), persisting data in PostgreSQL and following small-service, modular patterns so the app is easy to customize and extend.

Tools, libraries, and infrastructure used
- Frontend
	- React (component-driven UI)
	- Vite (fast dev & build)
	- Tailwind CSS (utility-first styling)
	- @radix-ui primitives (accessible UI primitives)
	- Lucide icons, sonner/toast libraries for UX
- Backend
	- Node.js + Express (API server)
	- PostgreSQL (relational data store)
	- pg (Postgres client)
	- Helmet, CORS, rate-limiter, morgan, cookie-parser (security & ops)
- Dev & build
	- npm, vite, gh-pages for deploy previews
	- Docker (optional) for quick Postgres/dev environments
- Testing & QA
	- Local manual testing with dev server proxying and rate-limited endpoints
- Productivity & workflow
	- Git for version control, simple scripts to start backend/frontend

How AI and tools helped build this project
- GitHub Copilot: suggested small code snippets, component patterns, and helped speed up repetitive code (boilerplate CRUD, typed form handlers, and test scaffolding).
- OpenAI Codex / ChatGPT: used for design brainstorming, drafting API contract ideas, writing documentation drafts, and troubleshooting tricky error messages during local setup.
- Other resources: official library docs (React, Tailwind, Postgres), Stack Overflow for edge-case debugging, and community articles for deployment patterns.

Development timeline (example)
- Idea → prototype UI & API: 2–3 weeks
- Core features (search, provider profiles, bookings, basic messages): 4–6 weeks
- Realtime/hurry flow, notifications, preferences, admin tools: 2–4 weeks
- Polish, accessibility, and small fixes: 1–2 weeks
Total (solo/part-time): ~2–3 months. (Adjust this to reflect actual time spent.)

A short origin story
It started with a simple frustration: existing gig marketplaces priced small independent providers out, buried community information, and often made it difficult for local vendors to keep control of their customer relationships. The seed idea for LocalLink grew at a kitchen table conversation: what if a community could host a minimal, secure marketplace tailored to its local needs — one that prioritized trust, direct bookings, and predictable fees?

A prototype was sketched, a small React UI wired to a tiny Express API, and then iterated in the open. Early testing with a handful of local providers revealed the most important real-world needs: clear service descriptions, rapid booking confirmations, and an easy way to update availability. Every new feature was introduced with those priorities in mind.

How LocalLink can change gig workers’ lives
- More control: Providers keep direct communication with customers and own their listings and data, avoiding opaque platform rules and hidden fee structures.
- Fairer economics: A small, community-run platform can charge lower fees or none at all, allowing more revenue to reach the worker.
- Visibility for local talent: Search and curated categories help small providers be discovered by nearby customers who actually want their services.
- Reduced dependency: With a straightforward deployment model, local councils, co-ops, and community groups can operate their own marketplaces without vendor lock-in.
- Real-world safety: Built-in verification, messaging, and admin tools help providers manage disputes, scheduling, and safety more effectively.

Notes on deployment & next steps
- Quick dev setup: run the backend (see `backend/.env.example`) and the frontend dev server (Vite). For production, host the backend on a reliable Node host and use managed Postgres or a well-maintained self-hosted instance.


# LocalLink Monorepo

This repository is now split into:

- `frontend/` - React + Vite client (JavaScript)
- `backend/` - Express API server (JavaScript)

## Quick Start

Prerequisite: PostgreSQL must be running and reachable from `backend/.env`.

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:8080` and proxies `/api` to backend `http://localhost:4000`.

- Extendability: the codebase is modular — adding payments, internationalization, or advanced reviews is straightforward.
- Community adoption: the real impact comes when local groups tailor LocalLink to their norms (pricing, vetting, dispute resolution) and promote it as a community-first marketplace.


Acknowledgements
- Libraries and open-source projects used throughout this repo.
- AI assistants (GitHub Copilot, Codex, ChatGPT) that helped accelerate design, debugging, and documentation — used as coding assistants and brainstorming partners, not as replacements for careful review.
- Documentation, blog posts, and community examples that inspired design and implementation decisions.
