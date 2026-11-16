import { useEffect, useState } from "react";
import type { Verdict } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { alertFromVerdict, type Circle } from "../lib/family-model";

/** On a medium/high result, offer to tell the family circle. Sends signal metadata only. */
export function FamilyAlertButton({ verdict }: { verdict: Verdict }) {
  const { services, user, settings, surface } = useApp();
  const { t } = useT();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!services || !user) return;
    import("../lib/family")
      .then((f) => f.myCircles(services.db, user.uid))
      .then((cs) => setCircle(cs.find((c) => c.ownerUid === user.uid) ?? null))
      .catch(() => setCircle(null));
  }, [services, user]);

  if (verdict.level === "low" || !settings.familyAlerts) return null;
  if (!services) return null;
  if (!user || !circle) {
    return <p className="muted family-hint">{t("family.hint")} <a href="#/family">{t("family.hintLink")}</a>.</p>;
  }
  if (state === "sent") {
    return <p className="family-sent" role="status">{t("family.sent")}</p>;
  }
  return (
    <div className="family-alert">
      <button
        className="secondary big"
        disabled={state === "sending"}
        onClick={async () => {
          setState("sending");
          try {
            const { sendAlert } = await import("../lib/family");
            await sendAlert(services.db, alertFromVerdict(verdict, circle, user, surface));
            setState("sent");
          } catch {
            setState("error");
          }
        }}
      >
        {state === "sending" ? t("family.sending") : t("family.button")}
      </button>
      <p className="muted">{t("family.note")}</p>
      {state === "error" && <p className="notice notice-error">{t("family.error")}</p>}
    </div>
  );
}
