// Content script: shows a calm warning banner on risky login or payment pages.
// Runs only local rules (shared/url.ts). It never sends page content anywhere by itself.
import { detectPageSignals, detectPaymentPage, scoreUrl } from "@secondlook/shared";
import { MAX_PAGE_CHARS, safePageUrl, type ContentToBackground } from "./messages";
import { bannerHtml, pauseBannerHtml } from "./banner";

const BANNER_ID = "secondlook-banner-host";
const PAUSE_ID = "secondlook-pause-host";

function dismissed(kind: string): boolean {
  try {
    return Boolean(sessionStorage.getItem(`secondlook-${kind}:${location.host}`));
  } catch {
    return false;
  }
}
function dismiss(kind: string) {
  try {
    sessionStorage.setItem(`secondlook-${kind}:${location.host}`, "1");
  } catch {
    /* ignore */
  }
}

function mount(id: string, html: string): ShadowRoot {
  const host = document.createElement("div");
  host.id = id;
  host.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(560px,calc(100vw - 24px));";
  // Shadow DOM so the page's CSS can't restyle (or hide) the warning.
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = html;
  document.documentElement.appendChild(host);
  return root;
}

/**
 * The moment of payment (bank transfer, add payee, send money, gift cards): ask whether someone
 * on a call is behind it. Scam callers stay on the line while the victim pays.
 */
function checkPayment() {
  if (document.getElementById(PAUSE_ID) || document.getElementById(BANNER_ID) || dismissed("pause")) return;
  if (!detectPaymentPage(location.href, document.body?.innerText || document.body?.textContent || "").isPayment) return;
  const root = mount(PAUSE_ID, pauseBannerHtml());
  const close = () => {
    dismiss("pause");
    document.getElementById(PAUSE_ID)?.remove();
  };
  root.getElementById("sl-no")?.addEventListener("click", close);
  root.getElementById("sl-close")?.addEventListener("click", close);
  root.getElementById("sl-yes")?.addEventListener("click", () => {
    root.getElementById("sl-ask")?.setAttribute("hidden", "");
    root.getElementById("sl-stop")?.removeAttribute("hidden");
  });
  root.getElementById("sl-open")?.addEventListener("click", () => {
    const msg: ContentToBackground = { type: "open-panel-pause" };
    void chrome.runtime.sendMessage(msg);
  });
}

function check() {
  if (document.getElementById(BANNER_ID)) return;
  const risk = scoreUrl(location.href, detectPageSignals(document));
  if (!risk.warn) return checkPayment();
  if (dismissed("dismissed")) return;
  document.getElementById(PAUSE_ID)?.remove();
  const root = mount(BANNER_ID, bannerHtml(risk));

  root.getElementById("sl-dismiss")?.addEventListener("click", () => {
    dismiss("dismissed");
    document.getElementById(BANNER_ID)?.remove();
  });
  root.getElementById("sl-leave")?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.href = "about:blank";
  });
  root.getElementById("sl-check")?.addEventListener("click", () => {
    const msg: ContentToBackground = { type: "open-panel-check", url: location.href, text: `Page: ${safePageUrl(location.href)}\n\n${(document.body?.innerText ?? "").slice(0, MAX_PAGE_CHARS)}` };
    void chrome.runtime.sendMessage(msg);
  });
}

check();
// Single-page apps often render the login form after load.
// Debounced: chat apps mutate the DOM constantly.
let pendingCheck: ReturnType<typeof setTimeout> | undefined;
const obs = new MutationObserver(() => {
  clearTimeout(pendingCheck);
  pendingCheck = setTimeout(check, 400);
});
obs.observe(document.documentElement, { childList: true, subtree: true });
setTimeout(() => obs.disconnect(), 15000);
