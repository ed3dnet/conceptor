import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // this is only used in development mode, not production, so
    // allowedHosts filtering isn't important here like it would be
    // for an app with a SSR component, like SvelteKit.
    allowedHosts: true,
    // @ts-expect-error it's OK if this explodes
    port: parseInt(process.env.PANEL_PORT, 10),
  },
  plugins: [react(), tailwindcss()],
});
