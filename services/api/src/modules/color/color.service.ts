import { Injectable } from "@nestjs/common";

@Injectable()
export class ColorService {
  async getPackagedConfig() {
    const { packagedAcesLiteConfig, validateOcioConfig } = await import("@kedov/contracts");
    const config = packagedAcesLiteConfig();
    const errors = validateOcioConfig(config);
    return {
      config,
      valid: errors.length === 0,
      errors,
      libocio_linked: false,
      note: "Packaged ACES-lite (COL-002). OpenColorIO link remains license-gated.",
    };
  }
}
