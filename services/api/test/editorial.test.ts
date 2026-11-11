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

test("first-cut plan then apply advances revision and stores grade", async () => {
  const app = await createApp();
  const server = app.getHttpServer();
  const projectId = "proj_demo_music";

  const before = await request(server)
    .get(`/v1/projects/${projectId}/sequences/seq_main`)
    .set(headers)
    .expect(200);
  assert.equal(before.body.revision, 0);

  const planned = await request(server)
    .post(`/v1/projects/${projectId}/ai/first-cut`)
    .set(headers)
    .send({
      project_id: projectId,
      sequence_id: "seq_main",
      expected_revision: 0,
      genre: "music_video",
      candidates: [
        {
          asset_id: "asset_take4_close",
          take_id: "take_4",
          sync_confidence: 0.93,
          start_frame: 0,
          end_frame: 72,
          source_in_frame: 12,
          tags: ["close_up"],
        },
        {
          asset_id: "asset_weak",
          take_id: "take_9",
          sync_confidence: 0.1,
          start_frame: 72,
          end_frame: 140,
          source_in_frame: 0,
        },
      ],
    })
    .expect(201);

  assert.equal(planned.body.plan.constraints.preserve_master_audio, true);
  assert.ok(planned.body.rejected.some((r: { asset_id: string }) => r.asset_id === "asset_weak"));

  const applied = await request(server)
    .post(`/v1/projects/${projectId}/ai/plans/apply`)
    .set(headers)
    .send({ plan: planned.body.plan })
    .expect(201);

  assert.equal(applied.body.ok, true);
  assert.equal(applied.body.sequence.revision, 1);
  assert.equal(applied.body.sequence.clips[0].asset_id, "asset_take4_close");
  assert.ok(Object.keys(applied.body.sequence.grade_by_scope).length >= 1);

  const stale = await request(server)
    .post(`/v1/projects/${projectId}/ai/plans/apply`)
    .set(headers)
    .send({ plan: planned.body.plan })
    .expect(400);
  assert.ok(
    String(stale.body.message || stale.body.human_message || JSON.stringify(stale.body)).length > 0,
  );

  await app.close();
});

test("prompt plan returns unexecuted EditPlan and requires cloud consent for openai", async () => {
  const app = await createApp();
  const server = app.getHttpServer();
  const projectId = "proj_demo_music";

  const planned = await request(server)
    .post(`/v1/projects/${projectId}/ai/plans`)
    .set(headers)
    .send({
      project_id: projectId,
      sequence_id: "seq_main",
      expected_revision: 0,
      prompt: "Replace chorus with Take 4 close-up and soften blue grade",
      mode: "preview_then_apply",
    })
    .expect(201);

  assert.equal(planned.body.schema_version, "1.0");
  assert.equal(planned.body.require_confirmation, true);
  assert.ok(Array.isArray(planned.body.operations));
  assert.ok(planned.body.operations.length >= 1);

  const prev = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "openai";
  await request(server)
    .post(`/v1/projects/${projectId}/ai/plans`)
    .set(headers)
    .send({
      project_id: projectId,
      sequence_id: "seq_main",
      expected_revision: 0,
      prompt: "soft grade",
      cloud_consent: false,
      privacy_mode: "local_first",
    })
    .expect(403);
  if (prev === undefined) delete process.env.AI_PROVIDER;
  else process.env.AI_PROVIDER = prev;

  await app.close();
});
