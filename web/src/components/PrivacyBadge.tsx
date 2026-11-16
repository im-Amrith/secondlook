import { describeRedactions, totalRedactions, type Redaction, type VerdictSource } from "@secondlook/shared";

export interface PrivacyBadgeProps {
  source: VerdictSource;
  redactions: Redaction[];
  sentImage?: boolean;
  simulated?: boolean;
  /** Something left the device (even if the cloud's answer was unusable). The badge must say so. */
  sent?: boolean;
}

/** The visible privacy router: always shows which path produced the verdict, and whether anything left the device. */
export function PrivacyBadge({ source, redactions, sentImage, simulated, sent }: PrivacyBadgeProps) {
  if (source === "RULES" && sent) {
    const n = totalRedactions(redactions);
    return (
      <div className="badge badge-cloud" role="status" data-source="RULES_AFTER_CLOUD">
        <span className="badge-dot" aria-hidden>🔵</span>
        <span>
          <strong>Sent to the cloud</strong>
          {n > 0 ? <>, with personal details removed: {describeRedactions(redactions)}.</> : <>. No personal details were found to remove.</>}{" "}
          Its answer couldn't be used, so this is a quick-check result.
        </span>
      </div>
    );
  }
  if (source === "ON_DEVICE") {
    return (
      <div className="badge badge-device" role="status" data-source="ON_DEVICE">
        <span className="badge-dot" aria-hidden>🟢</span>
        <span>
          <strong>Checked on this device.</strong> Nothing was sent anywhere.
          {simulated && <em className="badge-sim"> (simulated model, dev only)</em>}
        </span>
      </div>
    );
  }
  if (source === "IN_CLOUD") {
    const n = totalRedactions(redactions);
    return (
      <div className="badge badge-cloud" role="status" data-source="IN_CLOUD">
        <span className="badge-dot" aria-hidden>🔵</span>
        <span>
          <strong>Checked in the cloud</strong>
          {n > 0 ? <>, with personal details removed: {describeRedactions(redactions)}.</> : <>. No personal details were found to remove.</>}
          {sentImage && <> The screenshot was sent as you allowed.</>}
        </span>
      </div>
    );
  }
  return (
    <div className="badge badge-rules" role="status" data-source="RULES">
      <span className="badge-dot" aria-hidden>⚪</span>
      <span>
        <strong>Quick check.</strong> Rules only, on this device. No AI model was used.
      </span>
    </div>
  );
}
