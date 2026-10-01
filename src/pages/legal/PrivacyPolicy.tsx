import LegalLayout, {
  Section,
  Callout,
  StatuteNotice,
  DataGrid,
  TileGrid,
  type TocEntry,
} from "./LegalLayout";
import { LEGAL, LEGAL_CONTACTS, STATUTES, SUBPROCESSORS, REGULATORS } from "@/lib/legal";
import Seo from "@/components/Seo";

const TOC: TocEntry[] = [
  { id: "intro", label: "Introduction" },
  { id: "what-is", label: "1. What Is Personal Information?" },
  { id: "collect", label: "2. What We Collect" },
  { id: "birth-data", label: "3. Birth Details" },
  { id: "how-collect", label: "4. How We Collect It" },
  { id: "how-use", label: "5. How We Use It" },
  { id: "ai", label: "6. AI Processing" },
  { id: "disclosure", label: "7. Disclosure" },
  { id: "storage", label: "8. Cookies & Local Storage" },
  { id: "security", label: "9. Data Security" },
  { id: "retention", label: "10. Data Retention" },
  { id: "rights", label: "11. Your Rights" },
  { id: "complaints", label: "12. Privacy Complaints" },
  { id: "children", label: "13. Children's Privacy" },
  { id: "changes", label: "14. Policy Changes" },
  { id: "contact", label: "15. Contact" },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy"
      titleAccent="Policy"
      meta={[
        { label: "Last Updated", value: LEGAL.lastUpdated },
        { label: "Legislation", value: STATUTES.privacyAct },
        { label: "Principles", value: STATUTES.apps },
      ]}
      toc={TOC}
    >
      <Seo
        title="Privacy Policy – Gurukundali"
        description="How Gurukundali collects, uses and protects your personal and birth data, in accordance with the Australian Privacy Act and APPs."
        path="/privacy"
      />
      <StatuteNotice tag={STATUTES.privacyAct}>
        This Privacy Policy is prepared in accordance with the {STATUTES.privacyAct} and the 13
        Australian Privacy Principles. Your personal information will only be used for the
        purposes for which it was collected, or directly related purposes, unless you consent
        otherwise.
      </StatuteNotice>

      <Section id="intro" eyebrow="Introduction" heading="Our Commitment to Your Privacy">
        <p>
          {LEGAL.brand} is operated by {LEGAL.entity} (ABN {LEGAL.abn}), a sole trader based in{" "}
          {LEGAL.governingLaw} ("{LEGAL.brand}", "we", "us", "our"). We are committed to handling
          your personal information responsibly and transparently.
        </p>
        <p>
          This Policy explains how we collect, use, disclose and store your personal information
          in accordance with the {STATUTES.privacyAct} and the {STATUTES.apps}. It applies to our
          website, installable app and all related services (the "Platform").
        </p>
        <p>
          By using the Platform you consent to the collection and use of your information as
          described here. If you do not agree, please do not use the Platform.
        </p>
      </Section>

      <Section id="what-is" eyebrow="Section 1" heading="What Is Personal Information?">
        <p>
          "Personal information" means information or an opinion about an identified individual,
          or an individual who is reasonably identifiable, whether or not it is true and whether
          or not it is recorded in a material form.
        </p>
        <p>
          "Sensitive information" is a subset of personal information and includes health
          information, biometric information, and information about racial or ethnic origin,
          political opinions, religious beliefs, sexual orientation and criminal record. Sensitive
          information attracts a higher level of protection under the APPs.
        </p>
        <Callout>
          <p>
            <strong>We do not ask for sensitive information</strong>, but you may volunteer it —
            a question to the Guru or a dream description could mention your health, your beliefs
            or your relationships. Anything you type is stored and processed as described in this
            Policy, so please share only what you are comfortable sharing.
          </p>
        </Callout>
      </Section>

      <Section id="collect" eyebrow="Section 2" heading="What Personal Information We Collect">
        <DataGrid
          cards={[
            {
              title: "Account",
              items: [
                "Email address (from Google)",
                "Name (from Google)",
                "Profile picture (from Google)",
                "Language preference",
                "Subscription tier",
              ],
            },
            {
              title: "Birth Details",
              items: [
                "Date of birth",
                "Time of birth",
                "Place of birth",
                "Latitude & longitude",
                "Names of charts you create",
              ],
            },
            {
              title: "What You Write",
              items: [
                "Questions to the Rishi Guru",
                "Dream descriptions",
                "Guidance preferences",
                "Saved readings",
                "Rituals marked complete",
              ],
            },
            {
              title: "Technical",
              items: [
                "Readings generated & when",
                "Usage against plan limits",
                "Error and diagnostic logs",
                "Session tokens",
                "Approximate region (from IP)",
              ],
            },
          ]}
        />
        <p>
          <strong>We never see or store your Google password.</strong> Authentication is handled
          entirely by Google, which tells us only that you signed in successfully and passes us
          the details above.
        </p>
        <p>
          We do not collect payment card details. When paid plans open, payments will be handled
          by a third-party payment provider and card numbers will not reach our systems.
        </p>
      </Section>

      <Section id="birth-data" eyebrow="Section 3" heading="Birth Details Deserve a Word of Their Own">
        <p>
          A date of birth, an exact time of birth and a place of birth together identify a person
          very precisely — more precisely than most of the information people think of as
          sensitive. We treat them accordingly.
        </p>
        <p>We store them so that your chart does not have to be re-entered each visit. We do not:</p>
        <ul>
          <li>sell, rent or licence them to anybody;</li>
          <li>use them for advertising, profiling for advertising, or audience building;</li>
          <li>combine them with data bought from third parties;</li>
          <li>disclose them to anyone outside the service providers listed in Section 7.</li>
        </ul>
        <Callout>
          <p>
            <strong>Charts you create for other people.</strong> If you enter someone else's birth
            details — a partner for a compatibility reading, a family member — you are
            responsible for having their agreement. You should not enter details for anyone who
            would object, and you must not enter details for a person who has asked you not to.
          </p>
        </Callout>
      </Section>

      <Section id="how-collect" eyebrow="Section 4" heading="How We Collect Your Personal Information">
        <p>
          <strong>Directly from you.</strong> Most information comes from you: when you sign in,
          complete onboarding, enter birth details, ask a question, submit a dream, or change your
          preferences.
        </p>
        <p>
          <strong>From Google.</strong> When you sign in, Google passes us your email address,
          name and profile picture. This is the only third party we receive personal information
          from.
        </p>
        <p>
          <strong>Automatically.</strong> Our systems record which readings were generated and
          when, so we can apply plan limits and avoid regenerating something you already have.
        </p>
        <Callout>
          <p>
            <strong>Unsolicited information.</strong> If we receive personal information we did not
            ask for and that is not reasonably necessary for our functions, we will destroy or
            de-identify it as soon as practicable, in line with APP 4.
          </p>
        </Callout>
      </Section>

      <Section id="how-use" eyebrow="Section 5" heading="How We Use Your Personal Information">
        <ul>
          <li>
            <strong>Delivering the service</strong> — computing your chart, generating readings,
            interpreting dreams, answering questions, remembering your place and your preferences.
          </li>
          <li>
            <strong>Applying your plan</strong> — counting usage against the limits of your tier
            and, in future, managing your subscription.
          </li>
          <li>
            <strong>Support</strong> — responding when you contact us, and investigating faults
            you report.
          </li>
          <li>
            <strong>Security and integrity</strong> — detecting abuse, preventing automated
            scraping, and protecting accounts.
          </li>
          <li>
            <strong>Legal obligations</strong> — complying with Australian law and responding to
            lawful requests.
          </li>
        </ul>
        <p>
          We do not use your information for advertising, and we do not send marketing email. If
          that ever changes, it will be opt-in and you will be asked first.
        </p>
      </Section>

      <Section id="ai" eyebrow="Section 6" heading="How Your Reading Is Made">
        <p>
          A reading is made in two stages, and it matters which is which.
        </p>
        <p>
          <strong>First, your chart is computed.</strong> From your birth moment we calculate the
          sidereal positions of the grahas using the Lahiri ayanamsa, along with your lagna, the
          nakshatra of the Moon, the dasha sequence, the divisional charts and the yogas present.
          This is classical jyotisha, worked by the same rules the tradition has always used. It
          involves no AI, no guesswork and no randomness — the same birth moment yields the same
          chart, today and in ten years.
        </p>
        <p>
          <strong>Then the chart is put into language.</strong> The computed factors, and anything
          you have typed into the Guru or the Dream Oracle, are sent to Anthropic's API, which
          composes the prose you read. The interpretation is drawn from your chart; the sentences
          are written by a model.
        </p>
        <p>
          This is why the reading can show its working. Where a Reading cites a placement — a
          graha, a degree, a house — that citation comes from the computation, not from the
          language.
        </p>
        <p>
          For privacy purposes, what matters is the second stage: the content of your questions
          and dreams leaves our systems and is processed by a third party outside Australia. We
          send only what is needed to produce the reading.
        </p>
        <Callout>
          <p>
            <strong>Please do not type</strong> financial account details, passwords, government
            identity numbers, or anything about another person that they would not want processed
            by an AI service. A reading never needs any of it.
          </p>
        </Callout>
      </Section>

      <Section id="disclosure" eyebrow="Section 7" heading="Disclosure of Your Personal Information">
        <p>
          We use a small number of service providers. Each is named here with what it does and
          where it processes data:
        </p>
        <ul>
          {SUBPROCESSORS.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong> ({s.location}) — {s.purpose}
            </li>
          ))}
        </ul>
        <p>
          We may also disclose personal information where required by Australian law, a court
          order, or a lawful request from a regulator or law enforcement agency.
        </p>
        <Callout>
          <p>
            <strong>Overseas disclosure (APP 8).</strong> All three providers process data in the
            United States. By using the Platform you consent to this transfer. We take reasonable
            steps to use providers with protections substantially similar to the APPs, but you
            should be aware that overseas recipients may be subject to laws that differ from
            Australian privacy law.
          </p>
        </Callout>
        <p>
          <strong>We do not sell your personal information</strong>, and we do not disclose it to
          advertisers, data brokers or analytics networks.
        </p>
      </Section>

      <Section id="storage" eyebrow="Section 8" heading="Cookies &amp; Local Storage">
        <p>
          We do not use advertising or tracking cookies, and we do not run third-party analytics
          that profile you across sites.
        </p>
        <p>The Platform stores a small amount of data in your own browser:</p>
        <ul>
          <li>
            <strong>Your session</strong> — so you stay signed in between visits. Clearing it signs
            you out.
          </li>
          <li>
            <strong>Your language choice</strong> — so the app opens in the language you read.
          </li>
          <li>
            <strong>Cached readings</strong> — so reopening today's reading does not regenerate it.
          </li>
        </ul>
        <p>
          You can clear this at any time through your browser's site-data settings. Clearing it
          does not delete anything from your account.
        </p>
      </Section>

      <Section id="security" eyebrow="Section 9" heading="Data Security">
        <p>
          We take reasonable steps to protect personal information from misuse, interference,
          loss, and unauthorised access, modification or disclosure, as required by APP 11:
        </p>
        <ul>
          <li>all traffic is encrypted in transit with TLS;</li>
          <li>data is encrypted at rest by our hosting provider;</li>
          <li>
            row-level security means a signed-in account can only read its own charts, readings
            and profile — this is enforced by the database, not only by the app;
          </li>
          <li>
            authentication is delegated to Google, so there is no password of ours to steal;
          </li>
          <li>administrative access is limited to those who need it.</li>
        </ul>
        <p>
          No system can be guaranteed completely secure. If you believe your account has been
          accessed without your authority, contact us immediately at{" "}
          <a href={`mailto:${LEGAL_CONTACTS.privacy}`}>{LEGAL_CONTACTS.privacy}</a>.
        </p>
      </Section>

      <Section id="retention" eyebrow="Section 10" heading="Data Retention">
        <ul>
          <li>
            <strong>Account, profile and birth details</strong> — kept while your account exists.
          </li>
          <li>
            <strong>Generated readings</strong> — cached so the same reading is not regenerated;
            these expire over time on their own.
          </li>
          <li>
            <strong>Questions and dreams</strong> — kept as your history until you delete them or
            close your account.
          </li>
          <li>
            <strong>Records of any future paid transaction</strong> — retained for seven years to
            meet Australian tax and record-keeping obligations, even after account closure.
          </li>
        </ul>
        <p>
          When information is no longer needed and no law requires us to keep it, we destroy or
          de-identify it. Backups may hold copies for a short period before they roll over.
        </p>
      </Section>

      <Section id="rights" eyebrow="Section 11" heading="Your Rights — Access, Correction &amp; Deletion">
        <p>
          Under the {STATUTES.privacyAct} and the {STATUTES.apps}, you have the following rights:
        </p>
        <TileGrid
          tiles={[
            { title: "Access", desc: "Ask for a copy of the personal information we hold about you. We respond within 30 days." },
            { title: "Correction", desc: "Ask us to correct anything inaccurate, out of date, incomplete or misleading. Most of it you can edit yourself in your profile." },
            { title: "Deletion", desc: "Ask us to delete your information and close your account. Some records may be retained where law requires." },
            { title: "Portability", desc: "Ask for a copy of your data in a structured, machine-readable format where technically feasible." },
            { title: "Anonymity", desc: "Deal with us anonymously where lawful and practicable — though a chart cannot be computed without birth details." },
            { title: "Complaint", desc: "Complain to us, and then to the OAIC if our response does not satisfy you. See Section 12." },
          ]}
        />
        <p>
          To exercise any of these, write to{" "}
          <a href={`mailto:${LEGAL_CONTACTS.privacy}`}>{LEGAL_CONTACTS.privacy}</a>. We will not
          charge you for making a request, and we respond within 30 days.
        </p>
      </Section>

      <Section id="complaints" eyebrow="Section 12" heading="Privacy Complaints">
        <p>
          If you believe we have interfered with your privacy or failed to comply with the APPs,
          please contact us first at{" "}
          <a href={`mailto:${LEGAL_CONTACTS.privacy}`}>{LEGAL_CONTACTS.privacy}</a>. We will
          acknowledge your complaint within 5 business days and aim to resolve it within 30 days.
        </p>
        <p>If you are not satisfied with our response, you may escalate to:</p>
        <ul>
          {REGULATORS.map((r) => (
            <li key={r.name}>
              <strong>{r.name}</strong> — {r.detail}. {r.scope}.
            </li>
          ))}
        </ul>
      </Section>

      <Section id="children" eyebrow="Section 13" heading="Children's Privacy">
        <p>
          The Platform is not directed at children under 13, and we do not knowingly collect their
          personal information. If you are a parent or guardian and believe your child has given
          us their details, write to{" "}
          <a href={`mailto:${LEGAL_CONTACTS.privacy}`}>{LEGAL_CONTACTS.privacy}</a> and we will
          delete them promptly.
        </p>
        <p>
          Note that a parent may legitimately create a chart for their own child. That is a chart
          about a child, not an account held by one, and it is covered by Section 3.
        </p>
      </Section>

      <Section id="changes" eyebrow="Section 14" heading="Changes to This Policy">
        <p>
          We may update this Policy to reflect changes in our practices or for legal, regulatory
          or operational reasons. The updated Policy will be posted here with a new "Last Updated"
          date.
        </p>
        <p>
          Where a change materially affects how we handle your information — a new service
          provider receiving your data, or a new purpose — we will tell you in the app before it
          takes effect.
        </p>
      </Section>

      <Section id="contact" eyebrow="Section 15" heading="Contact Us">
        <ul>
          <li><strong>Operator:</strong> {LEGAL.entity} (ABN {LEGAL.abn})</li>
          <li><strong>Trading as:</strong> {LEGAL.brand}</li>
          <li><strong>Location:</strong> {LEGAL.governingLaw}</li>
          <li>
            <strong>Privacy enquiries:</strong>{" "}
            <a href={`mailto:${LEGAL_CONTACTS.privacy}`}>{LEGAL_CONTACTS.privacy}</a>
          </li>
          <li>
            <strong>General support:</strong>{" "}
            <a href={`mailto:${LEGAL_CONTACTS.support}`}>{LEGAL_CONTACTS.support}</a>
          </li>
          <li><strong>Website:</strong> {LEGAL.site}</li>
        </ul>
      </Section>
    </LegalLayout>
  );
}
