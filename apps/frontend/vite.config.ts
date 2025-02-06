import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],

  server: {
    port: process.env.FRONTEND_PORT
      ? parseInt(process.env.FRONTEND_PORT)
      : 46969,
    strictPort: true,
  },

  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
