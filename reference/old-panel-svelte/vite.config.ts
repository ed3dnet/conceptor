import { sveltekit } from "@sveltejs/kit/vite";
import GetEnv from "node-getenv";
import { defineConfig as defineViteConfig, mergeConfig } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";

const panelBaseUrl = GetEnv.requireStr("PANEL_BASE_URL");
const apiBaseUrl = GetEnv.requireStr("PANEL_API_BASE_URL");
const port = GetEnv.requireNum("PANEL_PORT");

// Parse the hostname from PANEL_BASE_URL
const hmrHostname = new URL(panelBaseUrl).hostname;

const hmr = {
  protocol: "wss",
  host: hmrHostname,
  port,
  clientPort: 443,
};

const vitest = defineVitestConfig({
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});

export const vite = defineViteConfig({
  plugins: [sveltekit()],

  server: {
    strictPort: true,
    host: true,

    port,
    open: false,
    // hmr: false,
    hmr,
    cors: true,
  },
});

export default mergeConfig(vite, vitest);
