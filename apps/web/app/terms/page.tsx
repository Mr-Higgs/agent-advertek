import { PageShell, SectionLabel } from "@/components/site";
import { createMetadata } from "@/lib/site-config";

export const metadata = createMetadata("terms");

export default function TermsPage() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <PageShell className="max-w-3xl">
        <SectionLabel>LEGAL</SectionLabel>
        <h1 className="font-serif text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] mt-4 mb-10">
          Terms of Use
        </h1>

        <div className="space-y-8 text-[15px] leading-relaxed text-ink/80">
          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Acceptance</h2>
            <p>
              By using advertek.io, the Agent Rail demo, or any related service, you accept these terms. If you do not
              agree, do not use the site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Demo use</h2>
            <p>
              The demo is provided for evaluation only. It does not create production orders, bind Advertek to a price,
              or move funds. Demo quotes are non-binding and may use mock pricing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Non-binding quotes</h2>
            <p>
              Any price, quote, or estimate displayed on this site or through the demo is informational unless
              explicitly confirmed in writing by Advertek. Production orders require a formal quote, approval, and
              payment process.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Uploaded files</h2>
            <p>
              Artwork uploaded to the demo is stored temporarily for the demo session. You retain ownership of your
              files. Do not upload files you do not have rights to share. Advertek does not claim ownership of uploaded
              artwork.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Acceptable use</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Do not attempt to access restricted systems or other users data.</li>
              <li>Do not upload malicious files or use automated tools to abuse rate limits.</li>
              <li>Do not use the service for unlawful purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Access requests</h2>
            <p>
              Submitting the access request form does not guarantee pilot acceptance. Advertek will review fit, volume,
              workflow, and integration needs before granting access.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Warranty and liability</h2>
            <p>
              The site and demo are provided as-is. Advertek is not liable for decisions made on demo output. All
              production work is governed by a separate commercial agreement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-medium text-ink mb-3">Changes</h2>
            <p>We may update these terms as the service evolves. The latest version is posted here.</p>
          </section>
        </div>
      </PageShell>
    </section>
  );
}
