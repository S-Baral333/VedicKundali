/**
 * Facts that appear verbatim in the Privacy Policy and Terms of Service.
 *
 * These are kept in one place because they are the parts a lawyer or the
 * business will want to change, and because they must not drift between the
 * two documents.
 *
 * The contracting party is the sole trader, Aayush Timalsina, trading as
 * Gurukundali. This matches ABN 97 851 594 042 exactly as it is registered on
 * ABN Lookup — "TIMALSINA, AAYUSH", Individual/Sole Trader, active 31 May 2025,
 * VIC 3750 — so the name and the number belong to the same legal person, which
 * is the thing that makes the documents mean what they say.
 *
 * Note for whoever revisits this: a sole trader is not a separate legal person
 * from the individual, so there is no limited liability behind these terms. If
 * Wandong Bulls Corp Pty Ltd is later registered and becomes the operator,
 * `entity` and `abn` must change together to the company's own name and ABN —
 * never one without the other.
 *
 * ⚠ Still outstanding: `contactEmail` must be a mailbox that is actually
 * monitored. The footer previously pointed at hello@kundali.app, which is not
 * this domain.
 */
export const LEGAL = {
  /** Product/trading name, as used in running text. */
  brand: "Gurukundali",
  /** The legal person users contract with. Sole trader, trading as `brand`. */
  entity: "Aayush Timalsina",
  /** Belongs to `entity`. Displayed in the conventional spaced grouping. */
  abn: "97 851 594 042",
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
