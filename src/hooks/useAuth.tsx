import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail } from "@/lib/email";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  /**
   * Two doors in, neither with a password: Google, or a six-digit code sent to
   * an email address. There is still nothing to forget, leak or reset.
   */
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  /** Mail a six-digit code, creating the account if the address is new. */
  sendEmailCode: (email: string, captchaToken?: string) => Promise<{ error: Error | null }>;
  /** Exchange that code for a session. */
  verifyEmailCode: (email: string, code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in and sign up are the same act with Google: a first-time account is
   * created by the on_auth_user_created trigger, so there is no separate
   * registration step and nothing for the user to choose between.
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Always let the user pick which Google account. Without this, anyone
        // already signed into Google is silently pushed into that account,
        // which is painful on a shared or family device.
        queryParams: { prompt: "select_account" },
      },
    });
    return { error: error as Error | null };
  };

  /**
   * Send a six-digit code to `email`.
   *
   * shouldCreateUser keeps this the same single act Google is: a first-time
   * address creates the account, and on_auth_user_created builds the profile,
   * role and free subscription off the auth.users insert exactly as it does for
   * an OAuth signup — so there is no separate registration step to keep in sync.
   *
   * Whether the mail arrives as a code or a link is decided by the project's
   * Magic Link template: it has to render {{ .Token }}, not
   * {{ .ConfirmationURL }}. The call is identical either way, which is why
   * getting that template wrong shows up as users receiving links rather than
   * as an error here.
   *
   * captchaToken is forwarded only when the app was built with a Turnstile site
   * key. Supabase's captcha switch is project-wide, so it and the key have to be
   * turned on together: tokens without the switch are ignored, but the switch
   * without tokens rejects every sign-in.
   */
  const sendEmailCode = async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: { shouldCreateUser: true, captchaToken },
    });
    return { error: error as Error | null };
  };

  /**
   * Exchange a code for a session. onAuthStateChange above picks up the new
   * session, so nothing here needs to route or set user state.
   */
  const verifyEmailCode = async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: code.trim(),
      type: "email",
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    sessionStorage.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, isLoading, signInWithGoogle, sendEmailCode, verifyEmailCode, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
