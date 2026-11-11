import "reflect-metadata";
import assert from "node:assert/strict";
import { test, afterEach, before } from "node:test";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

const SECRET = "test-oidc-hs256-secret";
const ENV_KEYS = [
  "AUTH_MODE",
  "API_OIDC_HS256_SECRET",
  "OIDC_ISSUER",
  "OIDC_AUDIENCE",
  "OIDC_JWKS_URL",
] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function restoreAuthEnv(): void {
  for (const key of ENV_KEYS) {
    const prev = savedEnv[key];
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
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
});

afterEach(() => {
  restoreAuthEnv();
});

test("OIDC mode rejects demo headers and accepts HS256 Bearer", async () => {
  process.env.AUTH_MODE = "oidc";
  process.env.API_OIDC_HS256_SECRET = SECRET;
  process.env.OIDC_AUDIENCE = "kedov-api";
  process.env.OIDC_ISSUER = "https://issuer.test";
  delete process.env.OIDC_JWKS_URL;

  const { mintHs256Jwt } = await import("@kedov/contracts/oidc-hs256");
  const app = await createApp();
  const server = app.getHttpServer();

  await request(server)
    .get("/v1/projects")
    .set("x-kedov-user-id", "user_a")
    .set("x-kedov-org-id", "org_a")
    .expect(401);

  const now = Math.floor(Date.now() / 1000);
  const token = mintHs256Jwt(
    {
      sub: "user_oidc",
      org_id: "org_oidc",
      iss: "https://issuer.test",
      aud: "kedov-api",
      exp: now + 300,
      iat: now,
    },
    SECRET,
  );

  const listed = await request(server)
    .get("/v1/projects")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.ok(Array.isArray(listed.body));

  await app.close();
});

test("OIDC mode rejects forged signature", async () => {
  process.env.AUTH_MODE = "oidc";
  process.env.API_OIDC_HS256_SECRET = SECRET;
  delete process.env.OIDC_JWKS_URL;

  const { mintHs256Jwt } = await import("@kedov/contracts/oidc-hs256");
  const app = await createApp();
  const now = Math.floor(Date.now() / 1000);
  const token = mintHs256Jwt(
    { sub: "u", org_id: "o", exp: now + 60 },
    "wrong-secret",
  );

  await request(app.getHttpServer())
    .get("/v1/projects")
    .set("Authorization", `Bearer ${token}`)
    .expect(401);

  await app.close();
});
