import { lazy, Suspense, useEffect, useState } from "react";
import { useApp } from "./lib/app-context";
import { useT } from "./lib/useT";
import type { Key } from "./lib/i18n";
import { CheckPage } from "./pages/Check";
import { SetupPage } from "./pages/Setup";
import { SettingsPage } from "./pages/Settings";
import { HowPage } from "./pages/How";
// Pages that need Firestore/Auth (or big eval data) load on demand.
const FamilyPage = lazy(() => import("./pages/Family").then((m) => ({ default: m.FamilyPage })));
const GuardianPage = lazy(() => import("./pages/Guardian").then((m) => ({ default: m.GuardianPage })));
const CallGuardPage = lazy(() => import("./pages/CallGuard").then((m) => ({ default: m.CallGuardPage })));
const PracticePage = lazy(() => import("./pages/Practice").then((m) => ({ default: m.PracticePage })));
const RadarPage = lazy(() => import("./pages/Radar").then((m) => ({ default: m.RadarPage })));
const PausePage = lazy(() => import("./pages/Pause").then((m) => ({ default: m.PausePage })));
const EvalsPage = lazy(() => import("./pages/Evals").then((m) => ({ default: m.EvalsPage })));

function useHash(): string {
  const [hash, setHash] = useState(() => location.hash || "#/");
  useEffect(() => {
    const on = () => setHash(location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

// Simple line icons (inline, so they work offline and follow the text colour).
const ICON: Record<string, React.ReactNode> = {
  check: <><path d="M4 5h16v11H9l-5 4z" /><path d="m9 10 2 2 4-4" /></>,
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  practice: <><path d="M12 3 2 8l10 5 10-5z" /><path d="M6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></>,
  family: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M15 15.5c.6-.3 1.3-.5 2-.5 2.8 0 4 2 4 5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
};

/** The five main places, also the phone's bottom tab bar. The rest is linked from the footer. */
const NAV: { href: string; label: Key; icon: keyof typeof ICON }[] = [
  { href: "#/", label: "nav.check", icon: "check" },
  { href: "#/call", label: "nav.call", icon: "call" },
  { href: "#/practice", label: "nav.practice", icon: "practice" },
  { href: "#/family", label: "nav.family", icon: "family" },
  { href: "#/settings", label: "nav.settings", icon: "settings" },
];

const FOOTER: { href: string; label: Key }[] = [
  { href: "#/guardian", label: "nav.alerts" },
  { href: "#/radar", label: "nav.radar" },
  { href: "#/how", label: "nav.privacy" },
];

export function App() {
  const hash = useHash();
  const { settings } = useApp();
  const { t, lang } = useT();
  const path = hash.replace(/^#/, "") || "/";

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", settings.largeText);
  }, [settings.largeText]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  let page: React.ReactNode;
  if (path === "/" && !settings.onboarded) page = <SetupPage />;
  else if (path === "/" ) page = <CheckPage />;
  else if (path === "/setup") page = <SetupPage />;
  else if (path === "/settings") page = <SettingsPage />;
  else if (path === "/how") page = <HowPage />;
  else if (path === "/family") page = <FamilyPage />;
  else if (path.startsWith("/join/")) page = <FamilyPage joinId={path.slice("/join/".length)} />;
  else if (path === "/guardian") page = <GuardianPage />;
  else if (path === "/evals") page = <EvalsPage />;
  else if (path === "/call") page = <CallGuardPage />;
  else if (path === "/pause") page = <PausePage />;
  else if (path === "/practice") page = <PracticePage />;
  else if (path === "/radar") page = <RadarPage />;
  else page = <CheckPage />;

  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand" aria-label="SecondLook home">
          <img src="/icon.svg" alt="" width={32} height={32} />
          <span>SecondLook</span>
        </a>
        <nav aria-label="Main" className="mainnav">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={(n.href === "#/" ? path === "/" : path.startsWith(n.href.slice(1))) ? "page" : undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON[n.icon]}</svg>
              <span>{t(n.label)}</span>
            </a>
          ))}
        </nav>
      </header>
      <main>
        <Suspense fallback={<p className="muted">Loading…</p>}>{page}</Suspense>
      </main>
      <footer className="footer muted">
        <ul className="footer-links">
          {FOOTER.map((f) => <li key={f.href}><a href={f.href}>{t(f.label)}</a></li>)}
        </ul>
        {(() => {
          // Keep the link clickable inside the translated sentence.
          const [before, after] = t("footer").split("{site}");
          return (
            <>
              {before}
              <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a>
              {after}
            </>
          );
        })()}
      </footer>
    </>
  );
}
