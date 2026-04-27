# LocalLink Backend

Secure JavaScript backend for LocalLink using Express.

## Features
- JWT access tokens plus server-side session store (no client-stored refresh tokens)
- Password hashing with bcrypt
- Helmet, CORS, HPP, rate limiting
- Request validation with Zod
- PostgreSQL persistence (`pg`)

## Run
1. Copy `.env.example` to `.env` for local development.
2. In production, provide secrets via your host/CI secrets (DO NOT store secrets in the repo).

Required production env vars (examples):

- `ACCESS_TOKEN_SECRET` — strong random secret (>=32 chars)
- `DATABASE_URL` or `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`/`PGPORT`
- `FRONTEND_URL` — URL of your frontend (used for password reset links)
- `CORS_ORIGINS` — comma-separated allowed origins for CORS (e.g. `https://app.example.com`)
- `NODE_ENV=production` and `PORT` as needed

Note: this project previously used client-side refresh tokens; that mechanism has been removed. The backend now maintains short-lived access tokens (cookie name `ll_access`) together with a server-side session identified by an httpOnly cookie (`ll_session`). The `/auth/refresh` endpoint accepts the `ll_session` cookie, extends the server session, and issues a new access token. There is no long-lived refresh token stored on the client or in the database.

Optional/operational env vars:

- `PGSSLMODE` / `PGSSL_REJECT_UNAUTHORIZED` — TLS config for Postgres
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`
- `ACCESS_TOKEN_EXPIRES_IN`

Local dev quickstart:
1. Copy `.env.example` to `.env` and update values for local Postgres.
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Validate DB connectivity + SSL: `npm run validate:db`

Note: the server enforces strong token secrets in production. If `NODE_ENV=production`
and token secrets look like placeholders, the server will refuse to start — this is intentional.

Base URL: `http://localhost:4000/api/v1`

## Main Routes
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/register` with `type=admin` requires header `x-admin-bootstrap-key`
- `POST /auth/refresh` (server-side session refresh — requires `ll_session` cookie)
- `POST /auth/logout` (revokes server session and clears `ll_session` + `ll_access` cookies)
- `GET /auth/me`
- `GET /users/me`
- `PATCH /users/me`
- `GET /categories`
- `POST /categories` (admin)
- `PATCH /categories/:id` (admin)
- `DELETE /categories/:id` (admin)
- `GET /providers`
- `POST /providers`
- `GET /bookings/me`
- `POST /bookings`
- `PATCH /bookings/:id/status`
- `GET /messages/conversations/me`
- `GET /messages/:withUserId`
- `POST /messages`
- `GET /notifications/me`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `GET /admin/overview`
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `GET /admin/providers`
- `PATCH /admin/providers/:id`
- `GET /admin/bookings`
