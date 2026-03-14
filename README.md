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

## Admin Bootstrap
- Set `ADMIN_BOOTSTRAP_KEY` in `backend/.env`.
- Register an admin once via API:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "x-admin-bootstrap-key: <your_key>" \
  -d "{\"name\":\"Admin\",\"email\":\"admin@example.com\",\"password\":\"Admin@12345\",\"type\":\"admin\"}"
```
- Sign in with this account and open `/admin`.
