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
          const region = process.env.FUNCTIONS_REGION;
          if (projectId && region) {
            return path.replace(/^\/api/, `/${projectId}/${region}`);
          }
          return path.replace(/^\/api/, "");
        },
      },
    },
  },
});
