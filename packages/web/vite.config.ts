import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  define: {
    __USE_EMULATOR__: command === "serve" && !isPreview,
  },
}));
