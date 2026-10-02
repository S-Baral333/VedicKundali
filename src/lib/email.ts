/**
 * Both ends of the email sign-in agree on the address here.
 *
 * Supabase keys a one-time code on the address it was sent to, so normalising
 * on the way in but not on the way back would reject a correct code from
 * anyone who capitalised their own email. One function, called by both.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Catches a typo before we spend an email on it. Deliberately loose — the
 * server is the real validator, and the only addresses worth rejecting here
 * are the ones that cannot possibly receive a code.
 */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}
