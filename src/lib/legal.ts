/**
 * Facts that appear verbatim in the Privacy Policy and Terms of Service.
 *
 * These are kept in one place because they are the parts a lawyer or the
 * business will want to change, and because they must not drift between the
 * two documents.
 *
 * ⚠ BLOCKED ON ONE FACT — do not publish these pages until it is filled in.
 *
 * Decided: the contracting party is the company, Wandong Bulls Corp Pty Ltd,
 * so the company carries the liability rather than the individual. What is
 * missing is the company's OWN ABN.
 *
 * ABN 97 851 594 042 must NOT be used here. It is registered to
 * "TIMALSINA, AAYUSH" as an Individual/Sole Trader (active 31 May 2025,
 * VIC 3750) — a different legal person from the Pty Ltd. Naming the company
 * against that number would tell users they are contracting with an entity
 * that does not hold it.
 *
 * To fill in: search the company name on abr.business.gov.au, take the ABN
 * shown against the Pty Ltd, and set both fields below. Nothing else changes.
 *
 * Also outstanding: `contactEmail` must be a mailbox that is actually
 * monitored. The footer previously pointed at hello@kundali.app, which is not
 * this domain.
 */
export const LEGAL = {
  /** Product/trading name, as used in running text. */
  brand: "Gurukundali",
  /**
   * ⚠ PENDING. Intended value: "Wandong Bulls Corp Pty Ltd" — set it together
   * with the company's own `abn` below, never on its own.
   */
  entity: "[LEGAL ENTITY TO BE CONFIRMED]",
  /** ⚠ PENDING — the COMPANY's ABN, not 97 851 594 042 (that is the sole trader's). */
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
