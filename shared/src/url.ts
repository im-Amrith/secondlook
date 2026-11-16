// Page / URL risk features for the extension's warning banner. Inspired by the URL features in
// im-Amrith/PhishShield_Extension, reimplemented as transparent local rules (no backend call).

export interface PageSignals {
  hasPasswordField: boolean;
  hasCardField: boolean;
  hasOtpField: boolean;
}

export interface UrlFinding {
  id: string;
  label: string;
  weight: number;
}

export interface UrlRisk {
  score: number; // 0-100
  findings: UrlFinding[];
  /** Show the in-page banner? Only when the address looks off AND the page asks for secrets. */
  warn: boolean;
  host: string;
}

/** Brands commonly impersonated in India and globally. Matched against the registrable part of the host. */
const BRANDS: Record<string, string[]> = {
  sbi: ["sbi.co.in", "onlinesbi.sbi", "sbi.bank.in", "onlinesbi.com"],
  hdfc: ["hdfcbank.com", "hdfc.bank.in", "hdfc.com"],
  icici: ["icicibank.com", "icici.bank.in"],
  axis: ["axisbank.com", "axis.bank.in"],
  kotak: ["kotak.com", "kotak.bank.in"],
  paytm: ["paytm.com"],
  phonepe: ["phonepe.com"],
  paypal: ["paypal.com", "paypal.me"],
  amazon: ["amazon.in", "amazon.com", "amazon.co.uk"],
  flipkart: ["flipkart.com"],
  google: ["google.com", "accounts.google.com", "google.co.in"],
  microsoft: ["microsoft.com", "microsoftonline.com", "live.com", "office.com", "outlook.com", "microsoft365.com"],
  apple: ["apple.com", "icloud.com"],
  netflix: ["netflix.com"],
  indiapost: ["indiapost.gov.in"],
  incometax: ["incometax.gov.in"],
  kseb: ["kseb.in"],
  irctc: ["irctc.co.in"],
  whatsapp: ["whatsapp.com"],
};

const RISKY_TLDS = new Set(["top", "xyz", "buzz", "click", "icu", "cfd", "sbs", "rest", "monster", "quest", "cyou", "lol", "zip", "mov", "tk", "ml", "ga", "cf", "gq", "live", "online", "site", "shop", "info"]);
const BAIT_WORDS = /(login|log-in|signin|sign-in|verify|verification|secure|update|kyc|account|unlock|suspend|refund|reward|bonus|claim|wallet|banking|otp|confirm)/i;

function hostOf(url: string): { host: string; protocol: string; full: string } | null {
  try {
    const u = new URL(url);
    return { host: u.hostname.toLowerCase(), protocol: u.protocol, full: u.href };
  } catch {
    return null;
  }
}

const isOfficial = (host: string, domains: string[]) => domains.some((d) => host === d || host.endsWith(`.${d}`));

export function scoreUrl(url: string, page?: Partial<PageSignals>): UrlRisk {
  const h = hostOf(url);
  if (!h || !/^https?:$/.test(h.protocol)) return { score: 0, findings: [], warn: false, host: h?.host ?? "" };
  const { host, protocol, full } = h;
  const findings: UrlFinding[] = [];
  const add = (id: string, label: string, weight: number) => findings.push({ id, label, weight });

  const labels = host.split(".");
  const tld = labels.at(-1) ?? "";

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) add("ip_host", "The address is a bare number, not a name", 0.5);
  if (host.includes("xn--")) add("punycode", "The address uses look-alike letters", 0.45);
  if (full.includes("@")) add("at_sign", "The link hides its real address with an @", 0.4);
  if (labels.length >= 5) add("many_subdomains", "The address has many parts, a common disguise", 0.2);
  if ((host.match(/-/g) ?? []).length >= 2) add("hyphens", "The address has several hyphens", 0.15);
  if (RISKY_TLDS.has(tld)) add("risky_tld", `The address ends in .${tld}, popular with scam sites`, 0.2);
  if (full.length > 120) add("long_url", "The link is unusually long", 0.1);
  if (BAIT_WORDS.test(host)) add("bait_words", "The address uses words like 'verify' or 'kyc'", 0.2);
  if (protocol === "http:") add("no_https", "The page isn't using a secure connection", 0.2);

  for (const [brand, domains] of Object.entries(BRANDS)) {
    const mentions = host.replace(/[-.]/g, "").includes(brand) || host.replace(/0/g, "o").replace(/1/g, "l").includes(brand);
    if (mentions && !isOfficial(host, domains)) {
      add("brand_lookalike", `The address mentions ${brand.toUpperCase()} but isn't its real website`, 0.55);
      break;
    }
  }

  const score = Math.round((1 - findings.reduce((a, f) => a * (1 - f.weight), 1)) * 100);
  const asksSecrets = !!(page?.hasPasswordField || page?.hasCardField || page?.hasOtpField);
  return { score, findings, warn: asksSecrets && score >= 45, host };
}

/** Run in the page (content script) to see whether it asks for secrets. */
export function detectPageSignals(doc: Document): PageSignals {
  const inputs = Array.from(doc.querySelectorAll("input"));
  const attrs = (i: HTMLInputElement) => `${i.name} ${i.id} ${i.autocomplete} ${i.placeholder} ${i.getAttribute("aria-label") ?? ""}`.toLowerCase();
  return {
    hasPasswordField: inputs.some((i) => i.type === "password" || /\b(upi ?pin|mpin|atm ?pin)\b/.test(attrs(i))),
    hasCardField: inputs.some((i) => /cc-number|card ?(number|no)|cardnumber|\bcvv\b|\bcvc\b|cc-csc|expiry/.test(attrs(i))),
    hasOtpField: inputs.some((i) => i.autocomplete === "one-time-code" || /\botp\b|one.?time/.test(attrs(i))),
  };
}
