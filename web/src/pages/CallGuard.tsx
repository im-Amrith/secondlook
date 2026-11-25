import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addTranscript, CALL_QUESTIONS, checkMessage, combine, createCallState, scoreAnswers, type CallState, type Level, type Verdict } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { callQuestionText, callWarningText, signalText, UI_LANGS } from "../lib/i18n";
import { installSpeech, nanoAudioStatus, openMicrophone, speechStatus, startDemo, startNanoAudio, startSpeech, watchLevel, type EngineStatus, type Listening, type ListenEngine } from "../lib/listen";
import type { TtsLang } from "../lib/tts/voices";
import { TrustedContact } from "../components/TrustedContact";
import { FamilyAlertButton } from "../components/FamilyAlertButton";
import { ReadAloud } from "../components/ReadAloud";
import { RadarButton } from "../components/RadarButton";

type Mode = "idle" | "preparing" | "listening" | "demo";

const LEVEL_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };
/** Ask the private model for a second opinion at most this often, and only after new words. */
const AI_EVERY_MS = 15_000;

/**
 * Call Guard: listens to a call on speaker and warns while it's happening. Speech is recognised
 * on this device only (lib/listen.ts); the words stay in this component's memory and are gone
 * when the page closes. With Gemini Nano available, the private model gives a second opinion,
 * also on the device. The cloud is never used here.
 */
