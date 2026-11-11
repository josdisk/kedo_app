import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { OidcVerifier, mintRs256TestToken } from "../src/modules/common/oidc.verifier";

const ENV_KEYS = [
  "AUTH_MODE",
  "API_OIDC_HS256_SECRET",
  "OIDC_ISSUER",
  "OIDC_AUDIENCE",
  "OIDC_JWKS_URL",
  "OIDC_ORG_CLAIM",
] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function restore(): void {
  for (const key of ENV_KEYS) {
    const prev = saved[key];
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
}

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}

before(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});

afterEach(() => restore());

test("OIDC JWKS RS256 Bearer accepts Clerk-style org claim", async () => {
  process.env.AUTH_MODE = "oidc";
  process.env.OIDC_ISSUER = "https://issuer.test";
  process.env.OIDC_AUDIENCE = "kedov-api";
  // Prefer JWKS mode without a reachable remote URL — inject local JWKS on verifier.
  process.env.OIDC_JWKS_URL = "https://issuer.test/.well-known/jwks.json";
  delete process.env.API_OIDC_HS256_SECRET;

  const { token, jwks } = await mintRs256TestToken({
    claims: {
      sub: "user_jwks",
      o: { id: "org_clerk" },
    },
    issuer: "https://issuer.test",
    audience: "kedov-api",
  });

  const app = await createApp();
  const verifier = app.get(OidcVerifier);
  verifier.setLocalJwksForTests(jwks);

  const listed = await request(app.getHttpServer())
    .get("/v1/projects")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.ok(Array.isArray(listed.body));

  verifier.clearLocalJwksForTests();
  await app.close();
});

test("OIDC JWKS rejects token signed by unknown key", async () => {
  process.env.AUTH_MODE = "oidc";
  process.env.OIDC_ISSUER = "https://issuer.test";
  process.env.OIDC_AUDIENCE = "kedov-api";
  process.env.OIDC_JWKS_URL = "https://issuer.test/.well-known/jwks.json";

  const good = await mintRs256TestToken({
    claims: { sub: "u", org_id: "o" },
    issuer: "https://issuer.test",
    audience: "kedov-api",
  });
  const other = await mintRs256TestToken({
    claims: { sub: "u", org_id: "o" },
    issuer: "https://issuer.test",
    audience: "kedov-api",
  });

  const app = await createApp();
  const verifier = app.get(OidcVerifier);
  // Install JWKS for `good`, present token from `other`.
  verifier.setLocalJwksForTests(good.jwks);

  await request(app.getHttpServer())
    .get("/v1/projects")
    .set("Authorization", `Bearer ${other.token}`)
    .expect(401);

  verifier.clearLocalJwksForTests();
  await app.close();
});
