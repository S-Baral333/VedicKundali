import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, in front of the email-code form.
 *
 * Why this is here at all: Google was doing unpaid work as a bot filter. Every
 * new account carries a free monthly allowance of dream readings and Guru
 * questions, and each of those is a real model call on our bill — so an
 * un-gated "mail me a code" box is a tap someone can farm. An email code
 * already proves a reachable mailbox, which is more than a password signup
 * proves; this stops the automated disposable-mailbox version of the same
 * trick.
 *
 * The whole thing is inert without VITE_TURNSTILE_SITE_KEY: `turnstileEnabled`
 * is false, this renders nothing, and the form sends no token. That matters
 * because Supabase's captcha setting is project-wide — the key here and the
 * switch there have to be turned on together. A token with the switch off is
 * ignored; the switch on with no token rejects every sign-in, Google included.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Whether this build should obtain a captcha token before sending a code. */
export const turnstileEnabled = !!SITE_KEY;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** Load the Turnstile script once per page, reusing the in-flight promise. */
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(s);
  });

  return scriptPromise;
}

interface TurnstileGateProps {
  /** Called with a fresh token, or null when it expires or errors. */
  onToken: (token: string | null) => void;
  /**
   * Change this to discard the current token and challenge again. Turnstile
   * tokens are single-use, so every send — failed or not — burns one.
   */
  resetSignal?: number;
}

export default function TurnstileGate({ onToken, resetSignal = 0 }: TurnstileGateProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  // Held in a ref so re-renders with a new closure do not force a re-render of
  // the widget itself, which would throw away a token the user already solved.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !holder.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        // Script blocked or offline. Report no token; the form decides what to
        // say, rather than this component failing the page.
        if (!cancelled) onTokenRef.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  // Re-challenge on demand. Skipped on first render: the widget has only just
  // been created and has no token to discard.
  useEffect(() => {
    if (!resetSignal || !widgetId.current || !window.turnstile) return;
    window.turnstile.reset(widgetId.current);
    onTokenRef.current(null);
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return <div ref={holder} className="mt-3 flex justify-center" />;
}
