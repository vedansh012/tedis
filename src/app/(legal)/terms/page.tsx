import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/config/legal";
import { LegalTitle, Section, P, UL, Strong, Note } from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using TedIS.",
};

export default function TermsPage() {
  return (
    <article>
      <LegalTitle
        title="Terms of Service"
        subtitle="The agreement between you and us when you use TedIS."
      />

      <Section id="acceptance" heading="1. Agreement">
        <P>
          These terms are a contract between you and <Strong>{legal.entityName}</Strong> (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). By creating an account or using TedIS, you agree to them. If you do not agree, please do
          not use the service.
        </P>
      </Section>

      <Section id="eligibility" heading="2. Who can use TedIS">
        <P>
          You must be at least <Strong>{legal.minimumAge} years old</Strong> to hold an account. You must provide
          accurate information when signing up, and you are responsible for everything that happens under your account.
        </P>
        <P>
          Keep your password secure. Tell us at {legal.contactEmail} if you believe someone else has accessed your
          account.
        </P>
      </Section>

      <Section id="content" heading="3. Your content">
        <P>
          <Strong>You own what you post.</Strong> We claim no ownership of your posts, comments, projects, images or
          video.
        </P>
        <P>
          To run the service we need a limited licence: by posting, you grant us a non-exclusive, worldwide, royalty-free
          licence to host, store, reproduce and display your content <Strong>solely for the purpose of operating and
          promoting TedIS</Strong>. This licence ends when you delete the content, except where it has already been
          shared with others or where we must retain it by law.
        </P>
        <P>
          You are responsible for having the rights to what you post — including any code, images or video you upload.
        </P>
      </Section>

      <Section id="acceptable" heading="4. Acceptable use">
        <P>Do not use TedIS to:</P>
        <UL>
          <li>post unlawful, harassing, hateful, or threatening content;</li>
          <li>impersonate another person or organisation;</li>
          <li>post sexual content involving minors, or any other content that exploits or endangers children;</li>
          <li>infringe someone else&rsquo;s intellectual property;</li>
          <li>distribute malware, or attempt to breach, overload, or probe our systems;</li>
          <li>scrape or bulk-collect data about other users without permission;</li>
          <li>send spam, or use the platform primarily to advertise;</li>
          <li>evade a block, suspension, or ban.</li>
        </UL>
        <P>
          You can report content that breaks these rules using the report option on any post, comment, project or
          profile.
        </P>
      </Section>

      <Section id="moderation" heading="5. Moderation and enforcement">
        <P>
          We may remove content, suspend accounts, or ban users who break these terms. Where it is reasonable to do so,
          we will tell you why. We may act without notice where content is illegal, harmful, or presents a risk to
          others or to the platform.
        </P>
        <P>
          If you think we got a decision wrong, reply to the notice or contact {legal.contactEmail} and we will review
          it.
        </P>
      </Section>

      <Section id="availability" heading="6. Availability">
        <P>
          TedIS is provided <Strong>as is</Strong>. We do not guarantee it will be uninterrupted, error-free, or that
          data will never be lost. We may change, suspend, or discontinue features at any time.
        </P>
        <Note>
          <Strong>Please keep your own backups.</Strong> TedIS is a young platform and should not be the only place your
          work exists.
        </Note>
      </Section>

      <Section id="termination" heading="7. Ending your account">
        <P>
          You can delete your account at any time in <Strong>Settings &rarr; Danger zone</Strong>. What deletion does,
          and what is retained afterwards, is described in the{" "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </P>
        <P>
          We may terminate or suspend your account if you materially breach these terms, or if we are required to by
          law.
        </P>
      </Section>

      <Section id="liability" heading="8. Liability">
        <P>
          To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential losses,
          or for lost profits, data, or goodwill arising from your use of TedIS.
        </P>
        <P>
          Nothing in these terms excludes liability that cannot be excluded by law — including liability for death or
          personal injury caused by negligence, or for fraud.
        </P>
      </Section>

      <Section id="law" heading="9. Governing law">
        <P>
          These terms are governed by {legal.governingLaw}, and the courts of {legal.jurisdiction} have jurisdiction over
          any dispute. If you are a consumer, you may also have the right to bring proceedings in your own country.
        </P>
      </Section>

      <Section id="changes" heading="10. Changes">
        <P>
          We may update these terms. The &ldquo;last updated&rdquo; date at the top reflects the current version. For
          material changes we will give notice in-app before they take effect. Continuing to use TedIS after that means
          you accept the new terms.
        </P>
      </Section>

      <Section id="contact" heading="11. Contact">
        <P>
          {legal.entityName}, {legal.address}. Email: <Strong>{legal.contactEmail}</Strong>.
        </P>
      </Section>
    </article>
  );
}
