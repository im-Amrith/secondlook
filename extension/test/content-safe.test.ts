// @vitest-environment-options {"url": "https://netbanking.hdfcbank.com/login"}
import { beforeAll, describe, expect, it } from "vitest";

describe("content script on a real bank login page", () => {
  beforeAll(async () => {
    document.body.innerHTML = '<form><input type="password" name="pass"></form>';
    await import("../src/content");
  });
  it("does not show a banner", () => {
    expect(document.getElementById("secondlook-banner-host")).toBeNull();
  });
});
