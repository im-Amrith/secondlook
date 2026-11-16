import { useApp } from "../lib/app-context";
import { UI_LANGS } from "../lib/i18n";
import { useT } from "../lib/useT";

/** Big, simple language buttons (each name written in its own script). */
export function LanguagePicker() {
  const { settings, updateSettings } = useApp();
  const { t } = useT();
  return (
    <div className="lang-picker" role="group" aria-label={t("setup.language")}>
      {UI_LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          className={settings.uiLang === l.id ? "primary" : "secondary"}
          aria-pressed={settings.uiLang === l.id}
          onClick={() => updateSettings({ uiLang: l.id })}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
