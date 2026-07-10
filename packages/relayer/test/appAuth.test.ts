import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createAppJwt } from "../src/github/appAuth.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("createAppJwt", () => {
  it("produces an RS256 JWT verifiable with the app public key", () => {
    const jwt = createAppJwt("12345", pem, 1_750_000_000_000);
    const [header, payload, signature] = jwt.split(".");
    expect(header && payload && signature).toBeTruthy();

    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    });

    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString());
    expect(claims.iss).toBe("12345");
    expect(claims.iat).toBe(1_750_000_000 - 60); // backdated for clock skew
    expect(claims.exp - claims.iat).toBe(60 + 9 * 60); // ≤ GitHub's 10-minute cap

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature!, "base64url"))).toBe(true);
  });
});
