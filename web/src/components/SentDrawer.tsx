import { useState } from "react";
import type { RedactionItem } from "@secondlook/shared";

/** "See exactly what was sent": the redacted text that left the device, word for word. */
export function SentDrawer({ sentText, sentImage, items }: { sentText: string | null; sentImage: boolean; items: RedactionItem[] }) {
  const [open, setOpen] = useState(false);
  const [showMine, setShowMine] = useState(false);
  if (sentText === null) return null;
  return (
    <div className="drawer">
      <button className="link-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide what was sent" : "See exactly what was sent"}
      </button>
      {open && (
        <div className="drawer-body">
          <p className="muted">This is everything that left your device{sentImage ? ", plus the screenshot you allowed" : ""}:</p>
          <pre className="sent-text" data-testid="sent-text">{sentText}</pre>
          {items.length > 0 && (
            <>
              <button className="link-button" onClick={() => setShowMine((s) => !s)}>
                {showMine ? "Hide" : "Show"} what each placeholder stands for (stays on this device)
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
