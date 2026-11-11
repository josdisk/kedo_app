import { Global, Module } from "@nestjs/common";
import { OidcVerifier } from "./oidc.verifier";
import { TenantGuard } from "./tenant.guard";

@Global()
@Module({
  providers: [OidcVerifier, TenantGuard],
  exports: [OidcVerifier, TenantGuard],
})
export class AuthModule {}
