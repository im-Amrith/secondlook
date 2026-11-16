// Family circle on Firestore. Alerts hold METADATA ONLY: level, score, signal ids, which path ran
// (device/cloud/rules), platform and time. Never the message text, excerpts or redacted text.
// firestore.rules enforces the same allow-list of fields.
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type Firestore, type Timestamp } from "firebase/firestore";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Auth, type User } from "firebase/auth";
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

export const watchUser = (auth: Auth, cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);
export const signIn = (auth: Auth) => signInWithPopup(auth, new GoogleAuthProvider());
export const signOutUser = (auth: Auth) => signOut(auth);

function randomId(n = 20): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

/** The person being protected creates the circle; the circle id doubles as the invite code. */
export async function createCircle(db: Firestore, user: User): Promise<Circle> {
  const id = randomId();
  const circle: Omit<Circle, "id"> = { ownerUid: user.uid, ownerName: (user.displayName || "Me").split(" ")[0]!, memberUids: [user.uid] };
  await setDoc(doc(db, "circles", id), { ...circle, createdAt: serverTimestamp() });
  return { id, ...circle };
}

export async function joinCircle(db: Firestore, user: User, circleId: string): Promise<void> {
  await updateDoc(doc(db, "circles", circleId), { memberUids: arrayUnion(user.uid) });
}

export async function myCircles(db: Firestore, uid: string): Promise<Circle[]> {
  const snap = await getDocs(query(collection(db, "circles"), where("memberUids", "array-contains", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Circle, "id">) }));
}

export async function getCircle(db: Firestore, id: string): Promise<Circle | null> {
  const d = await getDoc(doc(db, "circles", id));
  return d.exists() ? { id: d.id, ...(d.data() as Omit<Circle, "id">) } : null;
}

export async function sendAlert(db: Firestore, payload: Omit<AlertDoc, "createdAt" | "id">): Promise<void> {
  await addDoc(collection(db, "alerts"), { ...payload, createdAt: serverTimestamp() });
}

/** Real-time feed for guardians: every alert in any circle the user belongs to. */
export function listenAlerts(db: Firestore, uid: string, cb: (alerts: AlertDoc[]) => void, onError?: (e: Error) => void): () => void {
  const q = query(collection(db, "alerts"), where("memberUids", "array-contains", uid), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AlertDoc) }))),
    (e) => onError?.(e),
  );
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
