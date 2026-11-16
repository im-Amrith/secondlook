/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const here = import.meta.dirname;
const envDir = resolve(here, "../web");

/**
 * Writes manifest.json from manifest.base.json. Google sign-in (chrome.identity) is added only when
 * VITE_GOOGLE_OAUTH_CLIENT_ID is set; VITE_EXTENSION_KEY pins the extension id for that OAuth client.
 */
function manifest(mode: string): Plugin {
  return {
    name: "secondlook-manifest",
    generateBundle() {
      const env = loadEnv(mode, envDir, "VITE_");
      const m = JSON.parse(readFileSync(resolve(here, "manifest.base.json"), "utf8"));
      if (env.VITE_GOOGLE_OAUTH_CLIENT_ID) {
        m.permissions.push("identity");
        m.oauth2 = { client_id: env.VITE_GOOGLE_OAUTH_CLIENT_ID, scopes: ["openid", "email", "profile"] };
      }
      if (env.VITE_EXTENSION_KEY) m.key = env.VITE_EXTENSION_KEY;
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(m, null, 2) });
    },
  };
}

// Plain Vite multi-entry build (no CRXJS): the side panel page and the service worker.
// The content script is built separately as a single IIFE (vite.content.config.ts),
// because content scripts can't be ES modules.
export default defineConfig(({ mode }) => ({
  plugins: [react(), manifest(mode)],
  // Share web/.env.local so one Firebase config drives both the web app and the extension.
  envDir,
  define: {
    // reCAPTCHA can't load in an extension (remote code), so compile that provider out. App Check
    // in the extension uses the debug provider: register the token printed in the side panel's console.
    // (A production extension would need a custom App Check provider; see MORNING.md.)
    "import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY": JSON.stringify(""),
    "import.meta.env.VITE_APPCHECK_DEBUG": JSON.stringify("true"),
  },
  resolve: {
    alias: [
      // MV3: no remote code or popups. Use Firebase Auth's web-extension build and chrome.identity sign-in.
      { find: /^firebase\/auth$/, replacement: "firebase/auth/web-extension" },
      { find: /^#signin$/, replacement: resolve(here, "src/signin-chrome.ts") },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    modulePreload: false,
    rolldownOptions: {
      input: {
        sidepanel: resolve(here, "sidepanel.html"),
        background: resolve(here, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js"),
      },
    },
  },
  test: { environment: "jsdom" },
}));
