import type { CheckOutcome } from "@secondlook/shared";
import { PrivacyBadge } from "./PrivacyBadge";
import { SentDrawer } from "./SentDrawer";

const LEVEL_TEXT = {
  high: { title: "This looks like a scam", icon: "⛔" },
  medium: { title: "Be careful with this one", icon: "⚠️" },
  low: { title: "No strong scam signs", icon: "✅" },
} as const;

export interface ResultCardProps {
  outcome: CheckOutcome;
  simulated?: boolean;
  /** Rendered under the advice (e.g. "Tell my family" button). */
  actions?: React.ReactNode;
}

export function ResultCard({ outcome, simulated, actions }: ResultCardProps) {
  const v = outcome.verdict;
  const lvl = outcome.inconclusive ? { title: "We couldn't read this", icon: "❔" } : LEVEL_TEXT[v.level];
  const levelClass = outcome.inconclusive ? "unknown" : v.level;
  return (
    <section className={`result result-${levelClass}`} aria-live="polite" data-testid="result">
      <header className="result-head">
        <span className="result-icon" aria-hidden>{lvl.icon}</span>
        <div>
          <h2>{lvl.title}</h2>
          {!outcome.inconclusive && (
            <div className="meter" aria-label={`Scam risk ${v.score} out of 100`}>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${v.score}%` }} /></div>
              <span className="meter-num">Risk {v.score}/100</span>
            </div>
          )}
        </div>
      </header>

      <p className="advice"><strong>What to do:</strong> {v.advice}</p>
      <p className="explanation">{v.explanation}</p>

      {v.signals.length > 0 && (
        <div className="signals">
          <h3>Warning signs we found</h3>
          <ul>
            {v.signals.map((s, i) => (
              <li key={`${s.id}-${i}`} className="signal">
                <span className="signal-label">{s.label ?? s.id}</span>
                {s.excerpt && <q className="signal-excerpt">{s.excerpt}</q>}
                {s.why && <span className="signal-why">{s.why}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions}

      <div className="privacy">
        <PrivacyBadge source={v.source} redactions={v.redactions} sentImage={outcome.sentImage} simulated={simulated && v.source === "ON_DEVICE"} />
        <p className="route-reason">{outcome.fallbackNote ?? outcome.decision.reason}</p>
        <SentDrawer sentText={outcome.sentText} sentImage={outcome.sentImage} items={outcome.redactionItems} />
      </div>
    </section>
  );
}
