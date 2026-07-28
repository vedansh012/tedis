import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/config/legal";
import { LegalTitle, Section, P, UL, Strong, Note, DataTable } from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How TedIS collects, uses, stores, and deletes your personal data.",
};

export default function PrivacyPage() {
  return (
    <article>
      <LegalTitle
        title="Privacy Policy"
        subtitle="What we collect, why we collect it, and what control you have over it."
      />

      <Section id="who" heading="1. Who we are">
        <P>
          TedIS (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by <Strong>{legal.entityName}</Strong>, based in{" "}
          {legal.jurisdiction}. For data-protection purposes we are the <Strong>data controller</Strong> for the
          information described here.
        </P>
        <P>
          Postal address: {legal.address}. Privacy enquiries: <Strong>{legal.privacyEmail}</Strong>.
        </P>
      </Section>

      <Section id="collect" heading="2. What we collect">
        <P>We collect only what the service needs to function. Specifically:</P>
        <DataTable
          head={["Category", "Examples", "Why"]}
          rows={[
            ["Account", "Email address, username, display name, password (hashed)", "To create and secure your account"],
            ["Profile", "Headline, bio, location, website, pronouns, avatar and banner images", "Shown on your public profile — you choose what to add"],
            ["Content", "Posts, comments, projects, reactions, bookmarks, interests you follow", "The core of the service; most of this is public"],
            ["Messages", "Direct message contents and attachments", "To deliver your conversations"],
            ["Technical", "IP address, browser user-agent, device fingerprint, approximate location (country/city)", "Security: detecting suspicious logins and abuse"],
            ["Usage", "Login events, session activity timestamps", "To let you review and revoke active sessions"],
          ]}
        />
        <Note>
          <Strong>Worth knowing:</Strong> we record your IP address, user-agent and an approximate location each time
          you sign in, and we keep a device fingerprint so we can recognise devices you have used before. This is used
          for account security, not advertising.
        </Note>
      </Section>

      <Section id="public" heading="3. What is public">
        <P>
          TedIS is a platform for building in the open, so a lot of what you create is public by design. Your{" "}
          <Strong>username, display name, profile details, posts, comments, and projects</Strong> are visible to anyone
          — including people who are not signed in, and search engines.
        </P>
        <P>
          <Strong>Direct messages are not public.</Strong> They are visible to the participants in the conversation and,
          where necessary, to our staff investigating a report or abuse (see §6).
        </P>
      </Section>

      <Section id="why" heading="4. Why we are allowed to use it">
        <P>Where the UK/EU GDPR applies, our lawful bases are:</P>
        <UL>
          <li>
            <Strong>Contract</Strong> — to provide the account and features you signed up for.
          </li>
          <li>
            <Strong>Legitimate interests</Strong> — to keep the platform secure, prevent abuse, and fix errors.
          </li>
          <li>
            <Strong>Legal obligation</Strong> — where we must retain or disclose data by law.
          </li>
        </UL>
        <P>
          We do <Strong>not</Strong> sell your personal data, and we do not use it for behavioural advertising or
          profiling.
        </P>
      </Section>

      <Section id="processors" heading="5. Who else processes your data">
        <P>
          We use a small number of infrastructure providers (&ldquo;sub-processors&rdquo;). They act on our
          instructions and are not permitted to use your data for their own purposes.
        </P>
        <DataTable
          head={["Provider", "Purpose", "Data involved"]}
          rows={legal.processors.map((p) => [p.name, p.purpose, p.data])}
        />
        <P>
          Some of these providers operate outside your country. Where data leaves the UK/EEA, we rely on the providers&rsquo;
          standard contractual clauses or equivalent safeguards.
        </P>
      </Section>

      <Section id="retention" heading="6. How long we keep it, and what deletion actually does">
        <P>
          You can delete your account at any time from <Strong>Settings &rarr; Danger zone</Strong>. We think it is
          important to be precise about what that does, because &ldquo;delete&rdquo; means different things on different
          platforms.
        </P>
        <P>
          <Strong>Deleting your account immediately:</Strong>
        </P>
        <UL>
          <li>revokes every active session and signs you out everywhere;</li>
          <li>permanently deletes your stored password;</li>
          <li>erases your bio, headline, location, website, avatar and banner;</li>
          <li>replaces your email address, username and display name with anonymised values.</li>
        </UL>
        <P>
          <Strong>What is retained:</Strong> posts, comments and messages you have already sent remain, but are
          attributed to &ldquo;Deleted account&rdquo; and are no longer linked to your identity. We keep them because
          removing them would break conversations other people took part in. Security logs (login events, audit records)
          are also retained for a limited period for fraud and abuse prevention.
        </P>
        <P>
          If you need your remaining content removed as well, email <Strong>{legal.privacyEmail}</Strong> and we will
          handle it manually.
        </P>
      </Section>

      <Section id="rights" heading="7. Your rights">
        <P>Depending on where you live, you may have the right to:</P>
        <UL>
          <li>access a copy of the personal data we hold about you;</li>
          <li>correct inaccurate data (most of this you can edit yourself in Settings);</li>
          <li>delete your account and associated personal data;</li>
          <li>object to or restrict certain processing;</li>
          <li>request your data in a portable format;</li>
          <li>complain to your local data protection authority.</li>
        </UL>
        <Note>
          <Strong>Currently manual:</Strong> we do not yet have a self-service data export. To request a copy of your
          data, email <Strong>{legal.privacyEmail}</Strong> and we will respond within 30 days.
        </Note>
      </Section>

      <Section id="security" heading="8. Security">
        <P>
          Passwords are hashed with Argon2id and never stored in plain text. Session tokens are stored hashed, expire
          automatically, and can be revoked by you at any time. All traffic is encrypted in transit over HTTPS.
        </P>
        <P>
          No service can promise perfect security. If we become aware of a breach affecting your personal data, we will
          notify you and the relevant authority where the law requires it.
        </P>
      </Section>

      <Section id="children" heading="9. Children">
        <P>
          TedIS is not intended for anyone under {legal.minimumAge}. We do not knowingly collect data from children
          under that age. If you believe a child has created an account, contact {legal.privacyEmail} and we will remove
          it.
        </P>
      </Section>

      <Section id="cookies-ref" heading="10. Cookies">
        <P>
          We use a small number of strictly necessary cookies. See the{" "}
          <Link href="/cookies" className="font-medium text-primary underline-offset-4 hover:underline">
            Cookie Policy
          </Link>{" "}
          for the full list.
        </P>
      </Section>

      <Section id="changes" heading="11. Changes to this policy">
        <P>
          We may update this policy as the service changes. The &ldquo;last updated&rdquo; date at the top always
          reflects the current version, and we will tell you in-app about material changes.
        </P>
      </Section>

      <Section id="contact" heading="12. Contact">
        <P>
          Questions about this policy or your data: <Strong>{legal.privacyEmail}</Strong>. General enquiries:{" "}
          <Strong>{legal.contactEmail}</Strong>.
        </P>
      </Section>
    </article>
  );
}
