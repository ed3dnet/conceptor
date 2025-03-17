import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { sveltekit } from '@sveltejs/kit/vite';
import GetEnv from "node-getenv";
import { defineConfig } from 'vite';

// Environment configuration
const panelBaseUrl = GetEnv.requireStr("PANEL_URLS__PANEL_BASE_URL");
const port = GetEnv.requireNum("PANEL_PORT");

// Parse the hostname from PANEL_BASE_URL
const hmrHostname = new URL(panelBaseUrl).hostname;

export default defineConfig({
    plugins: [sveltekit(), tailwindcss()],

    server: {
        strictPort: true,
        host: "0.0.0.0",
        port,
        open: false,
        hmr: {
            protocol: "wss",
            host: hmrHostname,
            port,
            clientPort: 443,
        },
        cors: true,
    },

    test: {
        workspace: [{
            extends: "./vite.config.ts",
            plugins: [svelteTesting()],

            test: {
                name: "client",
                environment: "jsdom",
                clearMocks: true,
                include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
                exclude: ['src/lib/server/**'],
                setupFiles: ['./vitest-setup-client.ts']
            }
        }, {
            extends: "./vite.config.ts",

            test: {
                name: "server",
                environment: "node",
                include: ['src/**/*.{test,spec}.{js,ts}'],
                exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
            }
        }]
    }
});
