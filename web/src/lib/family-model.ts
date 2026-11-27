// Family alert data model (pure; no Firebase runtime imports). Alerts hold METADATA ONLY.
import type { Timestamp } from "firebase/firestore";
import type { Level, SignalId, Verdict, VerdictSource } from "@secondlook/shared";

export interface Circle {
  id: string;
  ownerUid: string;
  ownerName: string;
  memberUids: string[];
  createdAt?: Timestamp;
}

export interface AlertDoc {
  id?: string;
  circleId: string;
  fromUid: string;
  fromName: string;
  /** Copied from the circle so guardians can query with array-contains (rules check it matches). */
  memberUids: string[];
  level: Level;
  score: number;
  signalIds: SignalId[];
  source: VerdictSource;
  platform: "web" | "extension" | "android";
  createdAt?: Timestamp | null;
}

/** The exact keys an alert may contain. Mirrors firestore.rules. */
export const ALERT_KEYS = ["circleId", "fromUid", "fromName", "memberUids", "level", "score", "signalIds", "source", "platform", "createdAt"] as const;

/** Build the alert payload from a verdict. Pure, so we can test that no text leaks. */
export function alertFromVerdict(v: Verdict, circle: Circle, user: { uid: string; displayName?: string | null }, platform: AlertDoc["platform"]): Omit<AlertDoc, "createdAt" | "id"> {
  return {
    circleId: circle.id,
    fromUid: user.uid,
    fromName: (user.displayName || "Family member").split(" ")[0]!.slice(0, 40),
    memberUids: circle.memberUids,
    level: v.level,
    score: Math.round(v.score),
    signalIds: [...new Set(v.signals.map((s) => s.id))].slice(0, 11),
    source: v.source,
    platform,
  };
}

const SIGNAL_WORDS: Record<SignalId, string> = {
  authority: "fake authority",
  urgency: "urgency",
  secrecy: "secrecy",
  money_request: "money request",
  credentials: "asks for codes",
  link: "suspicious link",
  romance: "romance",
  prize: "prize",
  job: "job offer",
  overpayment: "overpayment",
  off_platform: "moves to another app",
};

/** "Dad: 3 scam signals (fake authority, urgency, money request), 2 min ago" */
export function describeAlert(a: Pick<AlertDoc, "fromName" | "signalIds" | "createdAt">, nowMs = Date.now()): string {
  const n = a.signalIds.length;
  const sig = n ? `${n} scam signal${n === 1 ? "" : "s"} (${a.signalIds.map((s) => SIGNAL_WORDS[s] ?? s).join(", ")})` : "a possible scam";
  return `${a.fromName}: ${sig}, ${timeAgo(a.createdAt?.toMillis?.() ?? nowMs, nowMs)}`;
}

export function timeAgo(ms: number, nowMs = Date.now()): string {
  const s = Math.max(0, Math.round((nowMs - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Plain-language text for Firebase sign-in errors (the raw codes mean nothing to most people). */
export function signInErrorText(e: unknown): string {
  const code = (e as { code?: string } | null)?.code ?? "";
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed")
    return "Google sign-in isn't switched on for this app yet. (Owner: Firebase console → Authentication → Get started → Sign-in method → Google → Enable.)";
  if (code === "auth/unauthorized-domain") return "Sign-in isn't allowed from this web address yet. (Owner: add it under Authentication → Settings → Authorised domains.)";
  if (code === "auth/popup-blocked") return "The sign-in window was blocked. Allow pop-ups for this site and try again.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "The sign-in window was closed before finishing. Try again.";
  if (code === "auth/network-request-failed") return "Couldn't reach Google. Check the internet connection and try again.";
  return e instanceof Error ? e.message : String(e);
}
