# LocalLink Backend

Secure JavaScript backend for LocalLink using Express.

## Features
- JWT auth with access + refresh flow
- Password hashing with bcrypt
- Refresh token rotation and hash storage
- Helmet, CORS, HPP, rate limiting
- Request validation with Zod
- PostgreSQL persistence (`pg`)

## Run
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` (or `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`).
3. Set `PGSSLMODE=require` for managed Postgres services (for example Render).
4. Optional strict TLS verification: `PGSSL_REJECT_UNAUTHORIZED=true`.
5. Ensure PostgreSQL is running and database/user are created.
6. Install dependencies: `npm install`
7. Start dev server: `npm run dev`
8. Validate DB connectivity + SSL: `npm run validate:db`

Base URL: `http://localhost:4000/api/v1`

## Main Routes
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/register` with `type=admin` requires header `x-admin-bootstrap-key`
- `POST /auth/refresh`
- `POST /auth/logout`
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
