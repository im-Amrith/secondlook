// @vitest-environment-options {"url": "https://sbi-kyc-verify.top/login"}
import { beforeAll, describe, expect, it, vi } from "vitest";

describe("content script on a look-alike bank login page", () => {
  beforeAll(async () => {
    document.body.innerHTML = '<form><input name="user"><input type="password" name="pass"></form>';
    (globalThis as unknown as { chrome: unknown }).chrome = { runtime: { sendMessage: vi.fn() } };
    await import("../src/content");
  });

  it("injects the warning banner host", () => {
    expect(document.getElementById("secondlook-banner-host")).not.toBeNull();
  });
});
