// Automated accessibility checks (axe-core) on the main screens. jsdom can't compute colour
// contrast, so that rule is off here; contrast was checked by eye in light and dark mode.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { AppProvider } from "../src/lib/app-context";
import { App } from "../src/App";
import { CheckPage } from "../src/pages/Check";
import { SetupPage } from "../src/pages/Setup";
import { SettingsPage } from "../src/pages/Settings";
import { HowPage } from "../src/pages/How";

async function violations(container: Element) {
  const res = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

describe("accessibility (axe)", () => {
  it("app shell + onboarding has no violations", async () => {
    const { container } = render(<AppProvider><App /></AppProvider>);
    expect(await violations(container)).toEqual([]);
  });

  it("check screen with a result and follow-up has no violations", async () => {
    const { container } = render(<AppProvider><main><CheckPage /></main></AppProvider>);
    await userEvent.click(screen.getByRole("button", { name: /CBI officer/ }));
    await userEvent.click(screen.getByRole("button", { name: /check this message/i }));
    await screen.findByRole("heading", { name: /looks like a scam/i });
    expect(await violations(container)).toEqual([]);
  });

  it("setup, settings and privacy pages have no violations", async () => {
    for (const Page of [SetupPage, SettingsPage, HowPage]) {
      const { container, unmount } = render(<AppProvider><main><Page /></main></AppProvider>);
      expect(await violations(container)).toEqual([]);
      unmount();
    }
  });
});
