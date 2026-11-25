import { useState } from "react";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";

/** Digits and a leading + only, for a tel: link. */
export function telHref(phone: string): string | null {
  const clean = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return clean.replace(/\D/g, "").length >= 3 ? `tel:${clean}` : null;
}

/**
 * The person to call before paying anyone: a big call button, or a small form to add them.
 * Saved in this device's settings only; never sent anywhere.
 */
export function TrustedContact({ showHelpline = true, editable = true }: { showHelpline?: boolean; editable?: boolean }) {
  const { settings, updateSettings } = useApp();
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(settings.trustedName);
  const [phone, setPhone] = useState(settings.trustedPhone);
  const href = telHref(settings.trustedPhone);

  const form = (
    <form
      className="trusted-form"
      onSubmit={(e) => {
        e.preventDefault();
        updateSettings({ trustedName: name.trim().slice(0, 40), trustedPhone: phone.trim().slice(0, 20) });
        setEditing(false);
      }}
    >
      <p className="muted small">{t("trusted.help")}</p>
      <div className="row">
        <label>
          <span className="label">{t("trusted.name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label>
          <span className="label">{t("trusted.phone")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" />
        </label>
      </div>
      <button className="secondary" type="submit" disabled={!name.trim() || !telHref(phone)}>{t("trusted.save")}</button>
    </form>
  );

  return (
    <div className="trusted">
      {href && settings.trustedName && !editing ? (
        <>
          <a className="primary big call-button" href={href}>{t("trusted.call", { name: settings.trustedName })}</a>
          {editable && <button type="button" className="link-button" onClick={() => setEditing(true)}>{t("trusted.edit")}</button>}
        </>
      ) : editable ? (
        editing || !settings.trustedName ? (
          <details className="trusted-add" open={editing}>
            <summary>{t("trusted.add")}</summary>
            {form}
          </details>
        ) : null
      ) : null}
      {showHelpline && <a className="secondary big call-button" href="tel:1930">{t("trusted.call1930")}</a>}
    </div>
  );
}

/** Settings section for the trusted person. */
export function TrustedSettings() {
  const { settings, updateSettings } = useApp();
  const { t } = useT();
  const [name, setName] = useState(settings.trustedName);
  const [phone, setPhone] = useState(settings.trustedPhone);
  return (
    <section className="card" aria-labelledby="trusted-title">
      <h2 id="trusted-title">{t("trusted.title")}</h2>
      <p className="muted">{t("trusted.help")}</p>
      <div className="row">
        <label>
          <span className="label">{t("trusted.name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label>
          <span className="label">{t("trusted.phone")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" />
        </label>
      </div>
      <button
        type="button"
        className="secondary"
        disabled={name.trim() === settings.trustedName && phone.trim() === settings.trustedPhone}
        onClick={() => updateSettings({ trustedName: name.trim().slice(0, 40), trustedPhone: phone.trim().slice(0, 20) })}
      >
        {t("trusted.save")}
      </button>
    </section>
  );
}
