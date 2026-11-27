import { useEffect, useRef, useState } from "react";
import { scoreRules } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { signalText } from "../lib/i18n";
import { isFirmRefusal, practicePrompt, PRACTICE, PRACTICE_KINDS, REMEMBER, replyOrder, type PracticeScenario } from "../lib/practice";
import { ReadAloud } from "../components/ReadAloud";
import { ArrowLeft, CircleCheck, Ico, Landmark, ShieldAlert, Smartphone, SourceIcon, TriangleAlert } from "../components/icons";
import type { LucideIcon } from "lucide-react";

const SCENARIO_ICON: Record<string, LucideIcon> = { digital_arrest: ShieldAlert, kyc: Landmark, family: Smartphone };

type Answer = "safe" | "unsafe";

/**
 * Practise saying no: short practice calls that show the tricks before a real scammer uses them.
 * Guided mode is scripted (every device, every language). Free mode lets Gemini Nano play the
 * caller, on the device only.
 */
export function PracticePage() {
  const { t, lang } = useT();
  const app = useApp();
  const [scenario, setScenario] = useState<PracticeScenario | null>(null);
  const [free, setFree] = useState(false);

  if (scenario) return <Guided scenario={scenario} onExit={() => setScenario(null)} />;
  if (free) return <FreePractice onExit={() => setFree(false)} />;

  return (
    <div className="page page-wide">
      <h1>{t("practice.title")}</h1>
      <p className="lead">{t("practice.lead")}</p>
      <div className="practice-list">
        {PRACTICE.map((s) => (
          <button key={s.id} type="button" className="practice-card" onClick={() => setScenario(s)}>
            <span className="practice-icon"><Ico icon={SCENARIO_ICON[s.id] ?? ShieldAlert} size={26} /></span>
            <span>{s.title[lang]}</span>
          </button>
        ))}
      </div>
      <section className="card">
        <h2>{t("practice.freeTitle")}</h2>
        <p className="muted">{t("practice.freeHelp")}</p>
        <button type="button" className="secondary big" disabled={!app.practice || app.nano !== "available"} onClick={() => setFree(true)}>
          {t("practice.freeStart")}
        </button>
        {(!app.practice || app.nano !== "available") && <p className="muted small">{t("practice.freeNeedsNano")}</p>}
      </section>
    </div>
  );
}

function Guided({ scenario, onExit }: { scenario: PracticeScenario; onExit: () => void }) {
  const { t, lang } = useT();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const done = answers.length === scenario.steps.length;
  const current = scenario.steps[step];
  const answered = answers.length > step;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [answers.length, step]);

  const spotted = answers.filter((a) => a === "safe").length;

  return (
    <div className="page practice-page">
      <button type="button" className="link-button" onClick={onExit}><Ico icon={ArrowLeft} /> {t("practice.back")}</button>
      <h1>{scenario.title[lang]}</h1>
      <p className="muted">{t("practice.note")}</p>

      <ol className="chat" aria-live="polite">
        {scenario.steps.slice(0, step + 1).map((s, i) => (
          <li key={i} className="chat-turn">
            <div className="bubble bubble-caller">
              <span className="bubble-who">{t("practice.caller")}</span>
              {s.line[lang]}
            </div>
            {answers[i] && (
              <>
                <div className="bubble bubble-you">
                  <span className="bubble-who">{t("practice.you")}</span>
                  {s[answers[i]!].reply[lang]}
                </div>
                <div className={`practice-feedback practice-${answers[i]}`} role="status">
                  <strong>{answers[i] === "safe" ? <><Ico icon={CircleCheck} /> {t("practice.good")}</> : <><Ico icon={TriangleAlert} /> {t("practice.careful")}</>}</strong>{" "}
                  <span className="trick-chip">{t("practice.trick")}: {s.trick[lang]}</span>
                  <p>{s[answers[i]!].feedback[lang]}</p>
                </div>
              </>
            )}
          </li>
        ))}
      </ol>

      {!done && current && !answered && (
        <div className="practice-choices">
          <ReadAloud text={current.line[lang]} />
          <p className="label">{t("practice.whatSay")}</p>
          {replyOrder(scenario.id, step).map((k) => (
            <button key={k} type="button" className="secondary big practice-reply" onClick={() => setAnswers((a) => [...a, k])}>
              {current[k].reply[lang]}
            </button>
          ))}
        </div>
      )}
      {!done && answered && (
        <button type="button" className="primary big" onClick={() => setStep((n) => n + 1)}>{t("practice.next")}</button>
      )}

      {done && (
        <section className="card practice-summary" aria-labelledby="practice-done">
          <h2 id="practice-done">{t("practice.score", { n: spotted, total: scenario.steps.length })}</h2>
          <ul className="trick-list">
            {scenario.steps.map((s, i) => (
              <li key={i} className={answers[i] === "safe" ? "trick-ok" : "trick-miss"}><Ico icon={answers[i] === "safe" ? CircleCheck : TriangleAlert} /> {s.trick[lang]}</li>
            ))}
          </ul>
          <h3>{t("practice.remember")}</h3>
          <ol>{REMEMBER.map((r, i) => <li key={i}>{r[lang]}</li>)}</ol>
          <ReadAloud text={`${t("practice.remember")} ${REMEMBER.map((r) => r[lang]).join(" ")}`} />
          <div className="row">
            <button type="button" className="secondary" onClick={() => { setAnswers([]); setStep(0); }}>{t("practice.again")}</button>
            <button type="button" className="secondary" onClick={onExit}>{t("practice.other")}</button>
          </div>
        </section>
      )}
      <div ref={endRef} />
    </div>
  );
}

