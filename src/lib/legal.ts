/**
 * Facts that appear verbatim in the Privacy Policy and Terms of Service.
 *
 * These are kept in one place because they are the parts a lawyer or the
 * business will want to change, and because they must not drift between the
 * two documents.
 *
 * ⚠ CONFIRM BEFORE PUBLISHING:
 *   - `entity` and `abn` must name the same legal person, and it must be the
 *     one users actually contract with. ABN 97 851 594 042 is registered to
 *     "TIMALSINA, AAYUSH" as an Individual/Sole Trader (active 31 May 2025,
 *     VIC 3750), NOT to a Pty Ltd. A Pty Ltd is a separate legal person with
 *     its own ACN and its own ABN. If the company is the contracting party,
 *     its own ABN belongs here; if it is not registered yet, the sole trader
 *     is the contracting party and there is no limited liability.
 *   - `contactEmail` must be a mailbox that is actually monitored. The footer
 *     previously pointed at hello@kundali.app, which is not this domain.
 */
export const LEGAL = {
  /** Product/trading name, as used in running text. */
  brand: "Gurukundali",
  /** ⚠ PENDING — the legal person users contract with. See note above. */
  entity: "[LEGAL ENTITY TO BE CONFIRMED]",
  /** ⚠ PENDING — must belong to `entity`, not to a different person. */
  abn: "[ABN TO BE CONFIRMED]",
  /** Public site the documents refer to. */
  site: "gurukundali.com",
  /** ⚠ Must be a real, monitored mailbox before these pages go live. */
  contactEmail: "support@gurukundali.com",
  /**
   * Settled: the ABN is registered in VIC 3750 (Wandong, Victoria), so
   * Australian law applies and Victoria is the state, whichever entity ends up
   * being the contracting party.
   */
  governingLaw: "Victoria, Australia",
  /** Shown at the top of both documents. */
  lastUpdated: "29 September 2026",
} as const;

/** Third parties that receive user data, and what each one is for. */
export const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose: "Hosts the database, file storage and the authentication service. Your account and birth details live here.",
  },
  {
    name: "Google",
    purpose: "Verifies your identity when you sign in. Google tells us your email address, name and profile picture; we never see your Google password.",
  },
  {
    name: "Anthropic",
    purpose: "Generates the written readings. The relevant parts of your chart, and anything you type into the Guru or the Dream Oracle, are sent to their API to produce a response.",
  },
] as const;
