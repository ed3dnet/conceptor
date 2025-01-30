import { defineConfig } from "vitest/config";

export const BASE_VITEST_CONFIG = defineConfig({
  test: {
    globals: true,
    root: "./src",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      clean: true,
      cleanOnRerun: true,
      reportsDirectory: "coverage",
      ignoreEmptyLines: true,
      exclude: [],
    },
    exclude: ["dist/**/*", "src/integration-tests/**/*"],
  },
});