const MAX_CALLER_TURNS = 5;

function FreePractice({ onExit }: { onExit: () => void }) {
  const app = useApp();
  const { t } = useT();
  const [kind] = useState(() => PRACTICE_KINDS[Math.floor(Math.random() * PRACTICE_KINDS.length)]!);
  const [turns, setTurns] = useState<{ who: "caller" | "you"; text: string }[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const callerTurns = turns.filter((x) => x.who === "caller").length;
  const over = won || callerTurns >= MAX_CALLER_TURNS;

  async function next(history: typeof turns) {
    if (!app.practice) return;
    setBusy(true);
    setError(null);
    try {
      const r = await app.practice.run(practicePrompt(kind, history));
      const text = r.text.replace(/^\s*(caller|scammer)\s*:\s*/i, "").trim().slice(0, 400);
      if (!text) throw new Error("empty");
      setTurns([...history, { who: "caller", text }]);
    } catch {
      setError(t("practice.freeError"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void next([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = reply.trim();
    if (!text || busy) return;
    const history = [...turns, { who: "you" as const, text }];
    setTurns(history);
    setReply("");
    if (isFirmRefusal(text)) return setWon(true);
    if (callerTurns < MAX_CALLER_TURNS) void next(history);
  }

  return (
    <div className="page practice-page">
      <button type="button" className="link-button" onClick={onExit}><Ico icon={ArrowLeft} /> {t("practice.back")}</button>
      <h1>{t("practice.freeTitle")}</h1>
      <p className="badge badge-device"><SourceIcon route="device" /> {t("practice.freePrivate")}</p>
      <ol className="chat" aria-live="polite">
        {turns.map((x, i) => {
          const tricks = x.who === "caller" ? scoreRules(x.text).signals : [];
          return (
            <li key={i} className="chat-turn">
              <div className={`bubble ${x.who === "caller" ? "bubble-caller" : "bubble-you"}`}>
                <span className="bubble-who">{x.who === "caller" ? t("practice.caller") : t("practice.you")}</span>
                {x.text}
              </div>
              {tricks.length > 0 && (
                <p className="trick-line">
                  {t("practice.tricksHere")} {[...new Set(tricks.map((s) => signalText(s, "en").label))].map((l) => <span key={l} className="trick-chip">{l}</span>)}
                </p>
              )}
            </li>
          );
        })}
        {busy && <li className="muted">{t("practice.typing")}</li>}
      </ol>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {won && <p className="practice-feedback practice-safe" role="status"><strong><Ico icon={CircleCheck} /> {t("practice.freeWon")}</strong></p>}
      {!won && over && <p className="practice-feedback practice-unsafe" role="status">{t("practice.freeOver")}</p>}
      {!over && (
        <form onSubmit={send} className="row">
          <label htmlFor="practice-reply" className="label">{t("practice.yourReply")}</label>
          <input id="practice-reply" value={reply} onChange={(e) => setReply(e.target.value)} autoComplete="off" disabled={busy && turns.length === 0} />
          <button className="primary" type="submit" disabled={!reply.trim() || busy}>{t("practice.send")}</button>
        </form>
      )}
      {over && <button type="button" className="secondary big" onClick={onExit}>{t("practice.other")}</button>}
    </div>
  );
}
