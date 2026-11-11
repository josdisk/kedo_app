import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

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

test("health is public", async () => {
  const app = await createApp();
  const res = await request(app.getHttpServer()).get("/health").expect(200);
  assert.equal(res.body.status, "ok");
  await app.close();
});

test("project CRUD is tenant-scoped", async () => {
  const app = await createApp();
  const server = app.getHttpServer();

  await request(server).get("/v1/projects").expect(401);

  const created = await request(server)
    .post("/v1/projects")
    .set("x-kedov-user-id", "user_a")
    .set("x-kedov-org-id", "org_a")
    .send({ name: "Org A Project", genre: "podcast" })
    .expect(201);

  assert.equal(created.body.name, "Org A Project");

  await request(server)
    .get(`/v1/projects/${created.body.id}`)
    .set("x-kedov-user-id", "user_b")
    .set("x-kedov-org-id", "org_b")
    .expect(403);

  const listed = await request(server)
    .get("/v1/projects")
    .set("x-kedov-user-id", "user_a")
    .set("x-kedov-org-id", "org_a")
    .expect(200);

  assert.ok(listed.body.some((p: { id: string }) => p.id === created.body.id));
  await app.close();
});
