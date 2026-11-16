import { describe, expect, it } from "vitest";
import { safePageUrl } from "../src/messages";

describe("safePageUrl", () => {
  it("drops query strings and fragments that may carry personal data", () => {
    expect(safePageUrl("https://mail.example.com/inbox?email=ravi@example.com&token=abc#msg-123")).toBe("https://mail.example.com/inbox");
    expect(safePageUrl(undefined)).toBe("");
    expect(safePageUrl("nonsense")).toBe("");
  });
});
