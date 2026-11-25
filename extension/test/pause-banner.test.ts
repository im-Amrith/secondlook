// @vitest-environment-options {"url": "https://netbanking.examplebank.in/fund-transfer"}
import { beforeAll, describe, expect, it, vi } from "vitest";
import { pauseBannerHtml } from "../src/banner";

describe("pause banner on a bank-transfer page", () => {
  const sendMessage = vi.fn();
  beforeAll(async () => {
    // Real pages put line breaks between blocks (innerText does); jsdom only has textContent.
    document.body.innerHTML = "<h1>Fund Transfer</h1>\n<p>Add New Beneficiary</p>\n<label>Enter amount ₹</label>\n<input>";
    (globalThis as unknown as { chrome: unknown }).chrome = { runtime: { sendMessage } };
    await import("../src/content");
  });

  it("asks whether someone on a call is behind the payment", () => {
    expect(document.getElementById("secondlook-pause-host")).not.toBeNull();
    // The look-alike login banner is not shown on a normal-looking bank page.
    expect(document.getElementById("secondlook-banner-host")).toBeNull();
  });

  it("has the yes/no question and a stop message with the helpline", () => {
    const html = pauseBannerHtml();
    expect(html).toContain("Is someone on the phone or a video call telling you to do this?");
    expect(html).toContain("1930");
    expect(html).toMatch(/id="sl-stop"[^>]*hidden/);
  });
});
