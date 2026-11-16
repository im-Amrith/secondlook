import { describe, expect, it } from "vitest";
import { scoreUrl } from "@secondlook/shared";
import { bannerHtml } from "../src/banner";

describe("bannerHtml", () => {
  it("lists the strongest reasons and escapes page-controlled text", () => {
    const risk = scoreUrl("https://sbi-kyc-verify.top/login", { hasPasswordField: true });
    const html = bannerHtml({ ...risk, host: '<img src=x onerror="alert(1)">' });
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("mentions SBI");
    expect(html).toContain("Leave this page");
  });
});
