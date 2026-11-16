import { defineConfig } from "vitest/config";

// Firestore security rules tests (need the emulator; see `npm run test:rules` at the root).
export default defineConfig({
  test: { include: ["rules-test/**/*.test.ts"], environment: "node", testTimeout: 20000, hookTimeout: 30000 },
});
