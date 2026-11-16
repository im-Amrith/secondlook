// MV3 service worker. Deliberately does NO AI work: the Prompt API and Firebase AI Logic run in
// the side panel page (a full document), as the plan requires. This worker only wires up the
// right-click menu and opens the side panel with the text to check.
import { MAX_PAGE_CHARS, MENU_ID, MENU_PAGE_ID, PENDING_KEY, safePageUrl, type ContentToBackground, type PendingCheck } from "./messages";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: "Check with SecondLook", contexts: ["selection"] });
  chrome.contextMenus.create({ id: MENU_PAGE_ID, title: "Check this page with SecondLook", contexts: ["page"] });
  // Clicking the toolbar icon opens the side panel.
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

async function queue(check: Omit<PendingCheck, "id">) {
  const pending: PendingCheck = { ...check, id: Date.now() };
  await chrome.storage.session.set({ [PENDING_KEY]: pending });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // sidePanel.open must be called synchronously inside the user gesture, before any await.
  if (tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId });

  if (info.menuItemId === MENU_ID && info.selectionText) {
    void queue({ text: info.selectionText, kind: "text", url: tab?.url });
  } else if (info.menuItemId === MENU_PAGE_ID && tab?.id !== undefined) {
    void chrome.scripting
      .executeScript({ target: { tabId: tab.id }, func: (max: number) => (document.body?.innerText ?? "").slice(0, max), args: [MAX_PAGE_CHARS] })
      .then(([res]) => queue({ text: `Page: ${safePageUrl(tab.url)}\n\n${String(res?.result ?? "")}`, kind: "page", url: tab.url }));
  }
});

// The in-page banner's "Check with SecondLook" button.
chrome.runtime.onMessage.addListener((msg: ContentToBackground, sender) => {
  if (msg?.type !== "open-panel-check") return;
  if (sender.tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => undefined);
  void queue({ text: msg.text, kind: "page", url: msg.url });
});
