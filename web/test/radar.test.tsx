import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider } from "../src/lib/app-context";
import { RadarPage } from "../src/pages/Radar";
import { RadarButton } from "../src/components/RadarButton";
import { radarPatternText } from "../src/lib/i18n";
import { RADAR_PATTERNS } from "@secondlook/shared";

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  increment: (n: number) => ({ __increment: n }),
  serverTimestamp: () => ({ __serverTimestamp: true }),
  setDoc: vi.fn(async () => undefined),
}));

afterEach(() => vi.clearAllMocks());

describe("radar report payload", () => {
  it("writes only the week, the type of scam, the region and +1: never message text", async () => {
    const fs = await import("firebase/firestore");
    const { reportToRadar } = await import("../src/lib/radar");
    await reportToRadar({} as never, "2026-W48", "digital_arrest", "KL");
    const [ref, data, opts] = (fs.setDoc as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(ref).toEqual({ path: "radar/2026-W48_digital_arrest_KL" });
    expect(Object.keys(data as object).sort()).toEqual(["count", "pattern", "region", "updatedAt", "week"]);
    expect((data as { count: unknown }).count).toEqual({ __increment: 1 });
    expect(opts).toEqual({ merge: true });
  });
});

describe("radar UI without Firebase", () => {
  it("the page explains it needs the online part, and the button stays hidden", () => {
    render(<AppProvider><RadarPage /><RadarButton level="high" ids={["video_custody"]} /></AppProvider>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Scam radar");
    expect(screen.getByText(/needs the internet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to the scam radar/ })).toBeNull();
  });

  it("has a name for every pattern in every language", () => {
    for (const p of RADAR_PATTERNS) for (const l of ["en", "hi", "ml"] as const) expect(radarPatternText(p, l).length).toBeGreaterThan(3);
  });
});
