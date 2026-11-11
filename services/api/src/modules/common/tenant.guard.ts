import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthMode } from "@kedov/contracts";
import { OidcVerifier } from "./oidc.verifier";

export interface TenantRequest extends Request {
  kedovUserId?: string;
  kedovOrgId?: string;
  kedovAuthMode?: AuthMode;
}

function allowDemoEnvFallback(): boolean {
  if (process.env.AUTH_ALLOW_DEMO_ENV_FALLBACK === "true") return true;
  if (process.env.AUTH_ALLOW_DEMO_ENV_FALLBACK === "false") return false;
  return (process.env.NODE_ENV ?? "development") !== "production";
}

/**
 * Tenant gate: demo headers (local) or OIDC Bearer JWT when AUTH_MODE=oidc.
 * Production: JWKS (RS256) via OIDC_JWKS_URL / OIDC_ISSUER. Local: API_OIDC_HS256_SECRET.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(OidcVerifier) private readonly oidc: OidcVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const {
      bearerTokenFromAuthorization,
      identityFromDemoHeaders,
      resolveAuthMode,
    } = await import("@kedov/contracts");

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const mode = resolveAuthMode(process.env.AUTH_MODE);

    if (mode === "oidc") {
      const token = bearerTokenFromAuthorization(req.header("authorization"));
      if (!token) {
        throw new UnauthorizedException({
          code: "unauthorized",
          human_message: "Missing Bearer token",
          retryable: false,
        });
      }
      const verified = await this.oidc.verifyBearer(token);
      if (!verified) {
        throw new UnauthorizedException({
          code: "unauthorized",
          human_message:
            "Invalid Bearer token (configure OIDC_JWKS_URL/OIDC_ISSUER or API_OIDC_HS256_SECRET)",
          retryable: false,
        });
      }
      const orgId =
        typeof verified.claims.org_id === "string" ? verified.claims.org_id : "";
      const userId = typeof verified.claims.sub === "string" ? verified.claims.sub : "";
      if (!userId || !orgId) {
        throw new UnauthorizedException({
          code: "unauthorized",
          human_message: "Token missing sub/org_id",
          retryable: false,
        });
      }
      req.kedovUserId = userId;
      req.kedovOrgId = orgId;
      req.kedovAuthMode = "oidc";
      return true;
    }

    const headerUser = (req.header("x-kedov-user-id") ?? "").trim();
    const headerOrg = (req.header("x-kedov-org-id") ?? "").trim();
    const userId =
      headerUser || (allowDemoEnvFallback() ? (process.env.API_DEMO_USER_ID ?? "").trim() : "");
    const orgId =
      headerOrg || (allowDemoEnvFallback() ? (process.env.API_DEMO_ORG_ID ?? "").trim() : "");
    const demo = identityFromDemoHeaders(userId || undefined, orgId || undefined, mode);
    if (!demo.ok) {
      if (demo.reason.includes("user-id")) {
        throw new UnauthorizedException({
          code: "unauthorized",
          human_message: "Missing x-kedov-user-id",
          retryable: false,
        });
      }
      throw new ForbiddenException({
        code: "forbidden",
        human_message: demo.reason.includes("org-id")
          ? "Missing x-kedov-org-id"
          : demo.reason,
        retryable: false,
      });
    }
    req.kedovUserId = demo.identity.user_id;
    req.kedovOrgId = demo.identity.org_id;
    req.kedovAuthMode = "demo";
    return true;
  }
}
