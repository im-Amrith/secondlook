import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider } from "../src/lib/app-context";
import { CheckPage } from "../src/pages/Check";

describe("Check page with no Firebase config (rules-only mode)", () => {
  it("shows the AI-not-configured notice and still gives a verdict", async () => {
    render(
      <AppProvider>
        <CheckPage />
      </AppProvider>,
    );
    expect(screen.getByRole("note")).toHaveTextContent("AI not configured");
    await userEvent.click(screen.getByRole("button", { name: /CBI officer/ }));
    await userEvent.click(screen.getByRole("button", { name: /check this message/i }));
    expect(await screen.findByRole("heading", { name: /looks like a scam/i })).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((el) => /Quick check/.test(el.textContent ?? ""))).toBe(true);
  });
});
