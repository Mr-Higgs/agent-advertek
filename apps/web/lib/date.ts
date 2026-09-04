export function getQuoteExpiry(minutesFromNow = 30): string {
  const expiry = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return expiry.toISOString().replace(/\.\d{3}Z$/, "Z");
}
