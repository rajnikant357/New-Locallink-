import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  // Note: `server.proxy` applies to the Vite dev server only. For production
  // builds set `VITE_API_BASE_URL` to your API base (for example
  // `https://api.example.com/api/v1`) and set `base` as needed for hosting
  // on GH Pages or subpaths.
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
