// Messages and storage keys shared by the service worker, content script and side panel.

/** What the side panel should check next. Kept in chrome.storage.session (memory only, cleared on browser restart). */
export interface PendingCheck {
  id: number;
  text: string;
  kind: "text" | "page";
  /** Page address, shown to the user; never sent to a model unless it's part of the text. */
  url?: string;
}

export const PENDING_KEY = "pendingCheck";

export type ContentToBackground = { type: "open-panel-check"; text: string; url: string };

export const MENU_ID = "secondlook-check-selection";
export const MENU_PAGE_ID = "secondlook-check-page";

/** Clip page text so a whole web page doesn't blow up the on-device context. */
export const MAX_PAGE_CHARS = 12000;

/** Page address without query string or fragment (they can carry emails, tokens or ids). */
export function safePageUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}
