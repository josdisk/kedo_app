/** Studio / client auth header builders (SVC). */

export type ClientAuthMode = "demo" | "oidc";

export interface DemoAuthConfig {
  mode?: "demo";
  userId?: string;
  orgId?: string;
}

export interface OidcAuthConfig {
  mode: "oidc";
  /** Sync or async token getter (Clerk/session). */
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
}

export type AuthConfig = DemoAuthConfig | OidcAuthConfig;

export function resolveClientAuthMode(envMode?: string): ClientAuthMode {
  return envMode?.trim().toLowerCase() === "oidc" ? "oidc" : "demo";
}

/** Build HTTP headers for Kedov business API. */
export async function buildAuthHeaders(config: AuthConfig): Promise<Record<string, string>> {
  if (config.mode === "oidc") {
    const token = await config.getAccessToken();
    if (!token?.trim()) {
      throw new Error("OIDC access token unavailable");
    }
    return { Authorization: `Bearer ${token.trim()}` };
  }
  return {
    "x-kedov-user-id": config.userId?.trim() || "user_demo",
    "x-kedov-org-id": config.orgId?.trim() || "org_demo",
  };
}
