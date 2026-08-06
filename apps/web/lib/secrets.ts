/**
 * Resolves a webhook subscription's `signingSecretReference` (stored in the
 * database, e.g. an env var name) to the actual secret. This module is the
 * app's single sanctioned seam for reference-based secret lookups — the
 * reference is data (per subscription), so it cannot live in a static
 * config loader.
 */
export function resolveSecretFromEnv(reference: string): string {
  const value = process.env[reference];
  if (!value) {
    throw new Error(`No secret configured for reference: ${reference}`);
  }
  return value;
}
