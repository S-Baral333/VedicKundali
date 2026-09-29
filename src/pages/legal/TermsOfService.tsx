import LegalLayout, {
  Section,
  Callout,
  StatuteNotice,
  type TocEntry,
} from "./LegalLayout";
import { LEGAL, LEGAL_CONTACTS, STATUTES } from "@/lib/legal";

const TOC: TocEntry[] = [
  { id: "intro", label: "Introduction" },
  { id: "definitions", label: "1. Definitions" },
  { id: "not-advice", label: "2. Not Professional Advice" },
  { id: "eligibility", label: "3. Eligibility" },
  { id: "account", label: "4. Your Account" },
  { id: "plans", label: "5. Plans & Payment" },
  { id: "your-content", label: "6. Your Content" },
  { id: "prohibited", label: "7. Prohibited Conduct" },
  { id: "ai", label: "8. AI-Generated Content" },
  { id: "ip", label: "9. Intellectual Property" },
  { id: "availability", label: "10. Availability" },
  { id: "liability", label: "11. Limitation of Liability" },
  { id: "privacy", label: "12. Privacy" },
  { id: "third-party", label: "13. Third-Party Services" },
  { id: "termination", label: "14. Suspension & Termination" },
  { id: "amendments", label: "15. Amendments" },
  { id: "disputes", label: "16. Dispute Resolution" },
  { id: "consumer", label: "17. Consumer Rights Notice" },
  { id: "contact", label: "18. Contact" },
];

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of"
      titleAccent="Service"
      meta={[
        { label: "Last Updated", value: LEGAL.lastUpdated },
        { label: "Governing Law", value: LEGAL.governingLaw },
        { label: "Applies To", value: `All users of ${LEGAL.site}` },
      ]}
      toc={TOC}
    >
      <StatuteNotice tag={STATUTES.acl}>
        Our services come with guarantees that cannot be excluded under the Australian Consumer
        Law. Nothing in these Terms limits, excludes or modifies any right or remedy you have
        under the ACL. Your statutory consumer rights always apply.
      </StatuteNotice>

      <Section id="intro" eyebrow="Introduction" heading="About These Terms">
        <p>
          These Terms govern your access to and use of {LEGAL.brand}, operated by{" "}
          <strong>{LEGAL.entity}</strong> (ABN {LEGAL.abn}), a sole trader based in{" "}
          {LEGAL.governingLaw} ("{LEGAL.brand}", "we", "us", "our").
        </p>
        <p>
          By signing in or using the Platform, you agree to be bound by these Terms. If you do not
          agree, you must not use the service.
        </p>
        <p>
          These Terms are governed by the laws of {LEGAL.governingLaw} and the Commonwealth of
          Australia, including the {STATUTES.aclFull}.
        </p>
      </Section>

      <Section id="definitions" eyebrow="Section 1" heading="Definitions">
        <ul>
          <li><strong>Account</strong> — the account created when you first sign in with Google.</li>
          <li><strong>Chart</strong> — a Vedic astrological chart computed from birth details you supply.</li>
          <li><strong>Consumer</strong> — has the meaning given under the Australian Consumer Law.</li>
          <li><strong>Platform</strong> — the {LEGAL.brand} website, installable app and related services.</li>
          <li><strong>Plan</strong> — a free or paid tier determining which features and limits apply to your Account.</li>
          <li><strong>Reading</strong> — written output generated for you, including horoscopes, chart readings, compatibility analyses, dream interpretations and answers from the Rishi Guru.</li>
          <li><strong>User</strong> — any person who accesses the Platform, with or without an Account.</li>
        </ul>
      </Section>

      <Section id="not-advice" eyebrow="Section 2" heading="What This Service Is Not">
        <Callout>
          <p>
            <strong>Readings are for reflection and entertainment. They are not professional
            advice.</strong> Nothing on the Platform is medical, psychological, legal, financial
            or relationship advice, and nothing here substitutes for a qualified professional.
          </p>
        </Callout>
        <p>
          Do not make a medical decision, a financial commitment, or a decision affecting your
          safety or another person's, on the basis of a Reading. If you are struggling with your
          health or your state of mind, speak to a doctor or a crisis service in your country.
        </p>
        <p>
          Vedic astrology is a traditional interpretive practice. We compute charts according to
          classical rules faithfully, but no Reading predicts the future, diagnoses a condition,
          or establishes a fact about you or anybody else.
        </p>
        <p>
          A Reading is only as precise as the birth details behind it. An approximate birth time
          produces an approximate chart — that is a limitation of the method, not a fault in the
          service.
        </p>
      </Section>

      <Section id="eligibility" eyebrow="Section 3" heading="Eligibility">
        <p>By using the Platform you represent and warrant that:</p>
        <ul>
          <li>you are at least 13 years of age;</li>
          <li>
            if you are under 18, you have the consent of a parent or legal guardian, and they
            accept these Terms on your behalf;
          </li>
          <li>you have the legal capacity to enter a binding agreement;</li>
          <li>you are not barred from using the Platform under any applicable law;</li>
          <li>the information you provide is accurate and current.</li>
        </ul>
        <p>
          We may refuse service, or suspend or close an Account, where we reasonably believe these
          requirements are not met.
        </p>
      </Section>

      <Section id="account" eyebrow="Section 4" heading="Your Account">
        <p>
          Sign-in is through Google. There is no separate password and no separate registration —
          your first sign-in creates your Account.
        </p>
        <p>
          You are responsible for the security of the Google account you sign in with, and for
          everything done through your session. Tell us promptly at{" "}
          <a href={`mailto:${LEGAL_CONTACTS.support}`}>{LEGAL_CONTACTS.support}</a> if you believe
          your Account has been accessed without your authority.
        </p>
        <p>
          One Account per person. Do not create Accounts on behalf of others without their
          authority, or share your session with others to bypass Plan limits.
        </p>
      </Section>

      <Section id="plans" eyebrow="Section 5" heading="Plans &amp; Payment">
        <Callout>
          <p>
            <strong>Payments are not open yet.</strong> No charge can currently be made and no
            payment details are collected. The clauses below take effect when paid Plans open,
            and the billing, renewal and cancellation terms will be confirmed here before any
            money changes hands.
          </p>
        </Callout>
        <p>
          Prices are displayed in Australian dollars (AUD) on the pricing page before you commit
          to anything.
        </p>
        <p>
          <strong>
            {LEGAL.entity} is not currently registered for GST, so no GST is charged and prices
            are not GST-inclusive.
          </strong>{" "}
          If we become registered for GST, prices and invoices will be updated to reflect it and
          you will be told before it applies to you.
        </p>
        <p>
          When paid Plans open: subscriptions renew automatically for the period you selected
          until cancelled; you may cancel at any time and retain access until the end of the
          period already paid for; and refunds are governed by our{" "}
          <a href="/refunds">Refund Policy</a> and the ACL.
        </p>
      </Section>

      <Section id="your-content" eyebrow="Section 6" heading="Your Content">
        <p>
          You keep ownership of what you put into the Platform — birth details, questions, dream
          descriptions and chart names. You grant us a limited licence to store and process that
          content solely to operate the service for you, including sending the necessary parts to
          the AI provider described in Section 8.
        </p>
        <p>
          We do not use your content to train AI models, and we do not publish it or share it with
          other users.
        </p>
        <Callout>
          <p>
            <strong>Other people's birth details.</strong> If you create a chart for somebody
            else, you confirm you have their consent. You are responsible for that, and you must
            not enter details for anybody who has asked you not to.
          </p>
        </Callout>
      </Section>

      <Section id="prohibited" eyebrow="Section 7" heading="Prohibited Conduct">
        <p>You must not:</p>
        <ul>
          <li>resell, redistribute, scrape or bulk-extract Readings, or use the Platform to operate a competing service;</li>
          <li>use bots, crawlers or scripts to access the Platform or generate Readings;</li>
          <li>circumvent Plan limits, paywalls, or the technical measures that enforce them;</li>
          <li>submit another living person's birth details without their consent;</li>
          <li>
            use a Reading to harass, frighten, coerce or deceive anybody — including by presenting
            one as a prediction of a person's death, illness, misfortune or guilt;
          </li>
          <li>present Readings as professional medical, legal or financial advice to others;</li>
          <li>upload malware, attempt to breach our security, or interfere with the Platform's operation;</li>
          <li>breach any applicable Australian law.</li>
        </ul>
        <p>Breach of this section may result in immediate suspension or closure of your Account.</p>
      </Section>

      <Section id="ai" eyebrow="Section 8" heading="How Readings Are Composed">
        <p>
          <strong>Your chart is computed, not generated.</strong> The sidereal positions of the
          grahas, your lagna, the nakshatras, the dasha sequence, the divisional charts and the
          yogas are calculated from your birth moment by classical rule, using the Lahiri
          ayanamsa. That calculation is deterministic: the same birth moment always produces the
          same chart.
        </p>
        <p>
          <strong>The words are composed by a language model</strong> working from that
          computation. So while the placements a Reading cites are exact, the prose around them is
          written, and can be wrong, internally inconsistent, or different between two runs of the
          same question.
        </p>
        <p>
          Treat a Reading as one voice reading your chart — the way a jyotishi offers a view
          rather than a verdict — and not as a statement of fact about what will happen.
        </p>
        <p>
          Composing a Reading requires sending the relevant computed factors, and anything you
          typed, to a third-party provider outside Australia. This is described in Section 6 of
          our <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          We are not liable for the content of any individual Reading beyond our obligations under
          the ACL, and we do not warrant that a Reading is accurate, complete or fit for any
          decision you take.
        </p>
      </Section>

      <Section id="ip" eyebrow="Section 9" heading="Intellectual Property">
        <p>
          The Platform — its design, code, wordmark, imagery and the classical interpretive
          material we have written — belongs to {LEGAL.entity} or our licensors and is protected
          under Australian copyright and trade mark law.
        </p>
        <p>
          You receive a limited, non-exclusive, non-transferable right to use the Platform for
          personal, non-commercial purposes. Readings generated for you may be used and shared
          personally; they may not be republished commercially or presented as another service's
          output.
        </p>
      </Section>

      <Section id="availability" eyebrow="Section 10" heading="Availability">
        <p>
          We try to keep the Platform running, but we do not promise it will be uninterrupted or
          error-free. Features may change or be withdrawn.
        </p>
        <p>
          Readings depend on third-party hosting and AI services and may fail or be delayed for
          reasons outside our control. Long-form Readings in particular can take time to generate,
          and occasionally will not complete.
        </p>
      </Section>

      <Section id="liability" eyebrow="Section 11" heading="Limitation of Liability">
        <p>
          Nothing in these Terms excludes, restricts or modifies any right or remedy you have
          under the Australian Consumer Law, including the consumer guarantees, which cannot be
          excluded by agreement.
        </p>
        <p>
          Subject to that, to the maximum extent permitted by law, our total liability to you for
          any claim arising from these Terms or the Platform is limited to the amount you paid us
          in the twelve months before the claim arose — and where you use the service on a free
          Plan, to the resupply of the service.
        </p>
        <p>To the maximum extent permitted by law, we are not liable for:</p>
        <ul>
          <li>decisions you or anybody else make on the basis of a Reading;</li>
          <li>loss of profit, revenue, data or opportunity;</li>
          <li>indirect, consequential or incidental loss;</li>
          <li>events outside our reasonable control, including third-party outages;</li>
          <li>distress arising from the content of an AI-generated Reading.</li>
        </ul>
      </Section>

      <Section id="privacy" eyebrow="Section 12" heading="Privacy">
        <p>
          We handle personal information in accordance with the {STATUTES.privacyAct} and the{" "}
          {STATUTES.apps}. Our <a href="/privacy">Privacy Policy</a> forms part of these Terms and
          sets out what we collect, why, and who else receives it.
        </p>
      </Section>

      <Section id="third-party" eyebrow="Section 13" heading="Third-Party Services">
        <p>
          The Platform depends on third parties for authentication, hosting and AI generation, and
          will depend on a payment provider when paid Plans open. Your use of Google sign-in is
          also subject to Google's own terms and privacy policy.
        </p>
        <p>
          We are not responsible for the content, practices or availability of third-party
          services.
        </p>
      </Section>

      <Section id="termination" eyebrow="Section 14" heading="Suspension &amp; Termination">
        <p>
          You may stop using the Platform at any time and ask us to delete your Account by writing
          to <a href={`mailto:${LEGAL_CONTACTS.support}`}>{LEGAL_CONTACTS.support}</a>.
        </p>
        <p>
          We may suspend or close an Account that breaches these Terms, or where required by law.
          Where a paid Plan is closed by us other than for breach, we will refund the unused
          portion of the period already paid for.
        </p>
      </Section>

      <Section id="amendments" eyebrow="Section 15" heading="Amendments">
        <p>
          We may amend these Terms. Material changes will be posted here with a new "Last Updated"
          date and notified in the app before they take effect. Continued use after that
          constitutes acceptance.
        </p>
        <p>
          If you do not accept a change, you may stop using the Platform and ask us to close your
          Account.
        </p>
      </Section>

      <Section id="disputes" eyebrow="Section 16" heading="Dispute Resolution">
        <p>
          Please contact us first — most problems are resolved quickly. Write to{" "}
          <a href={`mailto:${LEGAL_CONTACTS.legal}`}>{LEGAL_CONTACTS.legal}</a> describing the
          issue and what you would like done.
        </p>
        <p>
          If we cannot resolve it between us, either party may refer the matter to mediation
          before commencing proceedings. Nothing prevents either party from seeking urgent relief
          from a court.
        </p>
        <p>
          These Terms are governed by the laws of {LEGAL.governingLaw}, and you submit to the
          non-exclusive jurisdiction of its courts.
        </p>
      </Section>

      <Section id="consumer" eyebrow="Section 17" heading="Consumer Rights Notice">
        <Callout>
          <p>
            Our services come with guarantees that cannot be excluded under the{" "}
            <strong>Australian Consumer Law</strong>. For major failures with the service, you are
            entitled to cancel your service contract with us and to a refund for the unused
            portion, or to compensation for its reduced value. You are also entitled to be
            compensated for any other reasonably foreseeable loss or damage. If the failure does
            not amount to a major failure, you are entitled to have problems with the service
            rectified in a reasonable time and, if this is not done, to cancel your contract and
            obtain a refund for the unused portion.
          </p>
        </Callout>
      </Section>

      <Section id="contact" eyebrow="Section 18" heading="Contact Us">
        <ul>
          <li><strong>Operator:</strong> {LEGAL.entity} (ABN {LEGAL.abn})</li>
          <li><strong>Trading as:</strong> {LEGAL.brand}</li>
          <li><strong>Location:</strong> {LEGAL.governingLaw}</li>
          <li>
            <strong>Legal enquiries:</strong>{" "}
            <a href={`mailto:${LEGAL_CONTACTS.legal}`}>{LEGAL_CONTACTS.legal}</a>
          </li>
          <li>
            <strong>Support:</strong>{" "}
            <a href={`mailto:${LEGAL_CONTACTS.support}`}>{LEGAL_CONTACTS.support}</a>
          </li>
          <li><strong>Website:</strong> {LEGAL.site}</li>
        </ul>
      </Section>
    </LegalLayout>
  );
}
