import { decideRoute, estimateTokens, guessLang, type RouteDecision } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { reasonText } from "../lib/i18n";

const ICON: Record<RouteDecision["route"], string> = { device: "🟢", cloud: "🔵", rules: "⚪" };
const SHOW_REASON: RouteDecision["code"][] = ["cloud_lang", "device_chunked", "cloud_too_long", "device_forced_lang"];

/** Shows where a check WILL run before the user presses the button (same router as the real check). */
export function RoutePreview({ text, hasImage }: { text: string; hasImage: boolean }) {
  const app = useApp();
  const { t, lang } = useT();
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
  return (
    <p className={`route-preview route-preview-${d.route}`} data-testid="route-preview" data-route={d.route}>
      <span aria-hidden>{ICON[d.route]}</span> {t(`preview.${d.route}`)}
      {d.route === "cloud" && hasImage && <> {t("preview.image")}</>}
      {SHOW_REASON.includes(d.code) && <span className="muted"> {reasonText(d, lang)}</span>}
    </p>
  );
}
