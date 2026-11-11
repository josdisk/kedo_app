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

const headers = {
  "x-kedov-user-id": "user_demo",
  "x-kedov-org-id": "org_demo",
};

test("preview scrub bumps generation and clamps playhead (PLAY-003)", async () => {
  const app = await createApp();
  const server = app.getHttpServer();
  const projectId = "proj_demo_music";

  const created = await request(server)
    .post(`/v1/projects/${projectId}/preview-sessions`)
    .set(headers)
    .send({ duration_frames: 100, fps_num: 24, fps_den: 1, preview_tier: "proxy" })
    .expect(201);

  assert.equal(created.body.playhead_frame, 0);
  assert.equal(created.body.generation, 0);
  assert.equal(created.body.preview_tier, "proxy");

  const scrub1 = await request(server)
    .post(`/v1/preview-sessions/${created.body.id}/scrub`)
    .set(headers)
    .send({ frame_index: 48 })
    .expect(201);
  assert.equal(scrub1.body.playhead_frame, 48);
  assert.equal(scrub1.body.generation, 1);

  const scrub2 = await request(server)
    .post(`/v1/preview-sessions/${created.body.id}/scrub`)
    .set(headers)
    .send({ frame_index: 9999 })
    .expect(201);
  assert.equal(scrub2.body.playhead_frame, 99, "clamped to duration-1");
  assert.equal(scrub2.body.generation, 2, "fast scrub advances generation");

  const tier = await request(server)
    .patch(`/v1/preview-sessions/${created.body.id}/tier`)
    .set(headers)
    .send({ preview_tier: "thumbnail" })
    .expect(200);
  assert.equal(tier.body.preview_tier, "thumbnail");

  await request(server)
    .get(`/v1/preview-sessions/${created.body.id}`)
    .set({ "x-kedov-user-id": "user_x", "x-kedov-org-id": "org_other" })
    .expect(403);

  await app.close();
});