export function CallGuardPage() {
  const app = useApp();
  const { t, lang } = useT();
  const [callLang, setCallLang] = useState<TtsLang>(lang);
  const [engine, setEngine] = useState<{ speech: { status: EngineStatus; tag: string }; nano: EngineStatus } | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [used, setUsed] = useState<ListenEngine | null>(null);
  const [state, setState] = useState<CallState>(createCallState);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [ai, setAi] = useState<{ level: Level; explanation: string } | null>(null);
  const listening = useRef<Listening | null>(null);
  const cleanup = useRef<(() => void)[]>([]);
  const started = useRef(0);
  const aiRef = useRef({ last: 0, lines: 0, busy: false });

  // Which on-device engines this browser has, for the chosen language.
  useEffect(() => {
    let alive = true;
    setEngine(null);
    void Promise.all([speechStatus(callLang), nanoAudioStatus()]).then(([speech, nano]) => alive && setEngine({ speech, nano }));
    return () => {
      alive = false;
    };
  }, [callLang]);

  const stop = useCallback(() => {
    listening.current?.stop();
    listening.current = null;
    cleanup.current.forEach((f) => f());
    cleanup.current = [];
    setMode("idle");
    setInterim("");
    setLevel(0);
  }, []);
  useEffect(() => stop, [stop]);

  const onText = useCallback((text: string) => {
    setState((s) => addTranscript(s, text, Date.now() - started.current, app.config.rules));
    setInterim("");
  }, [app.config.rules]);

  const handlers = { onText, onInterim: setInterim, onLevel: setLevel, onError: (m: string) => setError(m) };

  async function start() {
    setError(null);
    started.current = Date.now();
    const sp = engine?.speech;
    const useSpeech = sp && (sp.status === "available" || sp.status === "downloadable" || sp.status === "downloading");
    const useNano = !useSpeech && (engine?.nano === "available" || engine?.nano === "downloadable");
    if (!useSpeech && !useNano) return;
    setMode("preparing");
    try {
      // Ask for the microphone first so the permission prompt comes straight from the click.
      const mic = await openMicrophone();
      cleanup.current.push(() => mic.getTracks().forEach((tr) => tr.stop()));
      if (useSpeech) {
        if (sp!.status !== "available" && !(await installSpeech(sp!.tag))) throw new Error(t("call.engineNone"));
        cleanup.current.push(watchLevel(mic, setLevel));
        listening.current = startSpeech(sp!.tag, handlers);
        setUsed("speech");
      } else {
        listening.current = await startNanoAudio(mic, handlers);
        setUsed("nano");
      }
      setMode("listening");
    } catch (e) {
      stop();
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? t("call.micError") : e instanceof Error ? e.message : String(e));
    }
  }

  function demo() {
    stop();
    setState(createCallState());
    setAi(null);
    started.current = Date.now();
    listening.current = startDemo(callLang, { ...handlers, onEnd: () => setMode("idle") });
    setUsed("demo");
    setMode("demo");
  }

  function reset() {
    stop();
    setState(createCallState());
    setAnswers({});
    setAi(null);
    setTyped("");
    setError(null);
    aiRef.current = { last: 0, lines: 0, busy: false };
  }

  // Second opinion from Gemini Nano, on the device only (cloud is deliberately not passed in).
  useEffect(() => {
    const r = aiRef.current;
    if (app.nano !== "available" || !app.device || r.busy) return;
    if (state.lines.length < 2 || state.lines.length === r.lines || Date.now() - r.last < AI_EVERY_MS) return;
    r.busy = true;
    r.last = Date.now();
    r.lines = state.lines.length;
    const text = state.lines.map((l) => l.text).join("\n").slice(-3000);
    void checkMessage({ text, kind: "text" }, {
      platform: "web",
      nanoAvailable: () => true,
      online: () => navigator.onLine,
      device: app.device,
      cloud: undefined,
      settings: { neverCloud: true },
      config: { cloudEnabled: false, rules: app.config.rules },
    })
      .then((o) => {
        if (o.verdict.source === "ON_DEVICE") setAi({ level: o.verdict.level, explanation: o.verdict.explanation });
      })
      .catch(() => undefined)
      .finally(() => {
        r.busy = false;
      });
  }, [state.lines, app.nano, app.device, app.config.rules]);

  // Questions and live listening feed the same warning.
  const fromAnswers = useMemo(() => scoreAnswers(Object.entries(answers).filter(([, v]) => v).map(([k]) => k)), [answers]);
  const combined = useMemo(() => {
    const signals = [...state.signals];
    for (const s of fromAnswers.signals) if (!signals.some((x) => x.ruleId === s.ruleId)) signals.push({ ...s, at: 0 });
    let lvl: Level = LEVEL_RANK[state.level] >= LEVEL_RANK[fromAnswers.level] ? state.level : fromAnswers.level;
    if (ai && LEVEL_RANK[ai.level] > LEVEL_RANK[lvl]) lvl = ai.level;
    const score = Math.max(state.score, fromAnswers.score);
    const warn = state.warning ? { text: state.warning, rule: state.warningRule } : fromAnswers.warning ? { text: fromAnswers.warning, rule: fromAnswers.warningRule } : null;
    return { level: lvl, score, signals, warn };
  }, [state, fromAnswers, ai]);

  const verdict: Verdict = useMemo(
    () => combine({ score: combined.score, level: combined.level, signals: combined.signals, explanation: state.explanation, advice: state.advice }, null, { source: ai ? "ON_DEVICE" : "RULES" }),
    [combined, state.explanation, state.advice, ai],
  );

  const canListen = engine && (engine.speech.status !== "unsupported" && engine.speech.status !== "unavailable" || engine.nano === "available" || engine.nano === "downloadable");
  const active = mode === "listening" || mode === "demo";
  const warningText = combined.warn ? callWarningText(combined.warn.rule, combined.warn.text, lang) : null;
  const spoken = warningText ? `${combined.level === "high" ? t("call.hangUp") : t("call.careful")} ${warningText}` : "";

  return (
    <div className="page call-page">
      <h1>{t("call.title")}</h1>
      <p className="lead">{t("call.lead")}</p>
      <p className="badge badge-device call-private">🟢 {t("call.private")}</p>

      <div className="card">
        <p className="label" id="call-lang">{t("call.langQ")}</p>
        <div className="row" role="group" aria-labelledby="call-lang">
          {UI_LANGS.map((l) => (
            <button key={l.id} type="button" className={callLang === l.id ? "chip chip-on" : "chip"} aria-pressed={callLang === l.id} disabled={active} onClick={() => setCallLang(l.id)}>{l.name}</button>
          ))}
        </div>

        {!active ? (
          <>
            <button type="button" className="primary big" disabled={!canListen || mode === "preparing"} onClick={() => void start()}>
              {mode === "preparing" ? t("call.preparing") : t("call.start")}
            </button>
            {engine && !canListen && <p className="muted">{t("call.engineNone")}</p>}
            <button type="button" className="link-button" onClick={demo}>{t("call.demo")}</button>
          </>
        ) : (
          <>
            <button type="button" className="secondary big" onClick={stop}>{t("call.stop")}</button>
            <p className="muted listening-line" role="status">
              <span className="mic-level" aria-hidden><span style={{ transform: `scaleX(${mode === "demo" ? 0 : level})` }} /></span>
              {mode === "demo" ? t("call.demoNote") : `${t("call.listening")} ${used === "nano" ? t("call.engineNano") : t("call.engineSpeech")}`}
            </p>
          </>
        )}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
      </div>

      <section className={active || state.lines.length > 0 || warningText ? `call-alert call-alert-${combined.level}` : "call-alert-empty"} aria-live="assertive" data-testid="call-alert">
        {warningText ? (
          <>
            <p className="call-alert-head">{combined.level === "high" ? `⛔ ${t("call.hangUp")}` : combined.level === "medium" ? `⚠️ ${t("call.careful")}` : "⚠️"}</p>
            <p className="call-alert-text">{warningText}</p>
            <ReadAloud text={spoken} />
          </>
        ) : (
          (active || state.lines.length > 0) && <p className="call-alert-text">✅ {t("call.allClear")}</p>
        )}
        {ai && <p className="call-ai"><strong>{t("call.aiSays")}</strong> {ai.explanation}</p>}
      </section>

      {combined.level !== "low" && (
        <div className="call-actions">
          <TrustedContact />
          <a className="secondary big call-button" href="#/pause">{t("pause.link")}</a>
          <FamilyAlertButton verdict={verdict} />
          <RadarButton level={combined.level} ids={combined.signals.map((s) => s.ruleId)} />
        </div>
      )}

      {combined.signals.length > 0 && (
        <section className="signals card" aria-labelledby="heard-title">
          <h2 id="heard-title">{t("call.heard")}</h2>
          <ul>
            {combined.signals.map((s) => {
              const st = signalText(s, lang);
              return (
                <li key={s.ruleId} className="signal">
                  <span className="signal-label">{st.label}</span>
                  {s.excerpt && <q className="signal-excerpt">{s.excerpt}</q>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(state.lines.length > 0 || interim) && (
        <details className="card transcript">
          <summary>{t("call.transcript")}</summary>
          <p className="muted small">{t("call.transcriptNote")}</p>
          <ol>
            {state.lines.map((l, i) => <li key={i}>{l.text}</li>)}
            {interim && <li className="muted">{interim}…</li>}
          </ol>
        </details>
      )}

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed.trim()) onText(typed);
          setTyped("");
        }}
      >
        <label htmlFor="call-typed" className="label">{t("call.typeLabel")}</label>
        <div className="row">
          <input id="call-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <button className="secondary" type="submit" disabled={!typed.trim()}>{t("call.add")}</button>
        </div>
      </form>

      <section className="card" aria-labelledby="call-q">
        <h2 id="call-q">{t("call.questions")}</h2>
        <ol className="questions">
          {CALL_QUESTIONS.filter((q) => !q.pauseOnly).map((q) => (
            <li key={q.id} className="question">
              <span>{callQuestionText(q.id, q.text, lang)}</span>
              <span className="yesno" role="group" aria-label={callQuestionText(q.id, q.text, lang)}>
                <button type="button" className={answers[q.id] === true ? "chip chip-on chip-yes" : "chip"} aria-pressed={answers[q.id] === true} onClick={() => setAnswers((a) => ({ ...a, [q.id]: true }))}>{t("call.yes")}</button>
                <button type="button" className={answers[q.id] === false ? "chip chip-on" : "chip"} aria-pressed={answers[q.id] === false} onClick={() => setAnswers((a) => ({ ...a, [q.id]: false }))}>{t("call.no")}</button>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {(state.lines.length > 0 || Object.keys(answers).length > 0) && (
        <button type="button" className="link-button" onClick={reset}>{t("call.reset")}</button>
      )}
    </div>
  );
}
