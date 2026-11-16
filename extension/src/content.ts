// Content script: shows a calm warning banner on risky login or payment pages.
// Runs only local rules (shared/url.ts). It never sends page content anywhere by itself.
import { detectPageSignals, scoreUrl } from "@secondlook/shared";
import { MAX_PAGE_CHARS, type ContentToBackground } from "./messages";
import { bannerHtml } from "./banner";

const BANNER_ID = "secondlook-banner-host";

function check() {
  if (document.getElementById(BANNER_ID)) return;
  const risk = scoreUrl(location.href, detectPageSignals(document));
  if (!risk.warn) return;
  try {
    if (sessionStorage.getItem(`secondlook-dismissed:${location.host}`)) return;
  } catch {
    /* ignore */
  }

  const host = document.createElement("div");
  host.id = BANNER_ID;
  host.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(560px,calc(100vw - 24px));";
  // Shadow DOM so the page's CSS can't restyle (or hide) the warning.
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = bannerHtml(risk);
  document.documentElement.appendChild(host);

  root.getElementById("sl-dismiss")?.addEventListener("click", () => {
    try {
      sessionStorage.setItem(`secondlook-dismissed:${location.host}`, "1");
    } catch {
      /* ignore */
    }
    host.remove();
  });
  root.getElementById("sl-leave")?.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else location.href = "about:blank";
  });
  root.getElementById("sl-check")?.addEventListener("click", () => {
    const msg: ContentToBackground = { type: "open-panel-check", url: location.href, text: `Page: ${location.href}\n\n${(document.body?.innerText ?? "").slice(0, MAX_PAGE_CHARS)}` };
    void chrome.runtime.sendMessage(msg);
  });
}

check();
// Single-page apps often render the login form after load.
const obs = new MutationObserver(() => check());
obs.observe(document.documentElement, { childList: true, subtree: true });
setTimeout(() => obs.disconnect(), 15000);
