import { useState } from "react";
import type { FollowUpOutcome, Verdict } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { noteText, reasonText } from "../lib/i18n";
import { PrivacyBadge } from "./PrivacyBadge";
import { SentDrawer } from "./SentDrawer";
import { ReadAloud } from "./ReadAloud";

/** "Have a question?": multi-turn, so the router sends it to the cloud (redacted) when allowed. */
export function FollowUp({ original, verdict }: { original: string; verdict: Verdict }) {
  const { followUp, simulatedNano } = useApp();
  const { t, lang } = useT();
  const quick = [t("followup.q1"), t("followup.q2"), t("followup.q3")];
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<(FollowUpOutcome & { question: string }) | null>(null);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    try {
      setOut({ ...(await followUp(question, original, verdict)), question });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="followup" aria-label={t("followup.title")}>
      <h3>{t("followup.title")}</h3>
      <div className="examples">
        {quick.map((x) => (
          <button key={x} type="button" className="chip" disabled={busy} onClick={() => { setQ(x); void ask(x); }}>{x}</button>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input aria-label={t("followup.input")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("followup.placeholder")} />
        <button className="secondary" type="submit" disabled={busy || !q.trim()}>{busy ? t("followup.thinking") : t("followup.ask")}</button>
      </form>
      {out && (
        <div className="followup-answer" data-testid="followup-answer">
          <p className="muted">{t("followup.youAsked", { q: out.question })}</p>
          <p className="answer">{out.source === "RULES" ? noteText(out.answer, lang) : out.answer}</p>
          <ReadAloud key={out.question} text={out.source === "RULES" ? noteText(out.answer, lang) : out.answer} />
          <PrivacyBadge source={out.source} redactions={out.redactions} sent={out.sentText !== null} simulated={simulatedNano && out.source === "ON_DEVICE"} />
          <p className="route-reason">{out.source === "RULES" && out.decision.route !== "rules" ? noteText(out.decision.reason, lang) : reasonText(out.decision, lang)}</p>
          <SentDrawer sentText={out.sentText} sentImage={false} items={out.redactionItems} />
        </div>
      )}
    </section>
  );
}
