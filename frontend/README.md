# LocalLink Frontend

React + Vite client for LocalLink.

## Run
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:8080`

## Build
- Production build: `npm run build`
- Preview build locally: `npm run preview`
- Lint: `npm run lint`

## Notes
- API requests to `/api` are proxied to the backend at `http://localhost:4000` during local development.
- Static production output is written to `dist/`.
- The frontend is written in JavaScript and uses React Router, Tailwind CSS, and Radix UI components.
