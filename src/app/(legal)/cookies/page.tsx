import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/config/legal";
import { LegalTitle, Section, P, Strong, Note, DataTable } from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies TedIS sets, what each one does, and how long it lasts.",
};

export default function CookiesPage() {
  return (
    <article>
      <LegalTitle
        title="Cookie Policy"
        subtitle="A short list, because we use very few."
      />

      <Section id="summary" heading="1. The short version">
        <P>
          TedIS sets <Strong>two cookies</Strong>, and both are strictly necessary to sign you in and keep your account
          secure. We do not use advertising, analytics, or third-party tracking cookies.
        </P>
        <Note>
          Because both cookies are strictly necessary for a service you actively asked for, we do not show a cookie
          consent banner — under the ePrivacy rules, consent is not required for this category. If we ever add analytics
          or marketing cookies, we will ask first.
        </Note>
      </Section>

      <Section id="list" heading="2. Cookies we set">
        <DataTable
          head={["Name", "Purpose", "Lifetime", "Accessible to JavaScript"]}
          rows={[
            [
              "tedis_session",
              "Keeps you signed in. Holds an opaque session token — never your password.",
              "30 days (sliding)",
              "No — HttpOnly",
            ],
            [
              "tedis_csrf",
              "Protects against cross-site request forgery by pairing a cookie value with a request header.",
              "30 days",
              "Yes — required for the double-submit check",
            ],
          ]}
        />
        <P>
          Both cookies are set with <Strong>SameSite=Lax</Strong>, and are marked <Strong>Secure</Strong> in production
          so they are only ever sent over HTTPS.
        </P>
      </Section>

      <Section id="not-cookies" heading="3. Things that are not cookies">
        <P>
          Your <Strong>theme preference</Strong> (light or dark) is stored in your browser&rsquo;s local storage, not in
          a cookie. It never leaves your device and is not sent to us.
        </P>
      </Section>

      <Section id="third-party" heading="4. Third-party cookies">
        <P>
          We do not embed third-party advertising or analytics scripts, so no third party sets cookies through TedIS.
          Our infrastructure providers may process technical request data — these are listed in the{" "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          .
        </P>
      </Section>

      <Section id="control" heading="5. Controlling cookies">
        <P>
          You can clear or block cookies in your browser settings. Blocking the two cookies above will prevent you from
          signing in, because the service cannot maintain a session without them.
        </P>
        <P>
          Signing out, or revoking a session from <Strong>Settings</Strong>, invalidates the session server-side — not
          just in your browser.
        </P>
      </Section>

      <Section id="contact" heading="6. Contact">
        <P>
          Questions about cookies: <Strong>{legal.privacyEmail}</Strong>.
        </P>
      </Section>
    </article>
  );
}
