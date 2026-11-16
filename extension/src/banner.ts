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
