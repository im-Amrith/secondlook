import { useState } from "react";
import type { RedactionItem } from "@secondlook/shared";
import { useT } from "../lib/useT";

/** "See exactly what was sent": the redacted text that left the device, word for word. */
export function SentDrawer({ sentText, sentImage, items }: { sentText: string | null; sentImage: boolean; items: RedactionItem[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [showMine, setShowMine] = useState(false);
  if (sentText === null) return null;
  return (
    <div className="drawer">
      <button className="link-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? t("drawer.hide") : t("drawer.show")}
      </button>
      {open && (
        <div className="drawer-body">
          <p className="muted">{sentImage ? t("drawer.introImage") : t("drawer.intro")}</p>
          <pre className="sent-text" data-testid="sent-text">{sentText}</pre>
          {items.length > 0 && (
            <>
              <button className="link-button" onClick={() => setShowMine((s) => !s)}>
                {showMine ? t("drawer.hideMap") : t("drawer.showMap")}
              </button>
              {showMine && (
                <ul className="placeholder-list">
                  {items.map((it) => (
                    <li key={it.placeholder}>
                      <code>{it.placeholder}</code> = {it.original}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
