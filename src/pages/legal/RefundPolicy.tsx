import LegalLayout, {
  Section,
  Callout,
  StatuteNotice,
  ScenarioList,
  Timeline,
  PairRows,
  type TocEntry,
} from "./LegalLayout";
import { LEGAL, LEGAL_CONTACTS, STATUTES, REGULATORS } from "@/lib/legal";

const TOC: TocEntry[] = [
  { id: "intro", label: "Introduction" },
  { id: "entitled", label: "1. When You're Entitled" },
  { id: "not-available", label: "2. When Refunds Aren't Available" },
  { id: "cancelling", label: "3. Cancelling a Subscription" },
  { id: "how-to", label: "4. How to Request a Refund" },
  { id: "processing", label: "5. Processing Times" },
  { id: "chargebacks", label: "6. Chargebacks" },
  { id: "complaints", label: "7. Complaints & Escalation" },
  { id: "contact", label: "8. Contact" },
];

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund"
      titleAccent="Policy"
      meta={[
        { label: "Last Updated", value: LEGAL.lastUpdated },
        { label: "Legislation", value: STATUTES.acl },
        { label: "Currency", value: "Australian Dollars (AUD)" },
      ]}
      toc={TOC}
    >
      <StatuteNotice tag={`Important — ${STATUTES.acl}`}>
        Our services come with guarantees that cannot be excluded under the Australian Consumer
        Law. Nothing in this Refund Policy limits, excludes or modifies any right or remedy you
        may have under the ACL. This Policy explains our practices in addition to — never instead
        of — your statutory rights.
      </StatuteNotice>

      <Section id="intro" eyebrow="Introduction" heading="About This Policy">
        <p>
          This Policy explains when {LEGAL.entity} (ABN {LEGAL.abn}), trading as {LEGAL.brand},
          will refund a subscription payment.
        </p>
        <Callout>
          <p>
            <strong>Payments are not open yet.</strong> No charge can currently be made and no
            payment details are collected, so nothing here applies to anybody today. This Policy
            is published in advance so the terms are visible before you are ever asked for money
            — not after.
          </p>
        </Callout>
        <p>
          {LEGAL.brand} sells access to a digital service on a subscription basis. We are the
          seller; there is no intermediary and no third-party merchant. Refunds are issued to the
          original payment method.
        </p>
      </Section>

      <Section id="entitled" eyebrow="Section 1" heading="When You Are Entitled to a Refund">
        <ScenarioList
          scenarios={[
            {
              verdict: "yes",
              badge: "Eligible",
              title: "Major failure under the ACL",
              detail:
                "If the service fails to meet a consumer guarantee and the failure is major — it is substantially unfit for its purpose, or cannot be made fit within a reasonable time — you may choose a refund or compensation for the reduced value. This right cannot be excluded.",
            },
            {
              verdict: "yes",
              badge: "Eligible",
              title: "Charged after you cancelled",
              detail:
                "If we bill you for a period after you cancelled, we refund that charge in full. Tell us and we will correct it without argument.",
            },
            {
              verdict: "yes",
              badge: "Eligible",
              title: "Duplicate or incorrect charge",
              detail:
                "If you are charged twice for the same period, or charged an amount other than the price shown at checkout, we refund the difference in full.",
            },
            {
              verdict: "yes",
              badge: "Eligible",
              title: "Paid features unavailable for a sustained period",
              detail:
                "If the features of your paid tier are unavailable for a sustained period through our fault, you are entitled to a refund for the affected portion of your subscription. Brief outages and individual failed readings are handled by regenerating the reading.",
            },
            {
              verdict: "maybe",
              badge: "Case by case",
              title: "Accidental renewal, told to us promptly",
              detail:
                "If a subscription renewed and you had genuinely intended to cancel, contact us within 14 days of the charge. Where the renewed period is substantially unused we will generally refund it, at our discretion. This is a goodwill practice and not a statutory right.",
            },
            {
              verdict: "maybe",
              badge: "Case by case",
              title: "Account closed by us other than for breach",
              detail:
                "If we close or suspend your account for a reason other than breach of the Terms, we refund the unused portion of the period already paid for.",
            },
          ]}
        />
      </Section>

      <Section id="not-available" eyebrow="Section 2" heading="When Refunds Are Generally Not Available">
        <ScenarioList
          scenarios={[
            {
              verdict: "no",
              badge: "Not eligible",
              title: "Change of mind",
              detail:
                "Deciding you no longer want the subscription does not by itself entitle you to a refund for a period already paid for. You can cancel to prevent the next renewal, and you keep access until the paid period ends.",
            },
            {
              verdict: "no",
              badge: "Not eligible",
              title: "You did not use it",
              detail:
                "Forgetting about the subscription, or not generating readings during a period, does not entitle you to a refund for that period. The service was available to you throughout.",
            },
            {
              verdict: "no",
              badge: "Not eligible",
              title: "Disagreeing with a reading",
              detail:
                "Readings are interpretive and generated by an AI model. A reading you disagree with, find unhelpful, or that did not come to pass is not a fault in the service. This is set out plainly in the Terms before you subscribe.",
            },
            {
              verdict: "no",
              badge: "Not eligible",
              title: "Inaccurate birth details",
              detail:
                "A chart computed from the details you entered is correct for those details. If the birth time was wrong or approximate, correct it in your profile and regenerate — no refund arises.",
            },
            {
              verdict: "no",
              badge: "Not eligible",
              title: "Account closed for breach",
              detail:
                "If we close your account for breaching the Terms — scraping, resale, circumventing plan limits, or misusing readings against another person — no refund is due for the remaining period.",
            },
          ]}
        />
        <Callout>
          <p>
            None of the above limits your rights under the ACL. If a consumer guarantee has been
            breached, a statutory remedy applies regardless of what this section says.
          </p>
        </Callout>
      </Section>

      <Section id="cancelling" eyebrow="Section 3" heading="Cancelling a Subscription">
        <p>
          You can cancel at any time from your billing settings. Cancelling stops the next
          renewal; it is not itself a refund request.
        </p>
        <ul>
          <li>You keep full access to your paid tier until the end of the period already paid for.</li>
          <li>Your account then reverts to the free tier. It is not deleted.</li>
          <li>Your charts, readings and history remain available within free-tier limits.</li>
          <li>You are not charged again unless you resubscribe.</li>
        </ul>
        <p>
          Deleting your account is separate from cancelling and is not reversible. Ask us at{" "}
          <a href={`mailto:${LEGAL_CONTACTS.support}`}>{LEGAL_CONTACTS.support}</a> if that is
          what you want.
        </p>
      </Section>

      <Section id="how-to" eyebrow="Section 4" heading="How to Request a Refund">
        <Timeline
          steps={[
            {
              step: "Step 1 — Write to us",
              desc: (
                <>
                  Email{" "}
                  <a href={`mailto:${LEGAL_CONTACTS.billing}`}>{LEGAL_CONTACTS.billing}</a> from
                  the address on your account, with "Refund request" in the subject.
                </>
              ),
            },
            {
              step: "Step 2 — Tell us what happened",
              desc: "Include the email address on the account, the approximate date and amount of the charge, and what went wrong. If it relates to a failure of the service, tell us roughly when you noticed it.",
            },
            {
              step: "Step 3 — We assess it",
              desc: "We review the request against this Policy and the ACL, and respond within 5 business days. If we need more information we will ask once, clearly.",
            },
            {
              step: "Step 4 — Outcome",
              desc: "If approved, the refund is issued to the original payment method. If declined, we tell you why and what your options are, including how to escalate.",
            },
          ]}
        />
      </Section>

      <Section id="processing" eyebrow="Section 5" heading="Processing Times">
        <p>Once approved, we issue the refund immediately. How long it takes to appear depends on your provider:</p>
        <PairRows
          rows={[
            { label: "Credit or debit card", value: "5–10 business days" },
            { label: "PayPal", value: "3–5 business days" },
            { label: "Apple Pay / Google Pay", value: "5–10 business days" },
            { label: "Bank transfer", value: "5–7 business days" },
          ]}
        />
        <Callout>
          <p>
            Refunds are issued to the <strong>original payment method only</strong> — we cannot
            refund to a different card, account or person. The final credit depends on your bank
            and may take longer than the times above.
          </p>
        </Callout>
      </Section>

      <Section id="chargebacks" eyebrow="Section 6" heading="Chargebacks">
        <p>
          Please contact us before raising a chargeback with your bank. Most disputes are a
          billing mistake we can fix in a day, and a chargeback takes considerably longer to
          resolve for both of us.
        </p>
        <p>
          If a chargeback is raised where no refund was due under this Policy or the ACL, we may
          suspend the account and decline future subscriptions. We will always respond to the
          claim with our records.
        </p>
      </Section>

      <Section id="complaints" eyebrow="Section 7" heading="Complaints &amp; Escalation">
        <p>
          If you are unhappy with a refund decision, reply to us and ask for it to be reviewed, or
          write to <a href={`mailto:${LEGAL_CONTACTS.legal}`}>{LEGAL_CONTACTS.legal}</a>. We
          acknowledge within 2 business days and aim to resolve within 10.
        </p>
        <p>If we cannot resolve it between us, you may seek assistance from:</p>
        <ul>
          {REGULATORS.filter((r) => r.scope !== "Privacy complaints").map((r) => (
            <li key={r.name}>
              <strong>{r.name}</strong> — {r.detail}
            </li>
          ))}
        </ul>
        <p>
          As a {LEGAL.state}-based business, Consumer Affairs {LEGAL.state} is usually the most
          direct route for a consumer complaint about us.
        </p>
      </Section>

      <Section id="contact" eyebrow="Section 8" heading="Contact Us">
        <ul>
          <li><strong>Operator:</strong> {LEGAL.entity} (ABN {LEGAL.abn})</li>
          <li><strong>Trading as:</strong> {LEGAL.brand}</li>
          <li>
            <strong>Billing &amp; refunds:</strong>{" "}
            <a href={`mailto:${LEGAL_CONTACTS.billing}`}>{LEGAL_CONTACTS.billing}</a>
          </li>
          <li>
            <strong>Escalation:</strong>{" "}
            <a href={`mailto:${LEGAL_CONTACTS.legal}`}>{LEGAL_CONTACTS.legal}</a>
          </li>
          <li><strong>Website:</strong> {LEGAL.site}</li>
        </ul>
      </Section>
    </LegalLayout>
  );
}
