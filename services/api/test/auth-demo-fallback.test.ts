import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, before, test } from "node:test";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

const ENV_KEYS = [
  "NODE_ENV",
  "AUTH_MODE",
  "AUTH_ALLOW_DEMO_ENV_FALLBACK",
  "API_DEMO_USER_ID",
  "API_DEMO_ORG_ID",
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

test("production denies silent demo env identity without headers", async () => {
  process.env.NODE_ENV = "production";
  process.env.AUTH_MODE = "demo";
  process.env.AUTH_ALLOW_DEMO_ENV_FALLBACK = "false";
  process.env.API_DEMO_USER_ID = "user_demo";
  process.env.API_DEMO_ORG_ID = "org_demo";

  const app = await createApp();
  await request(app.getHttpServer()).get("/v1/projects").expect(401);
  await app.close();
});

test("explicit headers still work when env fallback disabled", async () => {
  process.env.NODE_ENV = "production";
  process.env.AUTH_ALLOW_DEMO_ENV_FALLBACK = "false";

  const app = await createApp();
  const res = await request(app.getHttpServer())
    .get("/v1/projects")
    .set("x-kedov-user-id", "user_a")
    .set("x-kedov-org-id", "org_a")
    .expect(200);
  assert.ok(Array.isArray(res.body));
  await app.close();
});
