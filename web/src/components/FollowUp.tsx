import { useState } from "react";
import type { FollowUpOutcome, Verdict } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { PrivacyBadge } from "./PrivacyBadge";
import { SentDrawer } from "./SentDrawer";

const QUICK = ["What should I do now?", "I already paid. What now?", "How can I check if it's real?"];

/** "Have a question?": multi-turn, so the router sends it to the cloud (redacted) when allowed. */
export function FollowUp({ original, verdict }: { original: string; verdict: Verdict }) {
  const { followUp, simulatedNano } = useApp();
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
    <section className="followup" aria-label="Ask a question">
      <h3>Have a question?</h3>
      <div className="examples">
        {QUICK.map((x) => (
          <button key={x} type="button" className="chip" disabled={busy} onClick={() => { setQ(x); void ask(x); }}>{x}</button>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input aria-label="Your question" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your question…" />
        <button className="secondary" type="submit" disabled={busy || !q.trim()}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
      {out && (
        <div className="followup-answer" data-testid="followup-answer">
          <p className="muted">You asked: {out.question}</p>
          <p className="answer">{out.answer}</p>
          <PrivacyBadge source={out.source} redactions={out.redactions} simulated={simulatedNano && out.source === "ON_DEVICE"} />
          <p className="route-reason">{out.decision.reason}</p>
          <SentDrawer sentText={out.sentText} sentImage={false} items={out.redactionItems} />
        </div>
      )}
    </section>
  );
}
