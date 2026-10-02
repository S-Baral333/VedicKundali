import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { looksLikeEmail } from "@/lib/email";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import TurnstileGate, { turnstileEnabled } from "@/components/auth/TurnstileGate";

/** Long enough that a slow mail hop does not look like a broken button, short
 *  enough that a mistyped address is not a minute of staring. */
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

/**
 * The email half of the sign-in card: an address, then the six-digit code we
 * mail to it.
 *
 * This is deliberately the same single act as the Google button beside it —
 * there is no "register" branch, because a first-time address creates the
 * account on verification and the on_auth_user_created trigger builds the
 * profile from it. Nothing here routes on success: verifying updates the
 * session, and the Login page already redirects a signed-in user.
 */
export default function EmailCodeForm() {
  const { t } = useTranslation("pages");
  const { sendEmailCode, verifyEmailCode } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  // Guards the auto-submit below: without it, a failed verify would resubmit
  // the same six characters the moment they are still in the box.
  const submittedCode = useRef<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const send = async () => {
    if (!looksLikeEmail(email)) {
      setError(t("login.emailInvalid", "That doesn't look like an email address."));
      return;
    }
    if (turnstileEnabled && !captchaToken) {
      setError(t("login.captchaPending", "Please complete the check below first."));
      return;
    }

    setBusy(true);
    setError(null);
    const { error: sendError } = await sendEmailCode(email, captchaToken ?? undefined);

    // A Turnstile token is single-use, so this one is spent either way and the
    // widget needs to issue another before the next attempt.
    if (turnstileEnabled) {
      setCaptchaToken(null);
      setCaptchaReset((n) => n + 1);
    }
    setBusy(false);

    if (sendError) {
      setError(t("login.sendFailed", "We couldn't send that code. Try again in a moment."));
      return;
    }
    setStep("code");
    setCode("");
    submittedCode.current = null;
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const verify = async (value: string) => {
    if (value.length < CODE_LENGTH || busy) return;
    submittedCode.current = value;
    setBusy(true);
    setError(null);

    const { error: verifyError } = await verifyEmailCode(email, value);
    setBusy(false);

    if (verifyError) {
      // One message on purpose. Supabase answers both a mistyped code and a
      // stale one with the same string — "Token has expired or is invalid" —
      // so sorting them into "wrong" and "expired" would be inventing a
      // distinction the server never made. Guessing "expired" sends someone who
      // merely fat-fingered a digit off to request a code they already have.
      // This says what is actually known and offers both ways out.
      setError(t("login.codeInvalid", "That code didn't work. Check it, or ask for a new one."));
      setCode("");
      return;
    }
    // Success is silent on purpose: the session change redirects the page.
  };

  const labelStyle = { color: "hsl(var(--text-secondary))", fontFamily: "'Jost', sans-serif" };

  return (
    <div>
      {step === "email" ? (
        <form
          // type="email" below is kept for the mobile keyboard and autofill,
          // but its native validation is suppressed: the browser's bubble
          // speaks the browser's language, which would make it the one
          // untranslated string in a flow we ship in seven. looksLikeEmail
          // answers in the reader's language instead.
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="login-email" className="block text-[12px] mb-1.5" style={labelStyle}>
            {t("login.emailLabel", "Email")}
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder={t("login.emailPlaceholder", "you@example.com")}
            disabled={busy}
            aria-invalid={!!error}
            aria-describedby={error ? "login-email-error" : undefined}
            className="w-full rounded-full px-4 py-3 min-h-[48px] text-[15px] outline-none transition-colors disabled:opacity-70 focus:border-[hsl(var(--gold)/0.55)]"
            style={{
              background: "hsl(240 25% 7% / 0.7)",
              border: "0.5px solid hsl(var(--gold) / 0.22)",
              color: "hsl(var(--text-primary))",
              fontFamily: "'Jost', sans-serif",
            }}
          />

          {turnstileEnabled && (
            <TurnstileGate onToken={setCaptchaToken} resetSignal={captchaReset} />
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-3 min-h-[48px] text-[15px] font-medium transition-colors disabled:opacity-70"
            style={{
              background: "hsl(var(--gold) / 0.14)",
              border: "0.5px solid hsl(var(--gold) / 0.45)",
              color: "hsl(var(--gold-light))",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 shrink-0" />}
            {busy ? t("login.sendingCode", "Sending your code…") : t("login.sendCode", "Email me a code")}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-[13px] text-center mb-3 leading-relaxed" style={labelStyle}>
            {t("login.codeSentTo", "We sent a six-digit code to {{email}}", { email })}
          </p>

          <div className="flex justify-center">
            <InputOTP
              maxLength={CODE_LENGTH}
              value={code}
              autoFocus
              // Lets iOS and Android offer the code straight from the mail
              // notification instead of making the user switch apps to read it.
              autoComplete="one-time-code"
              disabled={busy}
              onChange={(value) => {
                setCode(value);
                if (value !== submittedCode.current) setError(null);
                if (value.length === CODE_LENGTH && value !== submittedCode.current) void verify(value);
              }}
            >
              <InputOTPGroup>
                {Array.from({ length: CODE_LENGTH }, (_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-10 text-[17px] tabular-nums"
                    style={{
                      background: "hsl(240 25% 7% / 0.7)",
                      borderColor: "hsl(var(--gold) / 0.22)",
                      color: "hsl(var(--text-primary))",
                    }}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            type="button"
            onClick={() => void verify(code)}
            disabled={busy || code.length < CODE_LENGTH}
            className="mt-4 w-full inline-flex items-center justify-center gap-2.5 rounded-full px-5 py-3 min-h-[48px] text-[15px] font-medium transition-colors disabled:opacity-60"
            style={{
              background: "hsl(var(--gold) / 0.14)",
              border: "0.5px solid hsl(var(--gold) / 0.45)",
              color: "hsl(var(--gold-light))",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? t("login.aligningStars", "Aligning the stars…") : t("login.verifyCode", "Verify and continue")}
          </button>

          <div className="mt-3 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || cooldown > 0}
              className="text-[12px] underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
              style={{ color: "hsl(var(--gold) / 0.85)", fontFamily: "'Jost', sans-serif" }}
            >
              {cooldown > 0
                ? t("login.resendIn", "You can ask for a new code in {{seconds}}s", { seconds: cooldown })
                : t("login.resendCode", "Send a new code")}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                submittedCode.current = null;
              }}
              disabled={busy}
              className="text-[12px] underline-offset-2 hover:underline disabled:opacity-60"
              style={{ color: "hsl(var(--text-muted))", fontFamily: "'Jost', sans-serif" }}
            >
              {t("login.useDifferentEmail", "Use a different address")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          id="login-email-error"
          role="alert"
          aria-live="polite"
          className="mt-3 text-center text-[12px] leading-relaxed"
          style={{ color: "hsl(0 70% 72%)", fontFamily: "'Jost', sans-serif" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
