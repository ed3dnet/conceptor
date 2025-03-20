import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// export BASE_URL="http://${WORKING_HOSTNAME}:${FRONTDOOR_PORT}"
const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error("BASE_URL is not set");
}

const allowedHosts = [new URL(baseUrl).host.split(":")[0]];
export default defineConfig({
  server: {
    allowedHosts,
    // @ts-expect-error it's OK if this explodes
    port: parseInt(process.env.PANEL_PORT, 10),
  },
  plugins: [react(), tailwindcss()],
});
