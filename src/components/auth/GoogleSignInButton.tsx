import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Google's own "Sign in with Google" button (Google Identity Services).
 *
 * Why not the Supabase redirect: that flow sends the user to Google with
 * `redirect_uri=<project>.supabase.co/auth/v1/callback`, and Google names the
 * redirect's domain on its screen — "continue to brhafkgjmdwmzuakheod.supabase.co".
 * That domain cannot be verified as ours, so brand verification can't fix it.
 * This button runs on our own origin instead, so Google names gurukundali.com,
 * and hands back an ID token that Supabase turns into a normal session through
 * `signInWithIdToken` — same auth.users row, same trigger, same RLS.
 *
 * Inert without VITE_GOOGLE_CLIENT_ID: `googleIdentityEnabled` is false and the
 * Login page keeps the redirect button, so the switch is a config change.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const googleIdentityEnabled = !!CLIENT_ID;

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (opts: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("google identity script failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * A fresh nonce pair. Google embeds the SHA-256 hash in the ID token; Supabase
 * is given the raw value and checks it hashes to what the token carries, so a
 * token lifted from somewhere else can't be replayed into a session here.
 */
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

interface GoogleSignInButtonProps {
  /** Receives Google's ID token and the raw nonce it was issued against. */
  onCredential: (idToken: string, rawNonce: string) => void;
  /** The script could not load (offline, blocked); the page decides what to show. */
  onUnavailable: () => void;
}

export default function GoogleSignInButton({ onCredential, onUnavailable }: GoogleSignInButtonProps) {
  const holder = useRef<HTMLDivElement | null>(null);
  const { i18n } = useTranslation();
  const [width, setWidth] = useState(0);
  // Refs so a parent re-render doesn't re-initialise Google with a new closure.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;

  // Google draws a fixed-width iframe (max 400px), so measure the card once.
  useEffect(() => {
    if (holder.current) setWidth(Math.min(400, Math.floor(holder.current.clientWidth)));
  }, []);

  useEffect(() => {
    if (!CLIENT_ID || !width) return;
    let cancelled = false;

    (async () => {
      try {
        const [{ raw, hashed }] = await Promise.all([makeNonce(), loadGoogleIdentity()]);
        const gid = window.google?.accounts?.id;
        if (cancelled || !holder.current || !gid) return;
        gid.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          // Never sign someone in silently: on a shared device that would put
          // the reader into whoever last used Google, as prompt=select_account
          // guarded against in the redirect flow.
          auto_select: false,
          use_fedcm_for_prompt: true,
          callback: (resp: { credential?: string }) => {
            if (resp.credential) onCredentialRef.current(resp.credential, raw);
          },
        });
        gid.renderButton(holder.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width,
          locale: i18n.language,
        });
      } catch {
        if (!cancelled) onUnavailableRef.current();
      }
    })();

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [width, i18n.language]);

  // color-scheme: light stops Chrome painting an opaque white canvas behind
  // Google's iframe on a dark page (it does that whenever the frame's scheme
  // and ours disagree), which framed the button in a white box.
  return (
    <div
      ref={holder}
      className="w-full flex justify-center min-h-[44px] [&_iframe]:![color-scheme:light]"
      style={{ colorScheme: "light" }}
    />
  );
}
