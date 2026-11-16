import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "es2022",
    lib: {
      entry: resolve(import.meta.dirname, "src/content.ts"),
      name: "SecondLookContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});
