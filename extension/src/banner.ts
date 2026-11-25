import type { UrlRisk } from "@secondlook/shared";

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
<style>
  .card{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1b2826;background:#fff;border:3px solid #a52a1f;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.25);padding:14px 16px}
  h2{margin:0 0 4px;font-size:19px;color:#a52a1f}
  p{margin:4px 0}
  ul{margin:6px 0 10px;padding-left:20px}
  .host{font-family:ui-monospace,Consolas,monospace;background:#fbe9e6;padding:1px 6px;border-radius:6px;word-break:break-all}
  .row{display:flex;gap:8px;flex-wrap:wrap}
  button{font:inherit;font-weight:700;min-height:44px;padding:8px 14px;border-radius:10px;cursor:pointer}
  .leave{background:#a52a1f;color:#fff;border:2px solid #a52a1f}
  .check{background:#fff;color:#1f5f5b;border:2px solid #1f5f5b}
  .dismiss{background:none;border:none;color:#55625f;text-decoration:underline;font-weight:400}
  .brand{font-size:13px;color:#55625f;margin-top:6px}
</style>
<div class="card" role="alertdialog" aria-labelledby="sl-title">
  <h2 id="sl-title">⚠️ Careful: don't type passwords or card numbers here</h2>
  <p>This page asks for private details, but its address looks unusual: <span class="host">${esc(risk.host)}</span></p>
  <ul>${reasons}</ul>
  <div class="row">
    <button class="leave" id="sl-leave">Leave this page</button>
    <button class="check" id="sl-check">Check with SecondLook</button>
    <button class="dismiss" id="sl-dismiss">I trust this site</button>
  </div>
  <p class="brand">SecondLook · checked on this device, nothing was sent</p>
</div>`;
}

/** The gentle banner on bank-transfer / send-money / gift-card pages (pure, testable). */
export function pauseBannerHtml(): string {
  return `
<style>
  .card{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1b2826;background:#fff;border:3px solid #7a5200;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.25);padding:14px 16px}
  h2{margin:0 0 4px;font-size:19px;color:#7a5200}
  p{margin:6px 0}
  .stop h2{color:#a52a1f}
  .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  button{font:inherit;font-weight:700;min-height:44px;padding:8px 14px;border-radius:10px;cursor:pointer}
  .yes{background:#a52a1f;color:#fff;border:2px solid #a52a1f}
  .no{background:#fff;color:#1f5f5b;border:2px solid #1f5f5b}
  .open{background:#1f5f5b;color:#fff;border:2px solid #1f5f5b}
  .brand{font-size:13px;color:#55625f;margin-top:6px}
  [hidden]{display:none}
</style>
<div class="card" role="alertdialog" aria-labelledby="sl-pause-title">
  <div id="sl-ask">
    <h2 id="sl-pause-title">✋ About to send money?</h2>
    <p><strong>Is someone on the phone or a video call telling you to do this?</strong></p>
    <div class="row">
      <button class="yes" id="sl-yes">Yes, someone is</button>
      <button class="no" id="sl-no">No, I'm doing this myself</button>
    </div>
  </div>
  <div id="sl-stop" class="stop" hidden>
    <h2>⛔ Please stop. Don't pay.</h2>
    <p>Being told to pay while on a call is how most scams work. Real police, banks and officials never ask you to move money over a call.</p>
    <p><strong>Hang up first. Then call someone you trust</strong>, or the cyber crime helpline <strong>1930</strong>.</p>
    <div class="row">
      <button class="open" id="sl-open">Open SecondLook</button>
      <button class="no" id="sl-close">Close</button>
    </div>
  </div>
  <p class="brand">SecondLook · checked on this device, nothing was sent</p>
</div>`;
}
