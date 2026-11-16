import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// No test may reach the network. Tests that need fetch stub it themselves.
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
    throw new Error(`Network access in tests is not allowed: ${String(url)}`);
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
