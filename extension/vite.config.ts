/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Plain Vite multi-entry build (no CRXJS): the side panel page and the service worker.
// The content script is built separately as a single IIFE (vite.content.config.ts),
// because content scripts can't be ES modules.
export default defineConfig({
  plugins: [react()],
  // Share web/.env.local so one Firebase config drives both the web app and the extension.
  envDir: resolve(import.meta.dirname, "../web"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    modulePreload: false,
    rolldownOptions: {
      input: {
        sidepanel: resolve(import.meta.dirname, "sidepanel.html"),
        background: resolve(import.meta.dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js"),
      },
    },
  },
  test: { environment: "jsdom" },
});
