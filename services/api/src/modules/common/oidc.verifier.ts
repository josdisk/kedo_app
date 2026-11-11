import { Injectable, Logger } from "@nestjs/common";
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  exportJWK,
  generateKeyPair,
  jwtVerify,
  SignJWT,
  type JWTPayload,
} from "jose";
import type { OidcClaims } from "@kedov/contracts";

export type VerifiedOidc = {
  claims: OidcClaims;
  mode: "hs256" | "jwks";
};

/**
 * OIDC token verifier: production JWKS (RS256) or local HS256 secret.
 * Remote JWKS is cached by jose createRemoteJWKSet.
 */
@Injectable()
export class OidcVerifier {
  private readonly logger = new Logger(OidcVerifier.name);
  private remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private remoteJwksUrl: string | null = null;
  /** Test-only local JWKS override (no network). */
  private localJwks: ReturnType<typeof createLocalJWKSet> | null = null;

  /** Inject a local JWKS for unit tests (RS256). */
  setLocalJwksForTests(jwks: ReturnType<typeof createLocalJWKSet>): void {
    this.localJwks = jwks;
    this.remoteJwks = null;
  }

  clearLocalJwksForTests(): void {
    this.localJwks = null;
  }

  private hs256Secret(): string {
    return (process.env.API_OIDC_HS256_SECRET ?? "").trim();
  }

  private async resolveMode(): Promise<"hs256" | "jwks" | null> {
    if (this.localJwks) return "jwks";
    const { resolveOidcVerifierMode } = await import("@kedov/contracts");
    return resolveOidcVerifierMode({
      jwksUrl: process.env.OIDC_JWKS_URL,
      issuer: process.env.OIDC_ISSUER,
      hs256Secret: this.hs256Secret(),
    });
  }

  private async ensureRemoteJwks(): Promise<ReturnType<typeof createRemoteJWKSet> | null> {
    if (this.localJwks) return null;
    const { resolveJwksUrl } = await import("@kedov/contracts");
    const url = resolveJwksUrl(process.env.OIDC_ISSUER, process.env.OIDC_JWKS_URL);
    if (!url) return null;
    if (!this.remoteJwks || this.remoteJwksUrl !== url) {
      this.remoteJwksUrl = url;
      this.remoteJwks = createRemoteJWKSet(new URL(url));
      this.logger.log(`OIDC JWKS configured: ${url}`);
    }
    return this.remoteJwks;
  }

  async verifyBearer(token: string): Promise<VerifiedOidc | null> {
    const { identityFromOidcClaims } = await import("@kedov/contracts");
    const mode = await this.resolveMode();

    if (mode === "jwks") {
      const jwks = this.localJwks ?? (await this.ensureRemoteJwks());
      if (!jwks) return null;
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer: process.env.OIDC_ISSUER || undefined,
          audience: process.env.OIDC_AUDIENCE || undefined,
        });
        const claims = payloadToClaims(payload);
        const checked = identityFromOidcClaims(claims, {
          issuer: process.env.OIDC_ISSUER,
          audience: process.env.OIDC_AUDIENCE,
          orgClaim: process.env.OIDC_ORG_CLAIM,
        });
        if (!checked.ok) return null;
        return { claims: checked.identity.claims ?? claims, mode: "jwks" };
      } catch (err) {
        this.logger.warn(`JWKS verify failed: ${(err as Error).message}`);
        return null;
      }
    }

    if (mode === "hs256") {
      const { verifyHs256Jwt } = await import("@kedov/contracts/oidc-hs256");
      const claims = verifyHs256Jwt(token, this.hs256Secret());
      if (!claims) return null;
      const checked = identityFromOidcClaims(claims, {
        issuer: process.env.OIDC_ISSUER,
        audience: process.env.OIDC_AUDIENCE,
        orgClaim: process.env.OIDC_ORG_CLAIM,
      });
      if (!checked.ok) return null;
      return { claims: checked.identity.claims ?? claims, mode: "hs256" };
    }

    return null;
  }
}

function payloadToClaims(payload: JWTPayload): OidcClaims {
  return {
    ...(payload as Record<string, unknown>),
    sub: String(payload.sub ?? ""),
  } as OidcClaims;
}

/** Test helper: mint RS256 JWT + local JWKS matching a generated key. */
export async function mintRs256TestToken(input: {
  claims: OidcClaims;
  issuer?: string;
  audience?: string;
}): Promise<{
  token: string;
  jwks: ReturnType<typeof createLocalJWKSet>;
  publicJwk: Record<string, unknown>;
}> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  publicJwk.kid = "test-kid";
  const jwks = createLocalJWKSet({ keys: [publicJwk] });

  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ ...input.claims })
    .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
    .setSubject(String(input.claims.sub))
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .setIssuer(input.issuer ?? "https://issuer.test")
    .setAudience(input.audience ?? "kedov-api")
    .sign(privateKey);

  return { token, jwks, publicJwk };
}
