# LocalLink is a modern web platform for discovering and connecting with trusted local service providers in your area.

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

Production checklist
- Do NOT commit secrets. Remove any existing secret values from example files and rotate exposed credentials.
- Provide these env vars in your production environment: `ACCESS_TOKEN_SECRET`, `DATABASE_URL` (or `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`/`PGPORT`), `FRONTEND_URL`, `CORS_ORIGINS`, and `VITE_API_BASE_URL` (for frontend).
- Ensure `ACCESS_TOKEN_SECRET` is a strong random value (>=32 chars).
- Configure CORS and cookie settings for cross-origin deployments: backend sets `credentials: true` and uses `sameSite:none` + `secure` cookies in production — your `CORS_ORIGINS` must include your frontend origin.
 - Configure CORS and cookie settings for cross-origin deployments: backend sets `credentials: true` and uses `sameSite:none` + `secure` cookies in production — your `CORS_ORIGINS` must include your frontend origin.
 - Session & tokens note: the project uses server-side sessions instead of storing long-lived refresh tokens on the client. The backend sets an httpOnly session cookie named `ll_session` (server session id) and a short-lived access cookie `ll_access` (JWT). The `/auth/refresh` endpoint expects the `ll_session` cookie to extend the server session and issue a new `ll_access` token. There is no client-side refresh token secret required in production.
- Update frontend build config: set `VITE_API_BASE_URL` to your backend API base (for example `https://api.example.com/api/v1`) and set Vite `base` when hosting on GitHub Pages or another subpath.
- Remove or disable dev-only proxies (see `frontend/vite.config.js` `server.proxy`) in production builds.

Follow `backend/README.md` for backend-specific env guidance.

Technology & Deployment (Vercel frontend + Render backend)
-------------------------------------------------------

This project is intended to be deployed as a static frontend (Vercel) and a persistent Node backend (Render) with Neon as the managed Postgres database. The short, practical deployment recipe below matches that setup and ensures cookies, CORS, and DB connectivity work correctly.

1) Neon (Postgres)
- Provision a Neon Postgres project and copy the *pooler* connection string (the postgres:// URL Neon provides). Use this as `DATABASE_URL` for the backend.

2) Backend (Render)
- Service type: Web Service (runs a persistent Node process). Point Render to the `backend/` folder in this repo.
- Build command: `npm install`
- Start command: `npm start` (server uses `src/server.js`)
- Required environment variables (Render dashboard → Environment):
	- `DATABASE_URL` = neon pooler URL (postgres://...)
	- `ACCESS_TOKEN_SECRET` = strong random string (>= 32 chars)
	- `NODE_ENV` = `production`
	- `CORS_ORIGINS` = comma-separated allowed frontend origins (e.g. `https://your-frontend.vercel.app`)
	- `FRONTEND_URL` = your Vercel frontend URL (optional but helpful for email/reset links)
	- Optional DB SSL settings: `PGSSLMODE=require` and `PGSSL_REJECT_UNAUTHORIZED=false` (Neon pooler usually works without additional flags, but these are available if needed)
- Health check: the app exposes a health endpoint at `/api/v1/health`. Example: `https://<your-render-host>/api/v1/health`.

3) Frontend (Vercel)
- Project root: `frontend/` in this repo.
- Build command: `npm run build` (Vite). Output directory: `dist`.
- Environment variables (Vercel → Project → Settings → Environment Variables):
	- `VITE_API_BASE_URL` = `https://<your-backend>/api/v1` (example: `https://new-locallink.onrender.com/api/v1`)
	- Add any other runtime flags you rely on (example: `PUBLIC_ANALYTICS_KEY` if used).
- Ensure your Vercel production domain is included in the backend `CORS_ORIGINS` and that cookies work cross-site (`sameSite=none` and `secure=true` are used in production in the backend).

4) Verification & smoke tests
- Health: `GET https://<your-backend>/api/v1/health` should return `{ status: "ok", databaseReady: true, databaseError: null, timestamp: "..." }` when healthy.
- Logs: check Render logs for server start and DB bootstrap messages. Look for:
	- `LocalLink backend listening on http://localhost:4000`
	- `DB initialization complete`
- Frontend: open your Vercel URL, try public pages, then try login/register flows to confirm cookies are set and subsequent requests include them.

5) Security & production tips
- Never commit secrets. Use Render/Vercel secret stores.
- Rotate secrets if accidentally committed.
- Use a monitoring/logging provider (Sentry, LogDNA, Render logs) and configure Neon backups.

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
