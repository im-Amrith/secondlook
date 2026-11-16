import { describe, expect, it } from "vitest";
import { scoreUrl } from "../src/url";

const login = { hasPasswordField: true };

describe("scoreUrl", () => {
  it("doesn't flag real bank and shop sites", () => {
    for (const u of ["https://www.onlinesbi.sbi/", "https://netbanking.hdfcbank.com/login", "https://www.amazon.in/ap/signin", "https://accounts.google.com/", "https://www.paypal.com/signin"]) {
      const r = scoreUrl(u, login);
      expect(r.warn, u).toBe(false);
    }
  });

  it("flags look-alike bank login pages", () => {
    const r = scoreUrl("https://sbi-kyc-verify.top/login", login);
    expect(r.warn).toBe(true);
    expect(r.findings.map((f) => f.id)).toEqual(expect.arrayContaining(["brand_lookalike", "risky_tld", "bait_words"]));
    expect(scoreUrl("http://192.168.10.5/hdfc/netbanking", login).warn).toBe(true);
    expect(scoreUrl("https://paypa1-secure-login.com", login).warn).toBe(true);
    expect(scoreUrl("https://xn--pypal-4ve.com/signin", login).warn).toBe(true);
  });

  it("only warns when the page asks for secrets", () => {
    expect(scoreUrl("https://sbi-kyc-verify.top/").warn).toBe(false);
    expect(scoreUrl("https://sbi-kyc-verify.top/", { hasCardField: true }).warn).toBe(true);
  });

  it("ignores non-web URLs", () => {
    expect(scoreUrl("chrome://extensions").score).toBe(0);
    expect(scoreUrl("not a url").score).toBe(0);
  });
});
