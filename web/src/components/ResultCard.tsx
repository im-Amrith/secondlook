import type { CheckOutcome } from "@secondlook/shared";
import { PrivacyBadge } from "./PrivacyBadge";
import { SentDrawer } from "./SentDrawer";
import { useT } from "../lib/useT";
import { useOptionalApp } from "../lib/app-context";
import { ReadAloud } from "./ReadAloud";
import { adviceText, noteText, reasonText, rulesExplanation, signalText } from "../lib/i18n";

const LEVEL_ICON = { high: "⛔", medium: "⚠️", low: "✅", unknown: "❔" } as const;

export interface ResultCardProps {
  outcome: CheckOutcome;
  simulated?: boolean;
  /** Rendered under the advice (e.g. "Tell my family" button). */
  actions?: React.ReactNode;
}

export function ResultCard({ outcome, simulated, actions }: ResultCardProps) {
  const { t, lang } = useT();
  const autoRead = useOptionalApp()?.settings.autoRead ?? false;
  const v = outcome.verdict;
  const levelKey = outcome.inconclusive ? "unknown" : v.level;
  const title = t(`result.${levelKey}`);
  // Rules-only explanations are rebuilt in the UI language; AI explanations are shown as written.
  const explanation = v.source === "RULES" && !outcome.inconclusive && lang !== "en" ? rulesExplanation(v.level, v.signals, lang) : v.explanation;
  const aiInEnglish = lang !== "en" && v.source !== "RULES" && /^[\x00-\x7F\s“”‘’…—–]*$/.test(v.explanation);
  // Translations are per category, so show one entry per category outside English.
  const signals = lang === "en" ? v.signals : v.signals.filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);

  const spoken = `${title}. ${t("result.whatToDo")} ${adviceText(v.advice, lang)} ${explanation}`;

  return (
    <section className={`result result-${levelKey}`} aria-live="polite" data-testid="result">
      <header className="result-head">
        <span className="result-icon" aria-hidden>{LEVEL_ICON[levelKey]}</span>
        <div>
          <h2>{title}</h2>
          {!outcome.inconclusive && (
            <div className="meter" aria-label={t("result.riskLabel", { n: v.score })}>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${v.score}%` }} /></div>
              <span className="meter-num">{t("result.risk", { n: v.score })}</span>
            </div>
          )}
        </div>
      </header>

      <ReadAloud text={spoken} autoPlay={autoRead} />

      <p className="advice"><strong>{t("result.whatToDo")}</strong> {adviceText(v.advice, lang)}</p>
      <p className="explanation">
        {explanation}
        {aiInEnglish && <span className="muted"> {t("result.inEnglish")}</span>}
      </p>

      {signals.length > 0 && (
        <div className="signals">
          <h3>{t("result.signs")}</h3>
          <ul>
            {signals.map((s, i) => {
              const st = signalText(s, lang);
              return (
                <li key={`${s.id}-${i}`} className="signal">
                  <span className="signal-label">{st.label}</span>
                  {s.excerpt && <q className="signal-excerpt">{s.excerpt}</q>}
                  {st.why && <span className="signal-why">{st.why}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {actions}

      <div className="privacy">
        <PrivacyBadge source={v.source} redactions={v.redactions} sentImage={outcome.sentImage} sent={outcome.sentText !== null} simulated={simulated && v.source === "ON_DEVICE"} />
        {(outcome.fallbackNote || outcome.decision.code !== "device_default") && <p className="route-reason" data-testid="route-reason">{outcome.fallbackNote ? noteText(outcome.fallbackNote, lang) : reasonText(outcome.decision, lang)}</p>}
        <SentDrawer sentText={outcome.sentText} sentImage={outcome.sentImage} items={outcome.redactionItems} />
      </div>
    </section>
  );
}
