import { describe, expect, it } from "vitest";
import { detectPaymentPage } from "../src";

describe("detectPaymentPage", () => {
  it("spots bank transfers, new payees, UPI send-money and gift-card purchases", () => {
    expect(detectPaymentPage("https://bank.example/netbanking/fund-transfer", "Fund Transfer. Select account. Enter amount ₹").isPayment).toBe(true);
    expect(detectPaymentPage("https://bank.example/x", "Add New Beneficiary. Beneficiary name, Account number, IFSC").isPayment).toBe(true);
    expect(detectPaymentPage("https://pay.example/", "Send money to a contact. Enter amount. Enter your UPI PIN").isPayment).toBe(true);
    expect(detectPaymentPage("https://shop.example/gift", "Buy e-gift cards. Gift card amount: ₹ 5000").isPayment).toBe(true);
  });

  it("leaves shopping checkouts, articles and ordinary pages alone", () => {
    expect(detectPaymentPage("https://shop.example/checkout", "Order summary. Delivery address. Pay ₹499 with UPI. Place your order").isPayment).toBe(false);
    expect(detectPaymentPage("https://news.example/a", "How NEFT works: a short explainer").isPayment).toBe(false);
    expect(detectPaymentPage("https://example.com", "Welcome to our site").isPayment).toBe(false);
    // An amount field alone is not enough.
    expect(detectPaymentPage("https://example.com/donate", "Enter amount ₹ 100, account number").isPayment).toBe(false);
  });
});
