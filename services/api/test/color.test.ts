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

test("packaged OCIO/ACES config is valid (COL-002)", async () => {
  const app = await createApp();
  const res = await request(app.getHttpServer())
    .get("/v1/color/ocio-config")
    .set(headers)
    .expect(200);

  assert.equal(res.body.valid, true);
  assert.equal(res.body.config.working_space, "ACEScg");
  assert.equal(res.body.config.libocio_required, false);
  assert.equal(res.body.libocio_linked, false);
  assert.ok(res.body.config.displays.some((d: { name: string }) => d.name === "sRGB"));

  await app.close();
});
