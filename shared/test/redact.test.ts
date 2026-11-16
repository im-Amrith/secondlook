import { describe, expect, it } from "vitest";
import { redact, describeRedactions, totalRedactions } from "../src/redact";

const count = (r: ReturnType<typeof redact>, t: string) => r.redactions.find((x) => x.type === t)?.count ?? 0;

describe("redact", () => {
  it("masks Indian phone numbers in common formats", () => {
    const r = redact("Call +91 98765 43210 or 9876543210 or 098765-43210 or +91-87654-32109");
    expect(r.text).not.toMatch(/\d{5}/);
    expect(count(r, "PHONE")).toBe(2); // first three are the same number
    expect(r.text).toContain("[PHONE_1]");
    expect(r.text).toContain("[PHONE_2]");
  });

  it("masks international numbers and toll-free", () => {
    const r = redact("Ring +44 20 7946 0958 or 1800 123 4567");
    expect(count(r, "PHONE")).toBe(2);
  });

  it("masks emails before UPI ids, and UPI ids separately", () => {
    const r = redact("mail ramesh.k@gmail.com, pay ramesh.k@okaxis or 9876543210@ybl");
    expect(count(r, "EMAIL")).toBe(1);
    expect(count(r, "UPI")).toBe(2);
    expect(r.text).toBe("mail [EMAIL_1], pay [UPI_1] or [UPI_2]");
  });

  it("masks Luhn-valid cards but not random long digit runs as cards", () => {
    const r = redact("card 4111 1111 1111 1111 ok");
    expect(count(r, "CARD")).toBe(1);
    const r2 = redact("ref 1234567890123");
    expect(count(r2, "CARD")).toBe(0);
    expect(count(r2, "ACCOUNT")).toBe(1);
  });

  it("masks IBAN, Aadhaar and PAN", () => {
    const r = redact("IBAN GB82 WEST 1234 5698 7654 32, Aadhaar 2345 6789 0123, PAN ABCPE1234F");
    expect(count(r, "IBAN")).toBe(1);
    expect(count(r, "AADHAAR")).toBe(1);
    expect(count(r, "PAN")).toBe(1);
    expect(r.text).not.toMatch(/ABCPE|2345 6789/);
  });

  it("masks bank account numbers", () => {
    const r = redact("Transfer to A/c 50100234567891 IFSC HDFC0001234");
    expect(count(r, "ACCOUNT")).toBe(1);
    expect(r.text).toContain("[ACCOUNT_1]");
  });

  it("masks OTP-like codes but keeps amounts", () => {
    const r = redact("Your OTP is 482913. 739201 is your verification code. Pay Rs 25,000 now.");
    expect(count(r, "OTP")).toBe(2);
    expect(r.text).toContain("Rs 25,000");
    expect(r.text).not.toMatch(/482913|739201/);
  });

  it("masks names after titles and from an extra list", () => {
    const r = redact("This is Inspector Rajesh Sharma from CBI. Mrs. Lakshmi must pay. Ask Anil.", { names: ["Anil"] });
    expect(count(r, "NAME")).toBe(3);
    expect(r.text).not.toMatch(/Rajesh|Lakshmi|Anil/);
    expect(r.text).toContain("CBI");
  });

  it("keeps the mapping local and stable", () => {
    const r = redact("9876543210 and again 98765 43210");
    expect(r.items).toEqual([{ type: "PHONE", placeholder: "[PHONE_1]", original: "9876543210" }]);
    expect(r.text).toBe("[PHONE_1] and again [PHONE_1]");
  });

  it("leaves benign text untouched", () => {
    const t = "Reached home, will call after dinner. Love you!";
    expect(redact(t).text).toBe(t);
    expect(redact(t).redactions).toEqual([]);
  });

  it("describes counts in plain words", () => {
    expect(describeRedactions([{ type: "PHONE", count: 3 }, { type: "ACCOUNT", count: 1 }, { type: "NAME", count: 2 }])).toBe("3 phone numbers, 1 account number and 2 names");
    expect(describeRedactions([])).toBe("nothing personal found");
    expect(totalRedactions([{ type: "PHONE", count: 3 }, { type: "OTP", count: 1 }])).toBe(4);
  });
});
