/**
 * Facts that appear verbatim in the Privacy Policy, Terms of Service and
 * Refund Policy.
 *
 * These live in one place because they are the parts a lawyer or the business
 * will want to change, and because they must never drift between documents.
 *
 * The contracting party is the sole trader, Aayush Timalsina, trading as
 * Gurukundali. This matches ABN 97 851 594 042 exactly as registered on ABN
 * Lookup — "TIMALSINA, AAYUSH", Individual/Sole Trader, active 31 May 2025,
 * VIC 3750 — so the name and the number belong to the same legal person.
 *
 * Note for whoever revisits this: a sole trader is not a separate legal person
 * from the individual, so there is no limited liability behind these terms. If
 * a company is later registered and becomes the operator, `entity` and `abn`
 * must change together to the company's own name and ABN — never one without
 * the other.
 *
 * ⚠ Still outstanding: `contactEmail` and the addresses below must be real,
 * monitored mailboxes. The footer previously pointed at hello@kundali.app,
 * which is not this domain.
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
  /** State whose law governs, from the ABN's registered location. */
  state: "Victoria",
  governingLaw: "Victoria, Australia",
  /**
   * The operator is NOT registered for GST (confirmed on ABN Lookup). Prices
   * must therefore not be described as GST-inclusive and no GST may be charged.
   * Registration becomes mandatory above $75,000 AUD turnover; flip this and
   * the pricing copy together if that happens.
   */
  gstRegistered: false,
  lastUpdated: "29 September 2026",
  effectiveDate: "September 2026",
} as const;

/** Mailboxes named in the documents. All must exist before publishing. */
export const LEGAL_CONTACTS = {
  privacy: "privacy@gurukundali.com",
  support: "support@gurukundali.com",
  billing: "billing@gurukundali.com",
  legal: "legal@gurukundali.com",
} as const;

/** Australian legislation the documents are written against. */
export const STATUTES = {
  privacyAct: "Privacy Act 1988 (Cth)",
  apps: "Australian Privacy Principles (APPs)",
  acl: "Australian Consumer Law (ACL)",
  aclFull: "Australian Consumer Law, Schedule 2 of the Competition and Consumer Act 2010 (Cth)",
} as const;

/** Third parties that receive user data, and what each one is for. */
export const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose: "Database, file storage and authentication. Your account and birth details are stored here.",
    location: "United States",
  },
  {
    name: "Google",
    purpose: "Verifies your identity at sign-in. Supplies your email address, name and profile picture. Never your password.",
    location: "United States",
  },
  {
    name: "Anthropic",
    purpose: "Generates the written readings. Receives the computed parts of your chart and anything you type to the Guru or Dream Oracle.",
    location: "United States",
  },
] as const;

/** Consumer regulators a user may escalate to. */
export const REGULATORS = [
  { name: "Office of the Australian Information Commissioner (OAIC)", detail: "oaic.gov.au · 1300 363 992", scope: "Privacy complaints" },
  { name: "Consumer Affairs Victoria", detail: "consumer.vic.gov.au · 1300 558 181", scope: "Consumer complaints in our home state" },
  { name: "Australian Competition and Consumer Commission (ACCC)", detail: "accc.gov.au · 1300 302 502", scope: "Consumer law generally" },
] as const;
