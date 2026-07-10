import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyGithubSignature } from "../src/github/webhookVerify.js";

const SECRET = "test-webhook-secret-0123456789";
const BODY = JSON.stringify({ ref: "refs/heads/main", after: "abc123" });

function sign(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verifyGithubSignature", () => {
  it("accepts a valid signature", () => {
    expect(verifyGithubSignature(SECRET, BODY, sign(SECRET, BODY))).toBe(true);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(verifyGithubSignature(SECRET, BODY, sign("wrong-secret", BODY))).toBe(false);
  });

  it("rejects a tampered body", () => {
    expect(verifyGithubSignature(SECRET, BODY + "x", sign(SECRET, BODY))).toBe(false);
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyGithubSignature(SECRET, BODY, undefined)).toBe(false);
    expect(verifyGithubSignature(SECRET, BODY, "")).toBe(false);
    expect(verifyGithubSignature(SECRET, BODY, "sha1=deadbeef")).toBe(false);
    expect(verifyGithubSignature(SECRET, BODY, "sha256=nothex!!")).toBe(false);
    expect(verifyGithubSignature(SECRET, BODY, "sha256=abcd")).toBe(false); // wrong length
  });
});
