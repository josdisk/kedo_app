/** Cloud spend / provider consent gate (AGT / SEC). Never call paid providers silently. */

export type PrivacyMode = "local_first" | "cloud_allowed";

export interface CloudConsentInput {
  provider: string;
  cloud_consent?: boolean;
  privacy_mode?: PrivacyMode;
}

export function assertCloudConsent(input: CloudConsentInput): {
  ok: true;
} | { ok: false; reason: string } {
  const provider = (input.provider ?? "mock").trim().toLowerCase();
  if (provider === "mock" || provider === "local") {
    return { ok: true };
  }
  if (input.privacy_mode === "local_first") {
    return {
      ok: false,
      reason: "privacy_mode=local_first blocks non-mock cloud providers",
    };
  }
  if (!input.cloud_consent) {
    return {
      ok: false,
      reason: "cloud_consent required for non-mock AI providers",
    };
  }
  return { ok: true };
}
