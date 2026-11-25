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

export type ContentToBackground = { type: "open-panel-check"; text: string; url: string } | { type: "open-panel-pause" };

/** Set by the pause banner so the side panel opens on the pause screen. */
export const PANEL_TAB_KEY = "panelTab";

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

/** Reads the visible text of the active tab (runs in the side panel; host permission covers it). */
export async function readActiveTab(): Promise<{ text: string; url: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) return null;
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (max: number) => (document.body?.innerText ?? "").slice(0, max),
    args: [MAX_PAGE_CHARS],
  });
  return { text: `Page: ${safePageUrl(tab.url)}\n\n${String(res?.result ?? "")}`, url: tab.url };
}
