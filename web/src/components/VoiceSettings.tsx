import { useCallback, useEffect, useState } from "react";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { translate } from "../lib/i18n";
import { deleteVoice, isDownloaded, speaker, systemVoiceFor, SHARED_DOWNLOAD_MB } from "../lib/tts/speaker";
import { useSpeakerState } from "../lib/tts/useReadAloud";
import { DEFAULT_VOICE, VOICES, voiceById, voicesFor, type TtsLang } from "../lib/tts/voices";

const LANGS: TtsLang[] = ["en", "hi", "ml"];

/** Settings → Read aloud: pick, download, try and remove the on-device voices per language. */
export function VoiceSettings() {
  const { settings, updateSettings } = useApp();
  const { t } = useT();
  const state = useSpeakerState();
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [, setVoicesLoaded] = useState(0);

  const refresh = useCallback(async () => {
    const entries = await Promise.all(VOICES.map(async (v) => [v.id, await isDownloaded(v)] as const));
    setHave(Object.fromEntries(entries));
  }, []);
  useEffect(() => {
    void refresh();
    // System voices load asynchronously in some browsers.
    if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => setVoicesLoaded((n) => n + 1);
  }, [refresh]);

  const choose = (lang: TtsLang, id: string) => updateSettings({ voices: { ...settings.voices, [lang]: id } });

  async function tryVoice(lang: TtsLang) {
    const id = settings.voices[lang] ?? DEFAULT_VOICE[lang];
    // The sample is in the voice's language, whatever the UI language is.
    const text = translate(lang, "settings.sample");
    if (id === "system") {
      const sys = systemVoiceFor(lang);
      if (sys) await speaker().speakSystem(sys, text, settings.speechRate);
      return;
    }
    const v = voiceById(id)!;
    setBusy(v.id);
    try {
      if (!have[v.id]) await speaker().prepare(v);
      await refresh();
      await speaker().speakNeural(v, text, settings.speechRate);
    } catch {
      /* state.error shows it */
    } finally {
      setBusy(null);
    }
  }

  async function remove(lang: TtsLang) {
    const v = voiceById(settings.voices[lang] ?? DEFAULT_VOICE[lang]);
    if (!v) return;
    const otherKokoro = VOICES.some((x) => x.engine === "kokoro" && x.id !== v.id && have[x.id]);
    await deleteVoice(v, otherKokoro);
    await refresh();
  }

  return (
    <section className="card" aria-labelledby="voice-title">
      <h2 id="voice-title">{t("settings.voice")}</h2>
      <p className="muted">{t("settings.voiceHelp")}</p>
      {LANGS.map((lang) => {
        const langName = t(`tts.lang.${lang}`);
        const id = settings.voices[lang] ?? DEFAULT_VOICE[lang];
        const v = voiceById(id);
        const sys = systemVoiceFor(lang);
        const anyDownloaded = Object.values(have).some(Boolean);
        return (
          <div key={lang} className="voice-row">
            <label htmlFor={`voice-${lang}`}><strong>{t("settings.voiceFor", { lang: langName })}</strong></label>
            <select id={`voice-${lang}`} value={id} onChange={(e) => choose(lang, e.target.value)}>
              {voicesFor(lang).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} · {have[o.id] ? t("settings.downloaded") : `${o.sizeMB} MB`}
                  {o.commercialOk ? "" : ` · ${t("settings.nonCommercial")}`}
                </option>
              ))}
              <option value="system" disabled={!sys}>{sys ? `${t("settings.systemVoice")} (${sys.name})` : t("settings.noSystemVoice", { lang: langName })}</option>
            </select>
            {v && (
              <p className="muted small">
                {v.licence} · <a href={v.source} target="_blank" rel="noreferrer">{v.engine === "kokoro" ? "Kokoro-82M" : "Piper"}</a>
                {!have[v.id] && !anyDownloaded && ` · +${SHARED_DOWNLOAD_MB} MB speech data (once)`}
              </p>
            )}
            <div className="row">
              <button type="button" className="secondary" disabled={busy !== null || state.progress !== null} onClick={() => void tryVoice(lang)}>
                {busy === id && state.progress !== null
                  ? t("tts.downloading", { pct: Math.round(state.progress * 100) })
                  : v && !have[v.id] ? `${t("tts.download")} (${v.sizeMB} MB)` : t("settings.tryVoice")}
              </button>
              {v && have[v.id] && <button type="button" className="link-button" onClick={() => void remove(lang)}>{t("settings.deleteVoice")}</button>}
            </div>
          </div>
        );
      })}
      {state.error && <p className="muted" role="status">{t("tts.failed")} ({state.error})</p>}
      <div className="toggle">
        <input id="speech-slow" type="checkbox" role="switch" checked={settings.speechRate < 1} onChange={(e) => updateSettings({ speechRate: e.target.checked ? 0.85 : 1 })} />
        <label htmlFor="speech-slow"><strong>{t("settings.slower")}</strong><span className="muted">{t("settings.slowerHelp")}</span></label>
      </div>
      <div className="toggle">
        <input id="auto-read" type="checkbox" role="switch" checked={settings.autoRead} onChange={(e) => updateSettings({ autoRead: e.target.checked })} />
        <label htmlFor="auto-read"><strong>{t("settings.autoRead")}</strong><span className="muted">{t("settings.autoReadHelp")}</span></label>
      </div>
    </section>
  );
}
