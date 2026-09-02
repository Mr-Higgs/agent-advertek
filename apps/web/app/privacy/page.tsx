import { PageShell, SectionLabel } from "@/components/site";
import { createMetadata } from "@/lib/site-config";

export const metadata = createMetadata("privacy");

export default function PrivacyPage() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <PageShell className="max-w-3xl">
        <SectionLabel>LEGAL</SectionLabel>
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] mt-4 mb-10">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-[15px] leading-relaxed text-ink/80">
          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Overview</h2>
            <p>
              Advertek respects your privacy. This policy describes what information we collect, how we use it, and how
              we protect it when you use advertek.io and the Agent Rail demo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Information we collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Access requests:</strong> name, email, company, role, use case, and workflow details submitted
                through the pilot access form.
              </li>
              <li>
                <strong>Demo usage:</strong> prompts, artwork URLs, and quote responses used to operate the chat demo.
                Artwork is stored in time-limited, private Vercel Blob storage and is not used to train models.
              </li>
              <li>
                <strong>Technical data:</strong> IP address, user agent, and request logs for rate limiting, security,
                and debugging.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">How we use information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To assess pilot fit and respond to access requests.</li>
              <li>To operate, secure, and improve the website and demo.</li>
              <li>To prevent abuse and unauthorized access.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Sharing and retention</h2>
            <p>
              We do not sell personal data. Access-request data is shared only with the internal team evaluating pilot
              fit. Demo artwork and prompts are retained only as long as needed for the demo session and are not used for
              training or advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Your rights</h2>
            <p>
              You can request access, correction, or deletion of your personal data by contacting{" "}
              <a href="mailto:privacy@advertekprinting.com" className="underline hover:text-ink">
                privacy@advertekprinting.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Changes</h2>
            <p>We may update this policy as the service evolves. The latest version is posted here.</p>
          </section>
        </div>
      </PageShell>
    </section>
  );
}
