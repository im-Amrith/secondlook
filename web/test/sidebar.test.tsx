import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider } from "../src/lib/app-context";
import { CheckPage } from "../src/pages/Check";
import { DEFAULT_SETTINGS, saveSettings } from "../src/lib/settings";

describe("check screen side column", () => {
  it("shows what protects you and one-tap tools", () => {
    saveSettings({ ...DEFAULT_SETTINGS, onboarded: true, neverCloud: true });
    render(<AppProvider><CheckPage /></AppProvider>);
    const side = screen.getByRole("complementary", { name: "More ways to stay safe" });
    expect(side).toHaveTextContent("Your protection");
    expect(side).toHaveTextContent("Off. Checks stay on this device.");
    expect(screen.getByRole("link", { name: /About to pay someone/ })).toHaveAttribute("href", "#/pause");
    expect(screen.getByRole("link", { name: /Cyber crime helpline/ })).toHaveAttribute("href", "tel:1930");
    saveSettings(DEFAULT_SETTINGS);
  });

  it("stays out of the compact extension view", () => {
    render(<AppProvider><CheckPage compact /></AppProvider>);
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});
