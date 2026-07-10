/**
 * GitHub App authentication: short-lived RS256 JWT → per-installation token.
 * A GitHub App (not a PAT) is used so repo access is scoped per installation
 * and revocable by the org that installed it.
 */
import { createSign } from "node:crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** App JWT valid for ~9 minutes (GitHub max is 10), backdated 60s for clock skew. */
export function createAppJwt(appId: string, privateKeyPem: string, nowMs: number = Date.now()): string {
  const nowSec = Math.floor(nowMs / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iat: nowSec - 60, exp: nowSec + 9 * 60, iss: appId }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKeyPem).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

export interface InstallationToken {
  token: string;
  expiresAt: string;
}

export async function getInstallationToken(
  appId: string,
  privateKeyPem: string,
  installationId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<InstallationToken> {
  const jwt = createAppJwt(appId, privateKeyPem);
  const res = await fetchImpl(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`GitHub installation token request failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { token: string; expires_at: string };
  return { token: body.token, expiresAt: body.expires_at };
}
