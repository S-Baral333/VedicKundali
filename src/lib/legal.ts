/**
 * Facts that appear verbatim in the Privacy Policy and Terms of Service.
 *
 * These are kept in one place because they are the parts a lawyer or the
 * business will want to change, and because they must not drift between the
 * two documents.
 *
 * ⚠ CONFIRM BEFORE PUBLISHING:
 *   - `contactEmail` must be a mailbox that is actually monitored. The footer
 *     previously pointed at hello@kundali.app, which is not this domain.
 *   - `governingLaw` decides which country's consumer law applies and is not
 *     something to guess. Prices are quoted in AUD, which suggests Australia,
 *     but that is an inference, not a decision.
 *   - `entity` should be the registered legal name if one exists, not just the
 *     brand.
 */
export const LEGAL = {
  /** Brand/legal entity named as the data controller. */
  entity: "Guru Kundali",
  /** Public site the documents refer to. */
  site: "gurukundali.com",
  /** ⚠ Must be a real, monitored mailbox before these pages go live. */
  contactEmail: "support@gurukundali.com",
  /** ⚠ Placeholder — a jurisdiction must be chosen deliberately. */
  governingLaw: "[JURISDICTION TO BE CONFIRMED]",
  /** Shown at the top of both documents. */
  lastUpdated: "27 September 2026",
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
