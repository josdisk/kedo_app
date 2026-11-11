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

test("import session completes with deduped assets and proxy job skeleton", async () => {
  const app = await createApp();
  const server = app.getHttpServer();
  const projectId = "proj_demo_music";

  const sessionRes = await request(server)
    .post(`/v1/projects/${projectId}/assets/import-sessions`)
    .set(headers)
    .expect(201);

  const sessionId = sessionRes.body.id as string;

  const complete = await request(server)
    .post(`/v1/import-sessions/${sessionId}/complete`)
    .set(headers)
    .send({
      files: [
        {
          filename: "cam_a.mov",
          size_bytes: 1024,
          sha256: "a".repeat(64),
          locator_uri: "file:///demo/cam_a.mov",
          media_properties: {
            probe_backend: "ffprobe-cli",
            width: 1920,
            height: 1080,
            fps: "24/1",
          },
        },
        {
          filename: "cam_a_copy.mov",
          size_bytes: 1024,
          sha256: "a".repeat(64),
          locator_uri: "file:///demo/cam_a_copy.mov",
        },
      ],
    })
    .expect(201);

  assert.equal(complete.body.state, "READY");
  assert.equal(complete.body.asset_ids.length, 1, "identical sha256 dedupes");

  const assets = await request(server)
    .get(`/v1/projects/${projectId}/assets`)
    .set(headers)
    .expect(200);
  assert.ok(assets.body.some((a: { sha256: string }) => a.sha256 === "a".repeat(64)));

  const assetId = complete.body.asset_ids[0] as string;
  const proxy = await request(server)
    .post(`/v1/projects/${projectId}/proxy-jobs`)
    .set(headers)
    .send({ asset_id: assetId, target_height: 720 })
    .expect(201);
  assert.equal(proxy.body.state, "QUEUED");

  const tick1 = await request(server)
    .post(`/v1/proxy-jobs/${proxy.body.id}/tick`)
    .set(headers)
    .expect(201);
  assert.equal(tick1.body.state, "RUNNING");

  // Tick alone no longer fabricates COMPLETED — worker must report encode (ING-008).
  const tick2 = await request(server)
    .post(`/v1/proxy-jobs/${proxy.body.id}/tick`)
    .set(headers)
    .expect(201);
  assert.equal(tick2.body.state, "RUNNING");

  const mapping = {
    source_uri: "file:///demo/cam_a.mov",
    proxy_uri: "file:///demo/cache/cam_a_720.mp4",
    target_height: 720,
    scale_filter: "scale=-2:720",
    timebase_policy: "preserve_source" as const,
  };
  const done = await request(server)
    .post(`/v1/proxy-jobs/${proxy.body.id}/complete`)
    .set(headers)
    .send({
      proxy_uri: mapping.proxy_uri,
      source_mapping: mapping,
      encode_backend: "ffmpeg-cli",
      source_unchanged: true,
      message: "proxy ready (demo fixture)",
    })
    .expect(201);
  assert.equal(done.body.state, "COMPLETED");
  assert.equal(done.body.proxy_uri, mapping.proxy_uri);
  assert.equal(done.body.encode_backend, "ffmpeg-cli");
  assert.equal(done.body.source_unchanged, true);

  const assetsAfter = await request(server)
    .get(`/v1/projects/${projectId}/assets`)
    .set(headers)
    .expect(200);
  const asset = assetsAfter.body.find((a: { id: string }) => a.id === assetId);
  assert.ok(asset);
  assert.equal(asset.sha256, "a".repeat(64), "source sha unchanged (DAT-002)");
  assert.equal(asset.locator_uri, "file:///demo/cam_a.mov");
  assert.equal(asset.proxy_uri, mapping.proxy_uri);

  const refused = await request(server)
    .post(`/v1/projects/${projectId}/proxy-jobs`)
    .set(headers)
    .send({ asset_id: assetId, target_height: 540 })
    .expect(201);
  await request(server).post(`/v1/proxy-jobs/${refused.body.id}/tick`).set(headers).expect(201);
  const fail = await request(server)
    .post(`/v1/proxy-jobs/${refused.body.id}/complete`)
    .set(headers)
    .send({
      proxy_uri: "file:///demo/cache/cam_a_540.mp4",
      source_mapping: { ...mapping, proxy_uri: "file:///demo/cache/cam_a_540.mp4", target_height: 540 },
      source_unchanged: false,
    })
    .expect(201);
  assert.equal(fail.body.state, "FAILED");

  await request(server)
    .get(`/v1/projects/${projectId}/assets`)
    .set({ "x-kedov-user-id": "user_x", "x-kedov-org-id": "org_other" })
    .expect(403);

  await app.close();
});
