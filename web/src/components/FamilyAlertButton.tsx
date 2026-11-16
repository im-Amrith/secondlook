import { useEffect, useState } from "react";
import type { Verdict } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { alertFromVerdict, myCircles, sendAlert, type Circle } from "../lib/family";

/** On a medium/high result, offer to tell the family circle. Sends signal metadata only. */
export function FamilyAlertButton({ verdict }: { verdict: Verdict }) {
  const { services, user, settings, surface } = useApp();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!services || !user) return;
    myCircles(services.db, user.uid)
      .then((cs) => setCircle(cs.find((c) => c.ownerUid === user.uid) ?? null))
      .catch(() => setCircle(null));
  }, [services, user]);

  if (verdict.level === "low" || !settings.familyAlerts) return null;
  if (!services) return null;
  if (!user || !circle) {
    return <p className="muted family-hint">Want a family member to know when this happens? <a href="#/family">Set up your family circle</a>.</p>;
  }
  if (state === "sent") {
    return <p className="family-sent" role="status">✔ Your family has been told. They see only the warning signs, never your message.</p>;
  }
  return (
    <div className="family-alert">
      <button
        className="secondary big"
        disabled={state === "sending"}
        onClick={async () => {
          setState("sending");
          try {
            await sendAlert(services.db, alertFromVerdict(verdict, circle, user, surface));
            setState("sent");
          } catch {
            setState("error");
          }
        }}
      >
        {state === "sending" ? "Telling your family…" : "Let my family know"}
      </button>
      <p className="muted">They'll see the warning signs and the time. Not the message.</p>
      {state === "error" && <p className="notice notice-error">Couldn't send the alert. Please try again.</p>}
    </div>
  );
}
