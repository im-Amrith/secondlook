import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { checkMessage, type CheckOutcome } from "@secondlook/shared";
import { PrivacyBadge } from "../src/components/PrivacyBadge";
import { ResultCard } from "../src/components/ResultCard";

describe("PrivacyBadge", () => {
  it("shows the on-device badge", () => {
    render(<PrivacyBadge source="ON_DEVICE" redactions={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Checked on this device");
    expect(screen.getByRole("status")).toHaveTextContent("Nothing was sent anywhere");
  });
  it("shows the cloud badge with counts of what was removed", () => {
    render(<PrivacyBadge source="IN_CLOUD" redactions={[{ type: "PHONE", count: 3 }, { type: "ACCOUNT", count: 1 }, { type: "NAME", count: 2 }]} />);
    expect(screen.getByRole("status")).toHaveTextContent("3 phone numbers, 1 account number and 2 names");
  });
  it("shows the quick-check badge", () => {
    render(<PrivacyBadge source="RULES" redactions={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Quick check");
  });
});

const SCAM = "This is Inspector Rajesh Sharma, CBI. You are under digital arrest. Call 9876543210 and do not tell your family.";

async function cloudOutcome(): Promise<CheckOutcome> {
  return checkMessage(
    { text: SCAM },
    {
      platform: "web",
      nanoAvailable: () => false,
      online: () => true,
      cloud: { run: async () => ({ text: JSON.stringify({ score: 92, level: "high", signals: [], explanation: "Fake police.", advice: "Hang up." }), source: "IN_CLOUD" }) },
      settings: { neverCloud: false },
    },
  );
}

describe("ResultCard", () => {
  it("renders level, advice, signals and the 'what was sent' drawer with redacted text only", async () => {
    const outcome = await cloudOutcome();
    render(<ResultCard outcome={outcome} />);
    expect(screen.getByRole("heading", { level: 2, name: /looks like a scam/i })).toBeInTheDocument();
    expect(screen.getByText(/Hang up/)).toBeInTheDocument();
    expect(screen.getByText(/Claims to be police/)).toBeInTheDocument();
    expect(screen.getByText(/personal details removed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /see exactly what was sent/i }));
    const sent = screen.getByTestId("sent-text");
    expect(sent).toHaveTextContent("[PHONE_1]");
    expect(sent.textContent).not.toContain("9876543210");
    expect(sent.textContent).not.toContain("Rajesh");
    expect(screen.getByTestId("route-reason")).toHaveTextContent(/cloud/);
  });

  it("has no drawer when nothing was sent", async () => {
    const outcome = await checkMessage({ text: SCAM }, { platform: "web", nanoAvailable: () => false, online: () => false, settings: { neverCloud: false } });
    render(<ResultCard outcome={outcome} />);
    expect(screen.queryByRole("button", { name: /what was sent/i })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Quick check");
  });
});
