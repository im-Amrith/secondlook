// Firestore security rules tests. Needs the emulator:
//   npm run test:rules        (from the repo root; uses Node 22 for the Firebase CLI)
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-secondlook",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  // Dad's circle with one guardian (Asha).
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "circles/c1"), { ownerUid: "dad", ownerName: "Dad", memberUids: ["dad", "asha"] });
  });
});

const db = (uid: string) => env.authenticatedContext(uid).firestore();
const goodAlert = () => ({
  circleId: "c1",
  fromUid: "dad",
  fromName: "Dad",
  memberUids: ["dad", "asha"],
  level: "high",
  score: 91,
  signalIds: ["authority", "secrecy", "money_request"],
  source: "ON_DEVICE",
  platform: "web",
  createdAt: serverTimestamp(),
});

describe("circles", () => {
  it("owner can create a circle with only themselves in it", async () => {
    await assertSucceeds(setDoc(doc(db("mom"), "circles/c2"), { ownerUid: "mom", ownerName: "Mom", memberUids: ["mom"], createdAt: serverTimestamp() }));
  });
  it("can't create a circle that already includes other people, or with extra fields", async () => {
    await assertFails(setDoc(doc(db("mom"), "circles/c3"), { ownerUid: "mom", ownerName: "Mom", memberUids: ["mom", "x"], createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db("mom"), "circles/c4"), { ownerUid: "mom", ownerName: "Mom", memberUids: ["mom"], createdAt: serverTimestamp(), notes: "hi" }));
    await assertFails(setDoc(doc(db("mom"), "circles/c5"), { ownerUid: "dad", ownerName: "Dad", memberUids: ["mom"], createdAt: serverTimestamp() }));
  });
  it("someone with the invite code can add only themselves", async () => {
    await assertSucceeds(updateDoc(doc(db("ravi"), "circles/c1"), { memberUids: arrayUnion("ravi") }));
    await assertFails(updateDoc(doc(db("eve"), "circles/c1"), { memberUids: arrayUnion("eve", "mallory") }));
    await assertFails(updateDoc(doc(db("eve"), "circles/c1"), { ownerUid: "eve" }));
  });
  it("only members can read a circle", async () => {
    await assertSucceeds(getDoc(doc(db("asha"), "circles/c1")));
    await assertFails(getDoc(doc(db("eve"), "circles/c1")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "circles/c1")));
  });
});

describe("alerts: metadata only", () => {
  it("a member can send a metadata-only alert", async () => {
    await assertSucceeds(addDoc(collection(db("dad"), "alerts"), goodAlert()));
  });
  it("rejects any field that could carry message text", async () => {
    for (const extra of [{ text: "CBI officer says pay now" }, { excerpt: "pay now" }, { sentText: "[PHONE_1]" }, { explanation: "Fake police" }]) {
      await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), ...extra }));
    }
  });
  it("rejects bad values and impersonation", async () => {
    await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), score: "91" }));
    await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), level: "extreme" }));
    await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), source: "SOMEWHERE" }));
    await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), signalIds: Array(12).fill("urgency") }));
    await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), fromName: "x".repeat(41) }));
    await assertFails(addDoc(collection(db("asha"), "alerts"), goodAlert())); // fromUid isn't asha
    await assertFails(addDoc(collection(db("eve"), "alerts"), { ...goodAlert(), fromUid: "eve" })); // not a member
    await assertFails(addDoc(collection(db("dad"), "alerts"), { ...goodAlert(), memberUids: ["dad", "asha", "eve"] })); // audience must match the circle
  });
  it("members can read and query alerts; outsiders can't; nobody can edit", async () => {
    let id = "";
    await env.withSecurityRulesDisabled(async (ctx) => {
      id = (await addDoc(collection(ctx.firestore(), "alerts"), { ...goodAlert(), createdAt: new Date() })).id;
    });
    await assertSucceeds(getDoc(doc(db("asha"), "alerts", id)));
    await assertSucceeds(getDocs(query(collection(db("asha"), "alerts"), where("memberUids", "array-contains", "asha"))));
    await assertFails(getDoc(doc(db("eve"), "alerts", id)));
    await assertFails(getDocs(query(collection(db("eve"), "alerts"))));
    await assertFails(updateDoc(doc(db("dad"), "alerts", id), { level: "low" }));
  });
});

describe("radar: weekly counters only", () => {
  const anon = () => env.unauthenticatedContext().firestore();
  const id = "2026-W48_digital_arrest_KL";
  const counter = (count: unknown, extra: Record<string, unknown> = {}) => ({ week: "2026-W48", pattern: "digital_arrest", region: "KL", count, updatedAt: serverTimestamp(), ...extra });

  it("anyone can start a counter at 1 and add 1, and anyone can read", async () => {
    await assertSucceeds(setDoc(doc(anon(), "radar", id), counter(1)));
    await assertSucceeds(updateDoc(doc(anon(), "radar", id), { count: 2, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(anon(), "radar", id)));
  });

  it("can't jump the count, reset it, or delete it", async () => {
    await assertFails(setDoc(doc(anon(), "radar", id), counter(50)));
    await assertSucceeds(setDoc(doc(anon(), "radar", id), counter(1)));
    await assertFails(updateDoc(doc(anon(), "radar", id), { count: 10, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(anon(), "radar", id), { count: 0, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(anon(), "radar", id)));
  });

  it("never stores text: extra fields, unknown patterns or regions, and mismatched ids are refused", async () => {
    await assertFails(setDoc(doc(anon(), "radar", id), counter(1, { message: "You are under digital arrest" })));
    await assertFails(setDoc(doc(anon(), "radar", "2026-W48_made_up_KL"), counter(1, { pattern: "made_up" })));
    await assertFails(setDoc(doc(anon(), "radar", "2026-W48_digital_arrest_XX"), counter(1, { region: "XX" })));
    await assertFails(setDoc(doc(anon(), "radar", "2026-W48_digital_arrest_MH"), counter(1)));
    await assertFails(setDoc(doc(anon(), "radar", "last week_digital_arrest_KL"), counter(1, { week: "last week" })));
  });
});
