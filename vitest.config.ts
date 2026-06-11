import { defineConfig } from "vitest/config";

const coverageInclude = [
  "server/api/**/*.ts",
  "server/utils/**/*.ts",
  "utils/**/*.ts",
  "composables/**/*.ts",
  "plugins/**/*.ts",
  "public/sw.js",
];

export default defineConfig({
  test: {
    coverage: {
      all: true,
      clean: true,
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        ".nuxt/**",
        ".output/**",
        "coverage/**",
        "server/db/**",
        "tests/**",
      ],
      include: coverageInclude,
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: {
        branches: 20,
        functions: 40,
        lines: 30,
        statements: 30,
      },
    },
    environment: "node",
    unstubGlobals: true,
  },
});
