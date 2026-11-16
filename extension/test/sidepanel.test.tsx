import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

describe("side panel", () => {
  it("checks the text queued by the right-click menu, using the shared web UI", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const pending = { id: 1, kind: "text", text: "This is CBI. You are under digital arrest. Stay on the video call and do not tell your family. Pay now." };
    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        session: { get: vi.fn(async () => ({ pendingCheck: pending })) },
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    };
    await import("../src/sidepanel");
    await waitFor(() => expect(screen.getByRole("heading", { name: /looks like a scam/i })).toBeInTheDocument(), { timeout: 3000 });
    // No Firebase config in tests → rules only, and the badge says so.
    expect(screen.getAllByRole("status").some((el) => /Quick check/.test(el.textContent ?? ""))).toBe(true);
    expect(screen.getByRole("navigation", { name: "Panel" })).toBeInTheDocument();
  });
});
