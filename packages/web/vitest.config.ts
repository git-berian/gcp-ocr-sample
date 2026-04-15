import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        define: {
          __USE_EMULATOR__: false,
        },
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["src/test-setup.ts"],
        },
      },
      {
        define: {
          __USE_EMULATOR__: false,
        },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["src/test-setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/test-setup.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
