/**
 * GitHub webhook signature verification (X-Hub-Signature-256).
 * Must run against the RAW request body bytes — any re-serialization breaks the MAC.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGithubSignature(
  secret: string,
  rawBody: string | Buffer,
  signatureHeader: string | undefined | null,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
