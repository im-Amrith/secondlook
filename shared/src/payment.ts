// Spotting the moment of payment: bank transfers, adding a payee, UPI "send money", buying gift
// cards. That is the moment a scam caller pushes for, so the extension shows a gentle "pause"
// banner there. Shopping checkouts are deliberately NOT matched (too common, and rarely the
// scam). Pure and local: it reads page text and the URL, and sends nothing anywhere.

export interface PaymentPage {
  isPayment: boolean;
  /** Which kinds of cue matched (for tests and the banner). */
  cues: string[];
}

const CUES: { id: string; re: RegExp; weight: number }[] = [
  { id: "add_payee", re: /\badd (a )?(new )?(beneficiary|payee)\b|\bmanage (beneficiar(y|ies)|payees)\b|\bbeneficiary (name|account|details)\b/i, weight: 2 },
  { id: "transfer", re: /\b(fund|funds|money|bank) transfer\b|\btransfer (funds|money|to (another|other) (bank|account))\b|\b(imps|neft|rtgs)\b/i, weight: 2 },
  { id: "upi_send", re: /\benter (your )?upi pin\b|\bsend money\b|\bpay to (upi|contact|phone number|bank account)\b|\bupi id\b.{0,40}\bpay\b/i, weight: 2 },
  { id: "gift_card", re: /\b(buy|purchase|send) (an? )?(e-?)?gift ?cards?\b|\bgift card (amount|value|denomination)\b/i, weight: 2 },
  { id: "crypto", re: /\b(withdraw|send) (btc|usdt|crypto|bitcoin)\b|\bwallet address\b/i, weight: 2 },
  { id: "amount", re: /\b(enter )?amount\b|₹\s?\d|\brs\.?\s?\d/i, weight: 1 },
  { id: "ifsc", re: /\bifsc\b|\baccount number\b/i, weight: 1 },
];

const URL_CUES = /netbanking|internet-?banking|\/(fund-?transfer|transfer|payee|beneficiary|send-?money|imps|neft|rtgs)(\/|$|\?)/i;

/** Shopping checkouts: never treated as a payment-to-a-person page. */
const CHECKOUT = /\b(place (your )?order|add to cart|shopping cart|order summary|delivery address|cart total)\b/i;

export function detectPaymentPage(url: string, pageText: string): PaymentPage {
  const text = pageText.slice(0, 20000);
  if (CHECKOUT.test(text)) return { isPayment: false, cues: [] };
  const cues: string[] = [];
  let score = 0;
  for (const c of CUES) {
    if (c.re.test(text)) {
      cues.push(c.id);
      score += c.weight;
    }
  }
  if (URL_CUES.test(url)) {
    cues.push("url");
    score += 1;
  }
  // One strong cue plus anything else (an amount field, an IFSC box, a banking URL).
  return { isPayment: score >= 3 && cues.some((c) => c !== "amount" && c !== "ifsc" && c !== "url"), cues };
}
