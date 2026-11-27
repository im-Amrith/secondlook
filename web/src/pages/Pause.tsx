import { useEffect, useMemo, useState } from "react";
import { CALL_QUESTIONS, PAUSE_QUESTION_IDS, combine, scoreAnswers } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { callQuestionText, callWarningText } from "../lib/i18n";
import { TrustedContact } from "../components/TrustedContact";
import { FamilyAlertButton } from "../components/FamilyAlertButton";
import { ReadAloud } from "../components/ReadAloud";
import { Check, Ico, OctagonX } from "../components/icons";

/**
 * "Pause before paying": scams work by rushing people, so this adds friction at the moment of
 * payment. A countdown, three honest questions, and one big button to call someone you trust.
 * Nothing here is sent anywhere (the family alert, if used, carries signal ids only).
 */
export function PausePage({ seconds: secondsProp }: { seconds?: number } = {}) {
  const { settings } = useApp();
  const { t, lang } = useT();
  const total = secondsProp ?? settings.pauseSeconds ?? 60;
  const [left, setLeft] = useState(total);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const questions = PAUSE_QUESTION_IDS.map((id) => CALL_QUESTIONS.find((q) => q.id === id)!);
  const yes = Object.entries(answers).filter(([, v]) => v).map(([k]) => k);
  const answeredAll = questions.every((q) => q.id in answers);
  const result = useMemo(() => scoreAnswers(yes), [yes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const risky = yes.length > 0;
  const verdict = useMemo(() => combine(result, null, { source: "RULES" }), [result]);
  const pct = total > 0 ? Math.max(0, left) / total : 0;

  return (
    <div className="page pause-page">
      <h1>{t("pause.title")}</h1>
      <p className="lead">{t("pause.lead")}</p>

      <div className="countdown" role="timer" aria-live="off" aria-label={t("pause.seconds", { n: Math.max(0, left) })}>
        <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden>
          <circle cx="60" cy="60" r="52" className="countdown-track" />
          <circle cx="60" cy="60" r="52" className="countdown-fill" style={{ strokeDasharray: 327, strokeDashoffset: 327 * (1 - pct) }} />
        </svg>
        <span className="countdown-num">{left > 0 ? left : <Ico icon={Check} size={48} strokeWidth={2.5} />}</span>
      </div>
      {left <= 0 && <p className="ok">{t("pause.done")}</p>}

      <section className="card" aria-labelledby="pause-q">
        <h2 id="pause-q">{t("pause.answer")}</h2>
        <ol className="questions">
          {questions.map((q) => (
            <li key={q.id} className="question">
              <span>{callQuestionText(q.id, q.text, lang)}</span>
              <span className="yesno" role="group" aria-label={callQuestionText(q.id, q.text, lang)}>
                <button type="button" className={answers[q.id] === true ? "chip chip-on chip-yes" : "chip"} aria-pressed={answers[q.id] === true} onClick={() => setAnswers((a) => ({ ...a, [q.id]: true }))}>{t("call.yes")}</button>
                <button type="button" className={answers[q.id] === false ? "chip chip-on" : "chip"} aria-pressed={answers[q.id] === false} onClick={() => setAnswers((a) => ({ ...a, [q.id]: false }))}>{t("call.no")}</button>
              </span>
            </li>
          ))}
        </ol>
        {risky && (
          <div className="call-alert call-alert-high" role="alert">
            <p className="call-alert-head"><Ico icon={OctagonX} /> {t("pause.stop")}</p>
            {result.warning && <p className="call-alert-text">{callWarningText(result.warningRule, result.warning, lang)}</p>}
            <ReadAloud text={`${t("pause.stop")} ${result.warning ? callWarningText(result.warningRule, result.warning, lang) : ""}`} />
          </div>
        )}
        {!risky && answeredAll && <p className="notice">{t("pause.ok")}</p>}
      </section>

      <TrustedContact />
      {risky && <FamilyAlertButton verdict={verdict} />}

      <button type="button" className="secondary big" disabled={left > 0} onClick={() => (history.length > 1 ? history.back() : (location.hash = "#/"))}>
        {left > 0 ? t("pause.seconds", { n: left }) : t("pause.close")}
      </button>
    </div>
  );
}
