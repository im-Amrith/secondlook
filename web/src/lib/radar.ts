// Scam radar on Firestore: weekly counters only (see shared/src/radar.ts and firestore.rules).
import { collection, doc, getDocs, increment, query, serverTimestamp, setDoc, where, type Firestore } from "firebase/firestore";
import { radarDocId, type RadarCount, type RadarPattern } from "@secondlook/shared";

/**
 * Add one report. Writes exactly {week, pattern, region, count: +1, updatedAt}: nothing about the
 * message or the person. merge + increment creates the counter at 1 or adds 1 to it.
 */
export async function reportToRadar(db: Firestore, week: string, pattern: RadarPattern, region: string): Promise<void> {
  await setDoc(doc(db, "radar", radarDocId(week, pattern, region)), { week, pattern, region, count: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

/** All counters for the given weeks (two weeks × patterns × regions: at most a few hundred small docs). */
export async function loadRadar(db: Firestore, weeks: string[]): Promise<RadarCount[]> {
  const snap = await getDocs(query(collection(db, "radar"), where("week", "in", weeks)));
  return snap.docs.map((d) => d.data() as RadarCount);
}
