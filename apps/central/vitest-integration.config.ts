import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Enable global test APIs like describe, it, expect
    globals: true,

    // Set the root directory for tests
    root: "./src",

    // Configure test file matching pattern
    include: ["**/*.integration-test.ts"],

    // Enable coverage reporting using v8
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/types/**",
      ],
    },

    // Additional recommended settings
    environment: "node",

    // Helpful reporting options
    reporters: ["default"],
    outputFile: "./test-results-integration.json",
  },
});
