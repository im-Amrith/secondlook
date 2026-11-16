import { decideRoute, estimateTokens, guessLang, type RouteDecision } from "@secondlook/shared";
import { useApp } from "../lib/app-context";

const PREVIEW: Record<RouteDecision["route"], { icon: string; text: string }> = {
  device: { icon: "🟢", text: "Will be checked on this device. Nothing will be sent." },
  cloud: { icon: "🔵", text: "Will remove personal details, then check in the cloud." },
  rules: { icon: "⚪", text: "Will run a quick check on this device." },
};

/** Shows where a check WILL run before the user presses the button (same router as the real check). */
export function RoutePreview({ text, hasImage }: { text: string; hasImage: boolean }) {
  const app = useApp();
  if (!text.trim() && !hasImage) return null;
  const d = decideRoute({
    platform: "web",
    nanoAvailable: (app.aiConfigured || app.simulatedNano) && (hasImage ? app.nanoImage : app.nano) === "available",
    lang: guessLang(text),
    estTokens: estimateTokens(text),
    inputType: hasImage ? "image" : "text",
    multiTurn: false,
    userNeverCloud: app.settings.neverCloud,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    cloudEnabled: app.config.cloudEnabled && app.aiConfigured,
  });
  const p = PREVIEW[d.route];
  const extra = d.route === "cloud" && hasImage ? " We'll ask before sending the screenshot." : "";
  const why = d.code === "cloud_lang" || d.code === "device_chunked" || d.code === "cloud_too_long" || d.code === "device_forced_lang" ? ` ${d.reason.split(",")[0]}.` : "";
  return (
    <p className={`route-preview route-preview-${d.route}`} data-testid="route-preview" data-route={d.route}>
      <span aria-hidden>{p.icon}</span> {p.text}
      {extra}
      {why && <span className="muted">{why}</span>}
    </p>
  );
}
