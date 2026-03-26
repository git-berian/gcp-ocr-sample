import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => {
          const projectId = process.env.GCP_PROJECT_ID;
          if (projectId) {
            return path.replace(/^\/api/, `/${projectId}/asia-northeast1`);
          }
          return path.replace(/^\/api/, "");
        },
      },
    },
  },
});
