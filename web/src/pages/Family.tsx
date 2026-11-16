import { useEffect, useState } from "react";
import { useApp } from "../lib/app-context";
import { createCircle, joinCircle, myCircles, signIn, signOutUser, type Circle } from "../lib/family";

export function FamilyPage({ joinId }: { joinId?: string }) {
  const { services, user } = useApp();
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [code, setCode] = useState(joinId ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!services || !user) return;
    myCircles(services.db, user.uid).then(setCircles).catch((e: Error) => setMsg(e.message));
  }, [services, user]);

  if (!services) {
    return (
      <div className="page">
        <h1>Family circle</h1>
        <div className="notice">The family circle needs Firebase to be configured. Quick checks still work without it.</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Family circle</h1>
        <p className="lead">Link someone you trust. When a message looks like a scam, they get a short alert with the warning signs. <strong>They never see your messages.</strong></p>
        <button className="primary big" onClick={() => signIn(services.auth).catch((e: Error) => setMsg(e.message))}>Sign in with Google</button>
        {msg && <p className="notice notice-error">{msg}</p>}
      </div>
    );
  }

  const mine = circles?.find((c) => c.ownerUid === user.uid);
  const guarding = circles?.filter((c) => c.ownerUid !== user.uid) ?? [];
  const inviteUrl = mine ? `${location.origin}${location.pathname}#/join/${mine.id}` : "";

  return (
    <div className="page">
      <h1>Family circle</h1>
      <p className="muted">Signed in as {user.displayName ?? user.email}. <button className="link-button" onClick={() => signOutUser(services.auth)}>Sign out</button></p>

      <section className="card">
        <h2>Protect me</h2>
        {mine ? (
          <>
            <p>Send this link to a family member you trust. When they open it and sign in, they'll get your alerts.</p>
            <div className="invite">
              <code data-testid="invite-url">{inviteUrl}</code>
              <button className="secondary" onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => setCopied(true))}>{copied ? "Copied" : "Copy link"}</button>
            </div>
            <p className="muted">{mine.memberUids.length - 1} family member{mine.memberUids.length === 2 ? "" : "s"} linked.</p>
          </>
        ) : (
          <>
            <p>Create your circle, then share the invite link.</p>
            <button className="primary" onClick={async () => { const c = await createCircle(services.db, user); setCircles([...(circles ?? []), c]); }}>Create my family circle</button>
          </>
        )}
      </section>

      <section className="card">
        <h2>Look out for someone</h2>
        {guarding.length > 0 && <p>You're in {guarding.map((c) => `${c.ownerName}'s`).join(", ")} circle. <a href="#/guardian">Open the alerts</a>.</p>}
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            const id = code.trim().split("/").pop() ?? "";
            if (!id) return;
            try {
              await joinCircle(services.db, user, id);
              setCircles(await myCircles(services.db, user.uid));
              setMsg("You've joined. You'll see alerts on the Alerts page.");
            } catch {
              setMsg("That invite didn't work. Check the link and try again.");
            }
          }}
        >
          <input aria-label="Invite link or code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the invite link" />
          <button className="primary" type="submit">Join</button>
        </form>
        {msg && <p className="muted" role="status">{msg}</p>}
      </section>
    </div>
  );
}
