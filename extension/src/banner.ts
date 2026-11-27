import type { UrlRisk } from "@secondlook/shared";

// Lucide icon paths (MIT), inlined: content scripts can't load the React icon set.
const svg = (paths: string) => `<svg class="i" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ALERT = svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>');
const HAND = svg('<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>');
const STOP = svg('<path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>');

/** Shared look: black glass card, orange accents (matches the app). */
const BASE = `
  .card{font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#f5f5f7;background:rgba(18,18,20,.94);border:1px solid rgba(255,255,255,.12);border-radius:20px;box-shadow:0 24px 60px -12px rgba(0,0,0,.8),0 0 0 1px rgba(255,138,0,.25);padding:16px 18px;-webkit-font-smoothing:antialiased}
  h2{display:flex;gap:10px;align-items:center;margin:0 0 6px;font-size:19px;font-weight:700;letter-spacing:-.01em}
  p{margin:6px 0}
  .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  button{font:inherit;font-weight:600;min-height:46px;padding:9px 18px;border-radius:999px;cursor:pointer;border:0}
  .grad{background:linear-gradient(135deg,#ffb347,#ff8a00 42%,#ff4d00);color:#1a0a00}
  .ghost{background:rgba(255,255,255,.1);color:#f5f5f7;border:1px solid rgba(255,255,255,.18)}
  .red{background:linear-gradient(135deg,#ff6b5f,#ff2d20);color:#fff}
  .link{background:none;color:#a1a1a6;text-decoration:underline;font-weight:400;padding:9px 6px}
  .brand{font-size:12.5px;color:#a1a1a6;margin-top:10px}
  .i{flex:none}
  [hidden]{display:none}
`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The banner markup (pure, so it can be unit-tested). Everything from the page is escaped. */
export function bannerHtml(risk: UrlRisk): string {
  const reasons = risk.findings
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((f) => `<li>${esc(f.label)}</li>`)
    .join("");
  return `
<style>${BASE}
  h2{color:#ff6b5f}
  .host{font-family:ui-monospace,Consolas,monospace;background:rgba(255,69,58,.16);color:#ffb4ad;padding:1px 7px;border-radius:7px;word-break:break-all}
  ul{margin:6px 0 10px;padding-left:20px;color:#d1d1d6}
</style>
<div class="card" role="alertdialog" aria-labelledby="sl-title">
  <h2 id="sl-title">${ALERT} Careful: don't type passwords or card numbers here</h2>
  <p>This page asks for private details, but its address looks unusual: <span class="host">${esc(risk.host)}</span></p>
  <ul>${reasons}</ul>
  <div class="row">
    <button class="red" id="sl-leave">Leave this page</button>
    <button class="grad" id="sl-check">Check with SecondLook</button>
    <button class="link" id="sl-dismiss">I trust this site</button>
  </div>
  <p class="brand">SecondLook · checked on this device, nothing was sent</p>
</div>`;
}

/** The gentle banner on bank-transfer / send-money / gift-card pages (pure, testable). */
export function pauseBannerHtml(): string {
  return `
<style>${BASE}
  h2{color:#ffb347}
  .stop h2{color:#ff6b5f}
</style>
<div class="card" role="alertdialog" aria-labelledby="sl-pause-title">
  <div id="sl-ask">
    <h2 id="sl-pause-title">${HAND} About to send money?</h2>
    <p><strong>Is someone on the phone or a video call telling you to do this?</strong></p>
    <div class="row">
      <button class="red" id="sl-yes">Yes, someone is</button>
      <button class="ghost" id="sl-no">No, I'm doing this myself</button>
    </div>
  </div>
  <div id="sl-stop" class="stop" hidden>
    <h2>${STOP} Please stop. Don't pay.</h2>
    <p>Being told to pay while on a call is how most scams work. Real police, banks and officials never ask you to move money over a call.</p>
    <p><strong>Hang up first. Then call someone you trust</strong>, or the cyber crime helpline <strong>1930</strong>.</p>
    <div class="row">
      <button class="grad" id="sl-open">Open SecondLook</button>
      <button class="ghost" id="sl-close">Close</button>
    </div>
  </div>
  <p class="brand">SecondLook · checked on this device, nothing was sent</p>
</div>`;
}
