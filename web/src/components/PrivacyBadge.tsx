import { describeRedactions, totalRedactions, type Redaction, type VerdictSource } from "@secondlook/shared";
import { useT } from "../lib/useT";
import { redactionsText } from "../lib/i18n";
import { SourceIcon } from "./icons";

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
  const { t, lang } = useT();
  const removed = () =>
    totalRedactions(redactions) > 0 ? t("badge.removed", { list: redactionsText(redactions, lang, describeRedactions) }) : t("badge.noneFound");

  if (source === "RULES" && sent) {
    return (
      <div className="badge badge-cloud" role="status" data-source="RULES_AFTER_CLOUD">
        <span className="badge-dot"><SourceIcon route="cloud" /></span>
        <span>
          <strong>{t("badge.sentTitle")}</strong>
          {removed()} {t("badge.unusable")}
        </span>
      </div>
    );
  }
  if (source === "ON_DEVICE") {
    return (
      <div className="badge badge-device" role="status" data-source="ON_DEVICE">
        <span className="badge-dot"><SourceIcon route="device" /></span>
        <span>
          <strong>{t("badge.deviceTitle")}</strong> {t("badge.deviceBody")}
          {simulated && <em className="badge-sim"> {t("badge.sim")}</em>}
        </span>
      </div>
    );
  }
  if (source === "IN_CLOUD") {
    return (
      <div className="badge badge-cloud" role="status" data-source="IN_CLOUD">
        <span className="badge-dot"><SourceIcon route="cloud" /></span>
        <span>
          <strong>{t("badge.cloudTitle")}</strong>
          {removed()}
          {sentImage && <> {t("badge.image")}</>}
        </span>
      </div>
    );
  }
  return (
    <div className="badge badge-rules" role="status" data-source="RULES">
      <span className="badge-dot"><SourceIcon route="rules" /></span>
      <span>
        <strong>{t("badge.rulesTitle")}</strong> {t("badge.rulesBody")}
      </span>
    </div>
  );
}
