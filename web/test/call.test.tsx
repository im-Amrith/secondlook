import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider } from "../src/lib/app-context";
import { CallGuardPage } from "../src/pages/CallGuard";
import { PausePage } from "../src/pages/Pause";
import { TrustedContact, telHref } from "../src/components/TrustedContact";
import { DEMO_CALL, speechStatus, startSpeech } from "../src/lib/listen";
import { DEFAULT_SETTINGS, saveSettings } from "../src/lib/settings";
import { callWarningText } from "../src/lib/i18n";
import { addTranscript, createCallState } from "@secondlook/shared";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  saveSettings(DEFAULT_SETTINGS);
});

describe("listen.ts privacy guards", () => {
  it("treats old SpeechRecognition (no on-device support) as unsupported, so audio never goes to a server", async () => {
    class OldRecognition {}
    vi.stubGlobal("webkitSpeechRecognition", OldRecognition);
    expect((await speechStatus("en")).status).toBe("unsupported");
  });

  it("refuses to start if the browser ignores processLocally", () => {
    const started = vi.fn();
    class Ignoring {
      static available = async () => "available";
      lang = "";
      continuous = false;
      interimResults = false;
      set processLocally(_v: boolean) {
        /* ignored by this browser */
      }
      get processLocally() {
        return false;
      }
      start = started;
      stop() {}
      abort() {}
      onresult = null;
      onerror = null;
      onend = null;
    }
    vi.stubGlobal("SpeechRecognition", Ignoring);
    const onError = vi.fn();
    startSpeech("en-IN", { onText: () => undefined, onError });
    expect(started).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/can't keep speech recognition on the device/));
  });

  it("finds an on-device language pack, trying regional variants", async () => {
    class Rec {
      static available = async ({ langs }: { langs: string[] }) => (langs[0] === "en-US" ? "available" : "unavailable");
    }
    vi.stubGlobal("SpeechRecognition", Rec);
    expect(await speechStatus("en")).toEqual({ status: "available", tag: "en-US" });
    expect((await speechStatus("ml")).status).toBe("unavailable");
  });

  it("every demo call ends up high risk in every language", () => {
    for (const lines of Object.values(DEMO_CALL)) {
      const s = lines.reduce((st, l, i) => addTranscript(st, l, i), createCallState());
      expect(s.level).toBe("high");
    }
  });
});

describe("Call Guard page", () => {
  it("says listening is off (never the cloud) when the browser can't listen on the device", async () => {
    render(<AppProvider><CallGuardPage /></AppProvider>);
    expect(await screen.findByText(/We never send call audio to the cloud/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start listening/ })).toBeDisabled();
  });

  it("warns as the demo call plays, and offers the trusted person and the pause screen", async () => {
    saveSettings({ ...DEFAULT_SETTINGS, onboarded: true, trustedName: "Anu", trustedPhone: "+91 98765 43210" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<AppProvider><CallGuardPage /></AppProvider>);
    await userEvent.click(screen.getByRole("button", { name: /Watch a demo call/ }));
    expect(screen.getByText(/made-up scam call/)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2600 * 8 + 100);
    });
    const alert = screen.getByTestId("call-alert");
    expect(alert).toHaveTextContent(/Hang up now/);
    expect(alert).toHaveTextContent(/digital arrest/i);
    expect(screen.getByRole("link", { name: /Call Anu/ })).toHaveAttribute("href", "tel:+919876543210");
    expect(screen.getByRole("link", { name: /1-minute pause/ })).toHaveAttribute("href", "#/pause");
    expect(screen.getByRole("heading", { name: "What we heard" })).toBeInTheDocument();
  });

  it("works from tapped answers alone", async () => {
    render(<AppProvider><CallGuardPage /></AppProvider>);
    const q = screen.getByRole("group", { name: /not to tell your family/ });
    await userEvent.click(q.querySelector("button")!);
    const q2 = screen.getByRole("group", { name: /police, CBI/ });
    await userEvent.click(q2.querySelector("button")!);
    expect(screen.getByTestId("call-alert")).toHaveTextContent(/Hang up now/);
  });

  it("checks words typed in by hand", async () => {
    render(<AppProvider><CallGuardPage /></AppProvider>);
    await userEvent.type(screen.getByLabelText("Or type what they said"), "please install anydesk so I can help");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("call-alert")).toHaveTextContent(/install any app/);
  });
});

describe("Pause before paying", () => {
  it("counts down, and turns red when an answer matches a scam", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<AppProvider><PausePage seconds={3} /></AppProvider>);
    const close = screen.getByRole("button", { name: /3 seconds/ });
    expect(close).toBeDisabled();
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByRole("button", { name: /I've checked/ })).toBeEnabled();
    const q = screen.getByRole("group", { name: /keep it secret|not to tell your family/ });
    await userEvent.click(q.querySelector("button")!);
    expect(screen.getByRole("alert")).toHaveTextContent(/Please don't pay/);
  });

  it("is reassuring when every answer is no", async () => {
    render(<AppProvider><PausePage seconds={1} /></AppProvider>);
    for (const g of screen.getAllByRole("group")) await userEvent.click(g.querySelectorAll("button")[1]!);
    expect(screen.getByText(/don't match the usual scam pattern/)).toBeInTheDocument();
  });
});

describe("trusted person", () => {
  it("builds safe tel: links", () => {
    expect(telHref("+91 98765-43210")).toBe("tel:+919876543210");
    expect(telHref("call me")).toBeNull();
    expect(telHref("12+34")).toBe("tel:1234");
  });

  it("can be added on the spot and is kept on this device", async () => {
    render(<AppProvider><TrustedContact /></AppProvider>);
    await userEvent.click(screen.getByText("Add someone to call"));
    await userEvent.type(screen.getByLabelText("Name"), "Ravi");
    await userEvent.type(screen.getByLabelText("Phone number"), "9876543210");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("link", { name: /Call Ravi/ })).toHaveAttribute("href", "tel:9876543210"));
    expect(JSON.parse(localStorage.getItem("sl.settings.v1")!).trustedName).toBe("Ravi");
  });

  it("translates call warnings", () => {
    expect(callWarningText("video_custody", "x", "hi")).toMatch(/डिजिटल अरेस्ट/);
    expect(callWarningText("advance_fee", "x", "ml")).toMatch(/പണം/);
    expect(callWarningText(null, "fallback", "hi")).toBe("fallback");
  });
});
