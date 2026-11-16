// Side panel: the same React check UI as the web app (reused from @secondlook/web), so the
// Prompt API / Firebase AI Logic calls run in this page, not in the service worker.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, CheckPage, FamilyPage, GuardianPage, SettingsPage, SetupPage, useApp } from "@secondlook/web/ui";
import "@secondlook/web/styles.css";
import "./sidepanel.css";
import { PENDING_KEY, readActiveTab, type PendingCheck } from "./messages";

function usePending(): [PendingCheck | null, (p: PendingCheck) => void] {
  const [pending, setPending] = useState<PendingCheck | null>(null);
  useEffect(() => {
    void chrome.storage.session.get(PENDING_KEY).then((r) => setPending((r[PENDING_KEY] as PendingCheck | undefined) ?? null));
    const on = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && changes[PENDING_KEY]?.newValue) setPending(changes[PENDING_KEY].newValue as PendingCheck);
    };
    chrome.storage.onChanged.addListener(on);
    return () => chrome.storage.onChanged.removeListener(on);
  }, []);
  return [pending, setPending];
}

type Tab = "check" | "family" | "alerts" | "setup" | "settings";

/** Hash routes used by the shared web pages (e.g. "#/family", "#/guardian") map onto panel tabs. */
function tabFromHash(hash: string): Tab | null {
  const p = hash.replace(/^#\/?/, "");
  if (p.startsWith("family") || p.startsWith("join")) return "family";
  if (p.startsWith("guardian")) return "alerts";
  if (p.startsWith("setup")) return "setup";
  if (p.startsWith("settings")) return "settings";
  if (p === "" || p === "check") return "check";
  return null;
}

const TABS: { id: Tab; label: string; hash: string }[] = [
  { id: "check", label: "Check", hash: "#/" },
  { id: "family", label: "Family", hash: "#/family" },
  { id: "alerts", label: "Alerts", hash: "#/guardian" },
  { id: "setup", label: "Model", hash: "#/setup" },
  { id: "settings", label: "Settings", hash: "#/settings" },
];

function Panel() {
  const { settings, nano } = useApp();
  const [pending, setPending] = usePending();
  const [pageError, setPageError] = useState<string | null>(null);

  async function checkThisPage() {
    setPageError(null);
    try {
      const page = await readActiveTab();
      if (!page) return setPageError("This page can't be read (only normal web pages can).");
      setPending({ id: Date.now(), kind: "page", text: page.text, url: page.url });
    } catch {
      setPageError("This page can't be read.");
    }
  }
  const [tab, setTab] = useState<Tab>(() => tabFromHash(location.hash) ?? (settings.onboarded || nano === "available" ? "check" : "setup"));

  useEffect(() => {
    const on = () => setTab((t) => tabFromHash(location.hash) ?? t);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    if (pending) setTab("check");
  }, [pending]);

  return (
    <>
      <header className="topbar">
        <span className="brand"><img src="icons/icon48.png" alt="" width={28} height={28} /> SecondLook</span>
        <nav aria-label="Panel">
          {TABS.map((t) => (
            <a key={t.id} href={t.hash} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>{t.label}</a>
          ))}
        </nav>
      </header>
      <main>
        {tab === "check" && (
          <>
            {pending?.kind === "page" && pending.url && <p className="muted panel-source">Checking the page at {new URL(pending.url).host}</p>}
            <button type="button" className="secondary panel-page-button" onClick={() => void checkThisPage()}>Check the page I'm on</button>
            {pageError && <p className="notice notice-error" role="alert">{pageError}</p>}
            <CheckPage compact initialText={pending?.text} initialKind={pending?.kind} requestId={pending?.id} />
            {!pending && <p className="muted">Tip: select text on any page (WhatsApp Web, Gmail…), right-click, and choose <strong>Check with SecondLook</strong>.</p>}
          </>
        )}
        {tab === "family" && <FamilyPage />}
        {tab === "alerts" && <GuardianPage />}
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
