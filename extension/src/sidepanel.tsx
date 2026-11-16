// Side panel: the same React check UI as the web app (reused from @secondlook/web), so the
// Prompt API / Firebase AI Logic calls run in this page, not in the service worker.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, CheckPage, SettingsPage, SetupPage, useApp } from "@secondlook/web/ui";
import "@secondlook/web/styles.css";
import "./sidepanel.css";
import { PENDING_KEY, type PendingCheck } from "./messages";

function usePending(): PendingCheck | null {
  const [pending, setPending] = useState<PendingCheck | null>(null);
  useEffect(() => {
    void chrome.storage.session.get(PENDING_KEY).then((r) => setPending((r[PENDING_KEY] as PendingCheck | undefined) ?? null));
    const on = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && changes[PENDING_KEY]?.newValue) setPending(changes[PENDING_KEY].newValue as PendingCheck);
    };
    chrome.storage.onChanged.addListener(on);
    return () => chrome.storage.onChanged.removeListener(on);
  }, []);
  return pending;
}

function Panel() {
  const { settings, nano } = useApp();
  const pending = usePending();
  const [tab, setTab] = useState<"check" | "setup" | "settings">(settings.onboarded || nano === "available" ? "check" : "setup");

  useEffect(() => {
    if (pending) setTab("check");
  }, [pending]);

  return (
    <>
      <header className="topbar">
        <span className="brand"><img src="icons/icon48.png" alt="" width={28} height={28} /> SecondLook</span>
        <nav aria-label="Panel">
          <a href="#check" aria-current={tab === "check" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("check"); }}>Check</a>
          <a href="#setup" aria-current={tab === "setup" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("setup"); }}>Model</a>
          <a href="#settings" aria-current={tab === "settings" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("settings"); }}>Settings</a>
        </nav>
      </header>
      <main>
        {tab === "check" && (
          <>
            {pending?.kind === "page" && pending.url && <p className="muted panel-source">Checking the page at {new URL(pending.url).host}</p>}
            <CheckPage compact initialText={pending?.text} initialKind={pending?.kind} requestId={pending?.id} />
            {!pending && <p className="muted">Tip: select text on any page (WhatsApp Web, Gmail…), right-click, and choose <strong>Check with SecondLook</strong>.</p>}
          </>
        )}
        {tab === "setup" && <SetupPage />}
        {tab === "settings" && <SettingsPage />}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider surface="extension">
      <Panel />
    </AppProvider>
  </StrictMode>,
);
