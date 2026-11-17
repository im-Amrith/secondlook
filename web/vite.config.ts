/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// Tests run in Node, where @firebase/ai would resolve to its Node build (no on-device adapter at all).
// Point it at the browser build so tests exercise the same code paths as Chrome.
const firebaseAiBrowser = join(dirname(require.resolve("@firebase/ai/package.json")), "dist/esm/index.esm.js");

export default defineConfig({
  plugins: [react()],
  // One copy of ONNX Runtime Web; Vite bundles its WASM.
  resolve: { dedupe: ["onnxruntime-web", "onnxruntime-common"] },
  worker: { format: "es" },
  build: { target: "es2022", sourcemap: true },
  // Lets the extension banner demo run locally: map this host to 127.0.0.1 (see DEMO.md).
  server: { allowedHosts: ["secure-kyc-update.top"] },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    alias: [{ find: /^firebase\/ai$/, replacement: firebaseAiBrowser }],
    // Firestore rules tests need the emulator: run them with `npm run test:rules` at the root.
    exclude: [...configDefaults.exclude, "rules-test/**"],
  },
});
