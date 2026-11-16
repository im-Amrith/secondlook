/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "es2022", sourcemap: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    // Firestore rules tests need the emulator: run them with `npm run test:rules` at the root.
    exclude: [...configDefaults.exclude, "rules-test/**"],
  },
});
