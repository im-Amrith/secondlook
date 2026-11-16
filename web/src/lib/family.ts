// Family circle on Firestore. Alerts hold METADATA ONLY: level, score, signal ids, which path ran
// (device/cloud/rules), platform and time. Never the message text, excerpts or redacted text.
// firestore.rules enforces the same allow-list of fields.
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, type Firestore } from "firebase/firestore";
import { onAuthStateChanged, signOut, type Auth, type User } from "firebase/auth";
import { signInGoogle } from "#signin";
import type { AlertDoc, Circle } from "./family-model";

export * from "./family-model";

export const watchUser = (auth: Auth, cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);
export const signIn = (auth: Auth) => signInGoogle(auth);
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
