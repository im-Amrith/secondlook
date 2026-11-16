import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider } from "../src/lib/app-context";
import { HowPage } from "../src/pages/How";

describe("How it works page", () => {
  it("shows the live routing table for this device (no AI configured → quick checks)", () => {
    render(<AppProvider><HowPage /></AppProvider>);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(7);
    for (const r of rows) expect(r).toHaveAttribute("data-route", "rules");
    expect(screen.getByText("Not set up")).toBeInTheDocument();
  });
  it("shows device and cloud routes when Nano and the cloud are available", () => {
    const device = { run: async () => ({ text: "", source: "ON_DEVICE" as const }), initialize: async () => undefined };
    render(<AppProvider override={{ device, nano: "available", aiConfigured: true }}><HowPage /></AppProvider>);
    const routes = screen.getAllByRole("row").slice(1).map((r) => r.getAttribute("data-route"));
    expect(routes).toEqual(["device", "device", "cloud", "device", "cloud", "cloud", "device"]);
  });
});
